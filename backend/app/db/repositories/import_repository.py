from __future__ import annotations

import json

from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ImportRepositoryError(RuntimeError):
    pass


class ImportReferenceResolutionError(
    ImportRepositoryError
):
    pass


class ImportRepository:
    SCHEMA_NAME = "km"

    ALLOWED_TABLES = {
        "address_assignment",
        "application_user",
        "assertion",
        "audit_log",
        "classification_assignment",
        "concept",
        "concept_scheme",
        "cultural_document",
        "edit_submission",
        "entity_identifier",
        "entity_name",
        "entity_profile",
        "entity_relation",
        "event",
        "event_participation",
        "evidence",
        "geometry_assertion",
        "heritage_asset",
        "inscription",
        "intervention",
        "material_usage",
        "measurement",
        "media_asset",
        "observation",
        "organization",
        "person",
        "place",
        "record_anchor",
        "source",
        "source_citation",
        "technique_assignment",
        "temporal_phase",
        "text_expression",
    }

    SUPPORTED_REFERENCE_TARGETS = {
        "km.concept_scheme",
        "km.concept",
    }

    PRIMARY_KEY_CANDIDATES = {
        "concept_scheme": "scheme_id",
        "concept": "concept_id",
        "record_anchor": "anchor_id",
        "source": "source_id",
        "source_citation": "citation_id",
        "heritage_asset": "anchor_id",
        "person": "anchor_id",
        "organization": "anchor_id",
        "media_asset": "anchor_id",
        "entity_name": "entity_name_id",
        "entity_identifier": "identifier_id",
        "measurement": "measurement_id",
        "material_usage": "material_usage_id",
        "technique_assignment": "technique_assignment_id",
        "assertion": "assertion_id",
        "entity_relation": "relation_id",
        "geometry_assertion": "geometry_id",
    }

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self._concept_scheme_cache: dict[
            tuple[str, str],
            Any,
        ] = {}

        self._concept_cache: dict[
            tuple[str, str, str],
            Any,
        ] = {}

    async def import_package_from_file(
        self,
        path: Path,
    ) -> dict[str, int]:
        package = self._load_package(
            path,
        )

        return await self.import_package(
            package,
        )

    async def import_package(
        self,
        package: dict[str, Any],
    ) -> dict[str, int]:
        self._validate_package_root(
            package,
        )

        tables = package.get(
            "tables",
        )

        import_order = package.get(
            "import_order",
        )

        if not isinstance(
            tables,
            dict,
        ):
            raise ImportRepositoryError(
                "JSON paketinde 'tables' nesnesi bulunamadı."
            )

        if not isinstance(
            import_order,
            list,
        ):
            raise ImportRepositoryError(
                "JSON paketinde 'import_order' dizisi bulunamadı."
            )

        inserted_counts: dict[
            str,
            int,
        ] = {}

        for raw_table_name in import_order:
            if not isinstance(
                raw_table_name,
                str,
            ):
                raise ImportRepositoryError(
                    "import_order içinde string olmayan tablo adı bulundu."
                )

            table_name = (
                raw_table_name.strip()
            )

            if not table_name:
                raise ImportRepositoryError(
                    "import_order içinde boş tablo adı bulundu."
                )

            if (
                table_name
                not in self.ALLOWED_TABLES
            ):
                raise ImportRepositoryError(
                    f"İzin verilmeyen tablo adı: {table_name}"
                )

            rows = tables.get(
                table_name,
                [],
            )

            if rows is None:
                rows = []

            if not isinstance(
                rows,
                list,
            ):
                raise ImportRepositoryError(
                    (
                        f"{table_name} tablosu "
                        "JSON dizisi olmalıdır."
                    )
                )

            inserted = 0

            for row_index, row in enumerate(
                rows,
            ):
                if not isinstance(
                    row,
                    dict,
                ):
                    raise ImportRepositoryError(
                        (
                            f"{table_name}"
                            f"[{row_index}] "
                            "nesne olmalıdır."
                        )
                    )

                if not row:
                    continue

                await self._insert_row(
                    table_name=table_name,
                    row=row,
                    row_index=row_index,
                )

                inserted += 1

            inserted_counts[
                table_name
            ] = inserted

        return inserted_counts

    async def analyze_package_duplicates_from_file(
        self,
        path: Path,
    ) -> dict[str, Any]:
        package = self._load_package(
            path,
        )

        return await self.analyze_package_duplicates(
            package,
        )

    async def analyze_package_duplicates(
        self,
        package: dict[str, Any],
    ) -> dict[str, Any]:
        self._validate_package_root(
            package,
        )

        tables = package.get(
            "tables",
        )

        import_order = package.get(
            "import_order",
        )

        if not isinstance(
            tables,
            dict,
        ):
            raise ImportRepositoryError(
                "JSON paketinde 'tables' nesnesi bulunamadı."
            )

        if not isinstance(
            import_order,
            list,
        ):
            raise ImportRepositoryError(
                "JSON paketinde 'import_order' dizisi bulunamadı."
            )

        table_results: dict[
            str,
            dict[str, int],
        ] = {}

        total_new = 0
        total_existing = 0
        total_uncheckable = 0

        for raw_table_name in import_order:
            if not isinstance(
                raw_table_name,
                str,
            ):
                raise ImportRepositoryError(
                    "import_order içinde string olmayan tablo adı bulundu."
                )

            table_name = raw_table_name.strip()

            if not table_name:
                raise ImportRepositoryError(
                    "import_order içinde boş tablo adı bulundu."
                )

            if (
                table_name
                not in self.ALLOWED_TABLES
            ):
                raise ImportRepositoryError(
                    f"İzin verilmeyen tablo adı: {table_name}"
                )

            rows = tables.get(
                table_name,
                [],
            )

            if rows is None:
                rows = []

            if not isinstance(
                rows,
                list,
            ):
                raise ImportRepositoryError(
                    f"{table_name} tablosu JSON dizisi olmalıdır."
                )

            primary_key_column = (
                self.PRIMARY_KEY_CANDIDATES.get(
                    table_name
                )
            )

            table_new = 0
            table_existing = 0
            table_uncheckable = 0

            for row_index, row in enumerate(
                rows,
            ):
                if not isinstance(
                    row,
                    dict,
                ):
                    raise ImportRepositoryError(
                        (
                            f"{table_name}"
                            f"[{row_index}] nesne olmalıdır."
                        )
                    )

                if not row:
                    continue

                if (
                    primary_key_column is None
                    or primary_key_column not in row
                    or row.get(primary_key_column) is None
                ):
                    table_uncheckable += 1
                    total_uncheckable += 1
                    continue

                raw_pk_value = row.get(
                    primary_key_column
                )

                resolved_pk_value = (
                    await self._resolve_value(
                        raw_pk_value,
                        table_name=table_name,
                        column_name=primary_key_column,
                        row_index=row_index,
                    )
                )

                exists = await self._row_exists_by_primary_key(
                    table_name=table_name,
                    primary_key_column=primary_key_column,
                    primary_key_value=resolved_pk_value,
                )

                if exists:
                    table_existing += 1
                    total_existing += 1
                else:
                    table_new += 1
                    total_new += 1

            table_results[
                table_name
            ] = {
                "new": table_new,
                "existing": table_existing,
                "uncheckable": table_uncheckable,
                "total": (
                    table_new
                    + table_existing
                    + table_uncheckable
                ),
            }

        return {
            "new": total_new,
            "existing": total_existing,
            "uncheckable": total_uncheckable,
            "total": (
                total_new
                + total_existing
                + total_uncheckable
            ),
            "tables": table_results,
        }

    async def _row_exists_by_primary_key(
        self,
        *,
        table_name: str,
        primary_key_column: str,
        primary_key_value: Any,
    ) -> bool:
        if (
            table_name
            not in self.ALLOWED_TABLES
        ):
            raise ImportRepositoryError(
                f"İzin verilmeyen tablo adı: {table_name}"
            )

        if not self._is_safe_identifier(
            primary_key_column
        ):
            raise ImportRepositoryError(
                (
                    "Güvensiz primary key kolonu: "
                    f"{table_name}.{primary_key_column}"
                )
            )

        statement = text(
            f"""
            SELECT 1
            FROM
                {self._quote_identifier(self.SCHEMA_NAME)}.
                {self._quote_identifier(table_name)}
            WHERE
                {self._quote_identifier(primary_key_column)}
                = :primary_key_value
            LIMIT 1
            """
        )

        result = await self.session.execute(
            statement,
            {
                "primary_key_value": primary_key_value,
            },
        )

        return (
            result.first()
            is not None
        )

    async def _insert_row(
        self,
        *,
        table_name: str,
        row: dict[str, Any],
        row_index: int,
    ) -> None:
        if (
            table_name
            not in self.ALLOWED_TABLES
        ):
            raise ImportRepositoryError(
                f"İzin verilmeyen tablo adı: {table_name}"
            )

        columns = list(
            row.keys(),
        )

        if not columns:
            return

        for column in columns:
            if not isinstance(
                column,
                str,
            ):
                raise ImportRepositoryError(
                    (
                        f"{table_name} içinde "
                        "geçersiz kolon adı bulundu."
                    )
                )

            if not self._is_safe_identifier(
                column,
            ):
                raise ImportRepositoryError(
                    (
                        "Güvensiz kolon adı: "
                        f"{table_name}.{column}"
                    )
                )

        quoted_columns = ", ".join(
            self._quote_identifier(
                column,
            )
            for column in columns
        )

        parameters = ", ".join(
            f":p{index}"
            for index
            in range(
                len(columns)
            )
        )

        statement = text(
            f"""
            INSERT INTO
                {self._quote_identifier(self.SCHEMA_NAME)}.
                {self._quote_identifier(table_name)}
                ({quoted_columns})
            VALUES
                ({parameters})
            """
        )

        values: dict[
            str,
            Any,
        ] = {}

        for index, column in enumerate(
            columns
        ):
            resolved_value = (
                await self._resolve_value(
                    row[column],
                    table_name=table_name,
                    column_name=column,
                    row_index=row_index,
                )
            )

            values[
                f"p{index}"
            ] = self._normalize_value(
                resolved_value
            )

        try:
            await self.session.execute(
                statement,
                values,
            )

        except Exception as exc:
            record_hint = (
                row.get(
                    "anchor_id"
                )
                or row.get(
                    "concept_id"
                )
                or row.get(
                    "scheme_id"
                )
                or row.get(
                    "geometry_id"
                )
                or row.get(
                    "id"
                )
                or row.get(
                    "source_id"
                )
            )

            raise ImportRepositoryError(
                (
                    "DB insert başarısız: "
                    f"{table_name}"
                    f"[{row_index}]"
                    + (
                        f" / kayıt={record_hint}"
                        if record_hint
                        else ""
                    )
                    + f" / hata={exc}"
                )
            ) from exc

    async def _resolve_value(
        self,
        value: Any,
        *,
        table_name: str,
        column_name: str,
        row_index: int,
    ) -> Any:
        if not isinstance(
            value,
            dict,
        ):
            return value

        reference_target = value.get(
            "$ref"
        )

        if reference_target is None:
            return value

        if not isinstance(
            reference_target,
            str,
        ):
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "$ref değeri string olmalıdır."
                    ),
                )
            )

        if (
            reference_target
            not in self.SUPPORTED_REFERENCE_TARGETS
        ):
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "Desteklenmeyen $ref hedefi: "
                        f"{reference_target}"
                    ),
                )
            )

        if (
            reference_target
            == "km.concept_scheme"
        ):
            return await self._resolve_concept_scheme_reference(
                value,
                table_name=table_name,
                column_name=column_name,
                row_index=row_index,
            )

        if (
            reference_target
            == "km.concept"
        ):
            return await self._resolve_concept_reference(
                value,
                table_name=table_name,
                column_name=column_name,
                row_index=row_index,
            )

        raise ImportReferenceResolutionError(
            self._reference_error_message(
                table_name=table_name,
                column_name=column_name,
                row_index=row_index,
                detail=(
                    "Çözümlenemeyen $ref hedefi: "
                    f"{reference_target}"
                ),
            )
        )

    async def _resolve_concept_scheme_reference(
        self,
        reference: dict[str, Any],
        *,
        table_name: str,
        column_name: str,
        row_index: int,
    ) -> Any:
        allowed_keys = {
            "$ref",
            "scheme_code",
            "version",
        }

        unexpected_keys = (
            set(reference)
            - allowed_keys
        )

        if unexpected_keys:
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "km.concept_scheme referansında "
                        "beklenmeyen alanlar: "
                        + ", ".join(
                            sorted(
                                unexpected_keys
                            )
                        )
                    ),
                )
            )

        scheme_code = reference.get(
            "scheme_code"
        )

        version = reference.get(
            "version"
        )

        if not isinstance(
            scheme_code,
            str,
        ) or not scheme_code.strip():
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept_scheme referansında "
                        "scheme_code eksik."
                    ),
                )
            )

        if not isinstance(
            version,
            str,
        ) or not version.strip():
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept_scheme referansında "
                        "version eksik."
                    ),
                )
            )

        scheme_code = (
            scheme_code.strip()
        )

        version = (
            version.strip()
        )

        cache_key = (
            scheme_code,
            version,
        )

        if (
            cache_key
            in self._concept_scheme_cache
        ):
            return (
                self._concept_scheme_cache[
                    cache_key
                ]
            )

        statement = text(
            """
            SELECT scheme_id
            FROM km.concept_scheme
            WHERE scheme_code = :scheme_code
              AND version = :version
            LIMIT 2
            """
        )

        result = await self.session.execute(
            statement,
            {
                "scheme_code": scheme_code,
                "version": version,
            },
        )

        rows = result.scalars().all()

        if len(rows) == 0:
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept_scheme bulunamadı: "
                        f"{scheme_code}@{version}"
                    ),
                )
            )

        if len(rows) > 1:
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept_scheme referansı "
                        "tekil değil: "
                        f"{scheme_code}@{version}"
                    ),
                )
            )

        resolved_id = rows[0]

        self._concept_scheme_cache[
            cache_key
        ] = resolved_id

        return resolved_id

    async def _resolve_concept_reference(
        self,
        reference: dict[str, Any],
        *,
        table_name: str,
        column_name: str,
        row_index: int,
    ) -> Any:
        allowed_keys = {
            "$ref",
            "scheme_code",
            "scheme_version",
            "concept_code",
        }

        unexpected_keys = (
            set(reference)
            - allowed_keys
        )

        if unexpected_keys:
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "km.concept referansında "
                        "beklenmeyen alanlar: "
                        + ", ".join(
                            sorted(
                                unexpected_keys
                            )
                        )
                    ),
                )
            )

        scheme_code = reference.get(
            "scheme_code"
        )

        scheme_version = reference.get(
            "scheme_version"
        )

        concept_code = reference.get(
            "concept_code"
        )

        if not isinstance(
            scheme_code,
            str,
        ) or not scheme_code.strip():
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept referansında "
                        "scheme_code eksik."
                    ),
                )
            )

        if not isinstance(
            scheme_version,
            str,
        ) or not scheme_version.strip():
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept referansında "
                        "scheme_version eksik."
                    ),
                )
            )

        if not isinstance(
            concept_code,
            str,
        ) or not concept_code.strip():
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept referansında "
                        "concept_code eksik."
                    ),
                )
            )

        scheme_code = (
            scheme_code.strip()
        )

        scheme_version = (
            scheme_version.strip()
        )

        concept_code = (
            concept_code.strip()
        )

        cache_key = (
            scheme_code,
            scheme_version,
            concept_code,
        )

        if (
            cache_key
            in self._concept_cache
        ):
            return (
                self._concept_cache[
                    cache_key
                ]
            )

        statement = text(
            """
            SELECT c.concept_id
            FROM km.concept AS c
            INNER JOIN km.concept_scheme AS cs
                ON cs.scheme_id = c.scheme_id
            WHERE cs.scheme_code = :scheme_code
              AND cs.version = :scheme_version
              AND c.concept_code = :concept_code
            LIMIT 2
            """
        )

        result = await self.session.execute(
            statement,
            {
                "scheme_code": scheme_code,
                "scheme_version": scheme_version,
                "concept_code": concept_code,
            },
        )

        rows = result.scalars().all()

        if len(rows) == 0:
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept bulunamadı: "
                        f"{scheme_code}@"
                        f"{scheme_version}/"
                        f"{concept_code}"
                    ),
                )
            )

        if len(rows) > 1:
            raise ImportReferenceResolutionError(
                self._reference_error_message(
                    table_name=table_name,
                    column_name=column_name,
                    row_index=row_index,
                    detail=(
                        "concept referansı tekil değil: "
                        f"{scheme_code}@"
                        f"{scheme_version}/"
                        f"{concept_code}"
                    ),
                )
            )

        resolved_id = rows[0]

        self._concept_cache[
            cache_key
        ] = resolved_id

        return resolved_id

    @staticmethod
    def _reference_error_message(
        *,
        table_name: str,
        column_name: str,
        row_index: int,
        detail: str,
    ) -> str:
        return (
            "Referans çözümlenemedi: "
            f"{table_name}"
            f"[{row_index}]"
            f".{column_name} / "
            f"{detail}"
        )

    @staticmethod
    def _load_package(
        path: Path,
    ) -> dict[str, Any]:
        try:
            data = json.loads(
                path.read_text(
                    encoding="utf-8",
                )
            )

        except Exception as exc:
            raise ImportRepositoryError(
                f"Import JSON okunamadı: {path}"
            ) from exc

        if not isinstance(
            data,
            dict,
        ):
            raise ImportRepositoryError(
                "Import JSON kökü nesne olmalıdır."
            )

        return data

    @staticmethod
    def _validate_package_root(
        package: dict[str, Any],
    ) -> None:
        if (
            package.get(
                "format"
            )
            != "km-json-import"
        ):
            raise ImportRepositoryError(
                "Desteklenmeyen import formatı."
            )

        target_database = (
            package.get(
                "target_database"
            )
        )

        if not isinstance(
            target_database,
            dict,
        ):
            raise ImportRepositoryError(
                "target_database bulunamadı."
            )

        target_schema = (
            target_database.get(
                "schema"
            )
        )

        if (
            target_schema
            != "km"
        ):
            raise ImportRepositoryError(
                (
                    "Import paketi km şemasını "
                    "hedeflemiyor. "
                    f"Hedef: {target_schema!r}"
                )
            )

    @staticmethod
    def _normalize_value(
        value: Any,
    ) -> Any:
        if isinstance(
            value,
            (
                dict,
                list,
            ),
        ):
            return json.dumps(
                value,
                ensure_ascii=False,
            )

        return value

    @staticmethod
    def _is_safe_identifier(
        value: str,
    ) -> bool:
        if not value:
            return False

        first = value[0]

        if not (
            first.isalpha()
            or first == "_"
        ):
            return False

        return all(
            char.isalnum()
            or char == "_"
            for char in value
        )

    @staticmethod
    def _quote_identifier(
        value: str,
    ) -> str:
        if not ImportRepository._is_safe_identifier(
            value,
        ):
            raise ImportRepositoryError(
                (
                    "Güvensiz SQL identifier: "
                    f"{value}"
                )
            )

        return f'"{value}"'
