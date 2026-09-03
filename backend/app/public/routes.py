from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session


router = APIRouter(prefix="/api/public", tags=["public-catalogue"])

VISIBLE = "ra.access_level = 'public' AND ra.record_status NOT IN ('rejected', 'withdrawn')"


def _labels(rows: list[object]) -> list[str]:
    return [str(row[0]) for row in rows if row[0]]


async def _asset_row(session: AsyncSession, asset_id: UUID):
    result = await session.execute(text(f"""
        SELECT ra.anchor_id, ra.display_label, ha.short_description, ra.created_at,
               (SELECT m.anchor_id FROM km.entity_relation er
                 JOIN km.media_asset m ON m.anchor_id IN (er.subject_anchor_id, er.object_anchor_id)
                 WHERE (er.subject_anchor_id = ra.anchor_id OR er.object_anchor_id = ra.anchor_id)
                   AND m.anchor_id <> ra.anchor_id LIMIT 1) AS media_id
        FROM km.record_anchor ra JOIN km.heritage_asset ha ON ha.anchor_id = ra.anchor_id
        WHERE ra.anchor_id = :asset_id AND {VISIBLE}
    """), {"asset_id": asset_id})
    return result.mappings().first()


@router.get("/assets")
async def list_assets(
    q: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    subfield: list[str] = Query(default=[]),
    material: list[str] = Query(default=[]),
    technique: list[str] = Query(default=[]),
    place: list[str] = Query(default=[]),
    session: AsyncSession = Depends(get_db_session),
):
    conditions = [VISIBLE]
    params: dict[str, object] = {"limit": page_size, "offset": (page - 1) * page_size}
    if q.strip():
        params["q"] = f"%{q.strip()}%"
        conditions.append("""EXISTS (SELECT 1 FROM km.entity_name n WHERE n.target_anchor_id=ra.anchor_id AND n.name_text ILIKE :q)
          OR EXISTS (SELECT 1 FROM km.entity_identifier i WHERE i.target_anchor_id=ra.anchor_id AND i.identifier_value ILIKE :q)
          OR ra.display_label ILIKE :q OR ha.short_description ILIKE :q
          OR EXISTS (SELECT 1 FROM km.entity_relation er JOIN km.record_anchor rr ON rr.anchor_id IN (er.subject_anchor_id, er.object_anchor_id)
                     WHERE (er.subject_anchor_id=ra.anchor_id OR er.object_anchor_id=ra.anchor_id) AND rr.anchor_id<>ra.anchor_id AND rr.display_label ILIKE :q)
          OR EXISTS (SELECT 1 FROM km.material_usage mu JOIN km.concept c ON c.concept_id=mu.material_concept_id WHERE mu.target_anchor_id=ra.anchor_id AND c.preferred_label ILIKE :q)
          OR EXISTS (SELECT 1 FROM km.technique_assignment ta JOIN km.concept c ON c.concept_id=ta.technique_concept_id WHERE ta.target_anchor_id=ra.anchor_id AND c.preferred_label ILIKE :q)""")
    for key, values, clause in (
        ("subfield", subfield, "EXISTS (SELECT 1 FROM km.classification_assignment ca JOIN km.concept c ON c.concept_id=ca.value_concept_id WHERE ca.target_anchor_id=ra.anchor_id AND c.concept_id::text = ANY(:subfield))"),
        ("material", material, "EXISTS (SELECT 1 FROM km.material_usage mu WHERE mu.target_anchor_id=ra.anchor_id AND mu.material_concept_id::text = ANY(:material))"),
        ("technique", technique, "EXISTS (SELECT 1 FROM km.technique_assignment ta WHERE ta.target_anchor_id=ra.anchor_id AND ta.technique_concept_id::text = ANY(:technique))"),
        ("place", place, "EXISTS (SELECT 1 FROM km.entity_relation er WHERE (er.subject_anchor_id=ra.anchor_id OR er.object_anchor_id=ra.anchor_id) AND (er.subject_anchor_id::text = ANY(:place) OR er.object_anchor_id::text = ANY(:place)))"),
    ):
        if values:
            params[key] = values
            conditions.append(clause)
    where = " AND ".join(f"({condition})" for condition in conditions)
    total = (await session.execute(text(f"SELECT count(*) FROM km.record_anchor ra JOIN km.heritage_asset ha ON ha.anchor_id=ra.anchor_id WHERE {where}"), params)).scalar_one()
    rows = (await session.execute(text(f"""
        SELECT ra.anchor_id, ra.display_label, ha.short_description,
          (SELECT m.anchor_id FROM km.entity_relation er JOIN km.media_asset m ON m.anchor_id IN (er.subject_anchor_id, er.object_anchor_id)
            WHERE (er.subject_anchor_id=ra.anchor_id OR er.object_anchor_id=ra.anchor_id) AND m.anchor_id<>ra.anchor_id LIMIT 1) media_id
        FROM km.record_anchor ra JOIN km.heritage_asset ha ON ha.anchor_id=ra.anchor_id
        WHERE {where} ORDER BY ra.created_at DESC LIMIT :limit OFFSET :offset
    """), params)).mappings().all()
    return {"items": [{"id": str(row["anchor_id"]), "title": row["display_label"], "description": row["short_description"], "image_url": f"/api/public/media/{row['media_id']}" if row["media_id"] else None} for row in rows], "page": page, "page_size": page_size, "total": total}


