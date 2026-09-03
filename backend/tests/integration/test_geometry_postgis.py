from __future__ import annotations

import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.import_repository import ImportRepository, ImportRepositoryError
from app.db.session import engine


pytestmark = pytest.mark.skipif(
    os.getenv("MIRAS_RUN_DB_TESTS") != "1",
    reason="Set MIRAS_RUN_DB_TESTS=1 to run rollback-only PostgreSQL tests.",
)


async def _foreign_keys(session: AsyncSession):
    anchor_id = await session.scalar(text("SELECT anchor_id FROM km.record_anchor LIMIT 1"))
    concept_id = await session.scalar(text("SELECT concept_id FROM km.concept LIMIT 1"))
    if anchor_id is None or concept_id is None:
        pytest.skip("DEV DB needs one record_anchor and one concept row")
    return anchor_id, concept_id


def test_generic_insert_accepts_ewkt_4326_and_rolls_back() -> None:
    async def scenario() -> None:
        geometry_id = uuid4()
        async with AsyncSession(engine, expire_on_commit=False) as session:
            anchor_id, concept_id = await _foreign_keys(session)
            repository = ImportRepository(session)
            await repository._insert_row(
                table_name="geometry_assertion",
                row={
                    "geometry_id": str(geometry_id),
                    "target_anchor_id": str(anchor_id),
                    "geometry_role_concept_id": str(concept_id),
                    "geometry": "SRID=4326;POINT(29 41)",
                    "source_srid": 4326,
                },
                row_index=0,
            )
            result = (
                await session.execute(
                    text(
                        "SELECT ST_SRID(geometry), ST_AsText(geometry) "
                        "FROM km.geometry_assertion WHERE geometry_id=:geometry_id"
                    ),
                    {"geometry_id": geometry_id},
                )
            ).one()
            assert result == (4326, "POINT(29 41)")
            await session.rollback()

        async with AsyncSession(engine) as verification:
            assert await verification.scalar(
                text(
                    "SELECT count(*) FROM km.geometry_assertion "
                    "WHERE geometry_id=:geometry_id"
                ),
                {"geometry_id": geometry_id},
            ) == 0
        await engine.dispose()

    asyncio.run(scenario())


def test_invalid_geometry_fails_and_leaves_no_row() -> None:
    async def scenario() -> None:
        geometry_id = uuid4()
        async with AsyncSession(engine, expire_on_commit=False) as session:
            anchor_id, concept_id = await _foreign_keys(session)
            repository = ImportRepository(session)
            with pytest.raises(ImportRepositoryError):
                await repository._insert_row(
                    table_name="geometry_assertion",
                    row={
                        "geometry_id": str(geometry_id),
                        "target_anchor_id": str(anchor_id),
                        "geometry_role_concept_id": str(concept_id),
                        "geometry": "NOT A GEOMETRY",
                    },
                    row_index=0,
                )
            await session.rollback()

        async with AsyncSession(engine) as verification:
            assert await verification.scalar(
                text(
                    "SELECT count(*) FROM km.geometry_assertion "
                    "WHERE geometry_id=:geometry_id"
                ),
                {"geometry_id": geometry_id},
            ) == 0
        await engine.dispose()

    asyncio.run(scenario())