@router.get("/assets/{asset_id}")
async def asset_detail(asset_id: UUID, session: AsyncSession = Depends(get_db_session)):
    row = await _asset_row(session, asset_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Eser bulunamadı.")
    async def labels(query: str):
        return _labels((await session.execute(text(query), {"id": asset_id})).all())
    names = await labels("SELECT name_text FROM km.entity_name WHERE target_anchor_id=:id ORDER BY is_preferred DESC")
    identifiers = await labels("SELECT identifier_value FROM km.entity_identifier WHERE target_anchor_id=:id")
    materials = await labels("SELECT c.preferred_label FROM km.material_usage mu JOIN km.concept c ON c.concept_id=mu.material_concept_id WHERE mu.target_anchor_id=:id")
    techniques = await labels("SELECT c.preferred_label FROM km.technique_assignment ta JOIN km.concept c ON c.concept_id=ta.technique_concept_id WHERE ta.target_anchor_id=:id")
    related = (await session.execute(text("""SELECT DISTINCT rr.anchor_id, rr.display_label, rr.record_kind_code FROM km.entity_relation er JOIN km.record_anchor rr ON rr.anchor_id IN (er.subject_anchor_id, er.object_anchor_id) WHERE (er.subject_anchor_id=:id OR er.object_anchor_id=:id) AND rr.anchor_id<>:id LIMIT 20"""), {"id": asset_id})).mappings().all()
    metadata = [{"label": label, "value": value} for label, value in (("Alternatif adlar", ", ".join(names)), ("Kimlik", ", ".join(identifiers)), ("Malzeme", ", ".join(materials)), ("Teknik", ", ".join(techniques))) if value]
    return {"id": str(row["anchor_id"]), "title": row["display_label"], "description": row["short_description"], "metadata": metadata, "media": ([{"id": str(row["media_id"]), "url": f"/api/public/media/{row['media_id']}", "alt": row["display_label"]}] if row["media_id"] else []), "related": [{"id": str(item["anchor_id"]), "title": item["display_label"], "kind": item["record_kind_code"]} for item in related]}


@router.get("/facets")
async def facets(session: AsyncSession = Depends(get_db_session)):
    async def options(query: str):
        return [{"id": str(row[0]), "label": row[1], "count": row[2]} for row in (await session.execute(text(query))).all()]
    return {
        "subfields": await options("SELECT c.concept_id, c.preferred_label, count(DISTINCT ca.target_anchor_id) FROM km.classification_assignment ca JOIN km.concept c ON c.concept_id=ca.value_concept_id JOIN km.record_anchor ra ON ra.anchor_id=ca.target_anchor_id WHERE " + VISIBLE + " GROUP BY c.concept_id,c.preferred_label ORDER BY count DESC, c.preferred_label"),
        "materials": await options("SELECT c.concept_id, c.preferred_label, count(DISTINCT mu.target_anchor_id) FROM km.material_usage mu JOIN km.concept c ON c.concept_id=mu.material_concept_id JOIN km.record_anchor ra ON ra.anchor_id=mu.target_anchor_id WHERE " + VISIBLE + " GROUP BY c.concept_id,c.preferred_label ORDER BY count DESC, c.preferred_label"),
        "techniques": await options("SELECT c.concept_id, c.preferred_label, count(DISTINCT ta.target_anchor_id) FROM km.technique_assignment ta JOIN km.concept c ON c.concept_id=ta.technique_concept_id JOIN km.record_anchor ra ON ra.anchor_id=ta.target_anchor_id WHERE " + VISIBLE + " GROUP BY c.concept_id,c.preferred_label ORDER BY count DESC, c.preferred_label"),
        "places": await options("SELECT p.anchor_id, p.display_label, count(DISTINCT er.subject_anchor_id) FROM km.entity_relation er JOIN km.record_anchor p ON p.anchor_id=er.object_anchor_id JOIN km.record_anchor ra ON ra.anchor_id=er.subject_anchor_id WHERE p.record_kind_code='place' AND " + VISIBLE + " GROUP BY p.anchor_id,p.display_label ORDER BY count DESC,p.display_label"),
    }


@router.get("/media/{media_id}")
async def media(media_id: UUID, session: AsyncSession = Depends(get_db_session)):
    row = (await session.execute(text("SELECT storage_uri, mime_type FROM km.media_asset WHERE anchor_id=:id"), {"id": media_id})).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Medya bulunamadı.")
    relative = Path(str(row["storage_uri"]).replace("\\", "/")).as_posix().lstrip("/")
    if ".." in Path(relative).parts:
        raise HTTPException(status_code=404, detail="Medya bulunamadı.")
    candidates = list((Path.cwd() / "storage" / "imports").glob(f"*/media/{relative}"))
    if not candidates or not candidates[0].is_file():
        raise HTTPException(status_code=404, detail="Medya dosyası bulunamadı.")
    return FileResponse(candidates[0], media_type=row["mime_type"])
