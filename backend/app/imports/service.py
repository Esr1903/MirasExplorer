from __future__ import annotations

import json
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO, cast
from uuid import UUID, uuid4

from .schemas import (
    ImportImageMode,
    ImportIssue,
    ImportIssueCode,
    ImportIssueSeverity,
    ImportJobCreateResponse,
    ImportJobFile,
    ImportJobStatus,
    ImportMediaSummary,
    ImportTableSummary,
    ImportValidationSummary,
)
from .storage import ImportStagingStorage, ImportStorageError, StoredImportFile


class ImportServiceError(RuntimeError):
    pass


class ImportValidationError(ImportServiceError):
    pass


class ImportJobNotFoundError(ImportServiceError):
    pass


@dataclass
class MediaUploadInput:
    stream: BinaryIO
    file_name: str
    relative_path: str
    content_type: str | None


@dataclass
class MediaCandidate:
    stored: StoredImportFile
    source_relative_path: str

    @property
    def normalized_path(self) -> str:
        return ImportJobService._normalize_path(self.source_relative_path)

    @property
    def normalized_file_name(self) -> str:
        return ImportJobService._file_name(self.source_relative_path).lower()


class ImportJobService:
    REQUIRED_TABLES = ("record_anchor", "heritage_asset", "media_asset")
    SUPPORTED_IMAGE_EXTENSIONS = {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".svg"
    }
    MAX_MEDIA_FILES = 5000
    MAX_SINGLE_MEDIA_BYTES = 250 * 1024 * 1024
    MAX_TOTAL_MEDIA_BYTES = 2 * 1024 * 1024 * 1024

    def __init__(self, storage: ImportStagingStorage) -> None:
        self.storage = storage

    def create_job(
        self,
        *,
        json_stream: BinaryIO,
        json_file_name: str,
        json_content_type: str | None,
        image_mode: ImportImageMode,
        source_name: str | None = None,
        images_zip_stream: BinaryIO | None = None,
        images_zip_file_name: str | None = None,
        images_zip_content_type: str | None = None,
        folder_files: list[MediaUploadInput] | None = None,
    ) -> ImportJobCreateResponse:
        job_id = uuid4()
        now = datetime.now(UTC)

        try:
            self.storage.create_job(job_id)
            stored_json = self.storage.save_json_package(
                job_id=job_id,
                source=json_stream,
                original_name=json_file_name,
                content_type=json_content_type,
            )

            validation, issues, package_metadata = self._validate_json_package(
                stored_json.absolute_path
            )
            package = self._read_package_object(stored_json.absolute_path)
            media_candidates: list[MediaCandidate] = []

            if package is not None:
                if image_mode == ImportImageMode.ZIP:
                    media_candidates, stage_issues = self._stage_zip_media(
                        job_id=job_id,
                        zip_stream=images_zip_stream,
                        zip_file_name=images_zip_file_name,
                        zip_content_type=images_zip_content_type,
                    )
                    issues.extend(stage_issues)
                elif image_mode == ImportImageMode.FOLDER:
                    media_candidates, stage_issues = self._stage_folder_media(
                        job_id=job_id,
                        uploads=folder_files or [],
                    )
                    issues.extend(stage_issues)

                media_summary = self._validate_media_files(
                    package=package,
                    image_mode=image_mode,
                    candidates=media_candidates,
                    issues=issues,
                )
                validation = self._apply_issue_summary(
                    validation=validation,
                    issues=issues,
                    media_summary=media_summary,
                )
            else:
                validation = self._apply_issue_summary(
                    validation=validation,
                    issues=issues,
                    media_summary=validation.media,
                )

            job_status = self._resolve_job_status(validation)
            stored_images = [
                candidate.stored for candidate in media_candidates]

            manifest = {
                "job_id": str(job_id),
                "status": job_status.value,
                "source_name": source_name,
                "image_mode": image_mode.value,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "json_file": self._stored_file_to_dict(stored_json),
                "image_files": [self._stored_file_to_dict(item) for item in stored_images],
                "validation": validation.model_dump(mode="json"),
                "issues": [issue.model_dump(mode="json") for issue in issues],
                "package_metadata": package_metadata,
            }
            self.storage.write_manifest(job_id=job_id, payload=manifest)

            return ImportJobCreateResponse(
                job_id=job_id,
                status=job_status,
                source_name=source_name,
                image_mode=image_mode,
                created_at=now,
                updated_at=now,
                json_file=self._to_job_file(stored_json),
                image_files=[self._to_job_file(item)
                             for item in stored_images],
                validation=validation,
                issues=issues,
            )
        except Exception:
            self.storage.delete_job(job_id)
            raise

    def get_job(self, job_id: UUID) -> ImportJobCreateResponse:
        try:
            manifest = self.storage.read_manifest(job_id)
        except ImportStorageError as exc:
            raise ImportJobNotFoundError(
                f"Import job bulunamadı: {job_id}") from exc
        return self._manifest_to_response(manifest)

    def _stage_zip_media(
        self,
        *,
        job_id: UUID,
        zip_stream: BinaryIO | None,
        zip_file_name: str | None,
        zip_content_type: str | None,
    ) -> tuple[list[MediaCandidate], list[ImportIssue]]:
        del zip_content_type
        candidates: list[MediaCandidate] = []
        issues: list[ImportIssue] = []

        if zip_stream is None:
            issues.append(ImportIssue(
                code=ImportIssueCode.INVALID_ARCHIVE,
                severity=ImportIssueSeverity.ERROR,
                message="Görsel modu ZIP olarak seçildi ancak ZIP dosyası gönderilmedi.",
                file_name=zip_file_name,
            ))
            return candidates, issues

        try:
            zip_stream.seek(0)
            with zipfile.ZipFile(zip_stream, mode="r") as archive:
                image_members = [
                    info for info in archive.infolist()
                    if not info.is_dir() and self._is_supported_image_path(info.filename)
                ]

                if len(image_members) > self.MAX_MEDIA_FILES:
                    issues.append(ImportIssue(
                        code=ImportIssueCode.INVALID_ARCHIVE,
                        severity=ImportIssueSeverity.ERROR,
                        message="ZIP içinde izin verilen maksimum görsel sayısı aşıldı.",
                        file_name=zip_file_name,
                    ))
                    return candidates, issues

                if sum(info.file_size for info in image_members) > self.MAX_TOTAL_MEDIA_BYTES:
                    issues.append(ImportIssue(
                        code=ImportIssueCode.INVALID_ARCHIVE,
                        severity=ImportIssueSeverity.ERROR,
                        message="ZIP içindeki toplam açılmış görsel boyutu güvenlik limitini aşıyor.",
                        file_name=zip_file_name,
                    ))
                    return candidates, issues

                seen_paths: set[str] = set()
                for info in image_members:
                    relative_path = self._safe_archive_path(info.filename)
                    if relative_path is None:
                        issues.append(ImportIssue(
                            code=ImportIssueCode.INVALID_ARCHIVE,
                            severity=ImportIssueSeverity.ERROR,
                            message="ZIP içinde güvenli olmayan dosya yolu tespit edildi.",
                            file_name=info.filename,
                        ))
                        continue

                    normalized = self._normalize_path(relative_path)
                    if normalized in seen_paths:
                        issues.append(ImportIssue(
                            code=ImportIssueCode.DUPLICATE_MEDIA,
                            severity=ImportIssueSeverity.ERROR,
                            message="ZIP içinde aynı göreli yola sahip birden fazla görsel bulundu.",
                            file_name=relative_path,
                        ))
                        continue
                    seen_paths.add(normalized)

                    if info.file_size > self.MAX_SINGLE_MEDIA_BYTES:
                        issues.append(ImportIssue(
                            code=ImportIssueCode.INVALID_ARCHIVE,
                            severity=ImportIssueSeverity.ERROR,
                            message="ZIP içindeki bir görsel izin verilen maksimum boyutu aşıyor.",
                            file_name=relative_path,
                        ))
                        continue

                    with archive.open(info, mode="r") as source:
                        stored = self.storage.save_media_file(
                            job_id=job_id,
                            source=cast(BinaryIO, source),
                            original_name=self._file_name(relative_path),
                            relative_path=relative_path,
                            content_type=self._guess_image_content_type(
                                relative_path),
                        )

                    candidates.append(MediaCandidate(
                        stored=stored,
                        source_relative_path=relative_path,
                    ))

        except zipfile.BadZipFile as exc:
            issues.append(ImportIssue(
                code=ImportIssueCode.INVALID_ARCHIVE,
                severity=ImportIssueSeverity.ERROR,
                message="Gönderilen ZIP arşivi geçerli değil veya bozuk.",
                file_name=zip_file_name,
                detail=str(exc)[:1000],
            ))
        except Exception as exc:
            issues.append(ImportIssue(
                code=ImportIssueCode.INVALID_ARCHIVE,
                severity=ImportIssueSeverity.ERROR,
                message="ZIP arşivi işlenirken hata oluştu.",
                file_name=zip_file_name,
                detail=str(exc)[:1000],
            ))

        return candidates, issues

    def _stage_folder_media(
        self,
        *,
        job_id: UUID,
        uploads: list[MediaUploadInput],
    ) -> tuple[list[MediaCandidate], list[ImportIssue]]:
        candidates: list[MediaCandidate] = []
        issues: list[ImportIssue] = []

        if not uploads:
            issues.append(ImportIssue(
                code=ImportIssueCode.MISSING_MEDIA,
                severity=ImportIssueSeverity.ERROR,
                message="Görsel modu klasör olarak seçildi ancak görsel dosyası gönderilmedi.",
            ))
            return candidates, issues

        if len(uploads) > self.MAX_MEDIA_FILES:
            issues.append(ImportIssue(
                code=ImportIssueCode.OTHER,
                severity=ImportIssueSeverity.ERROR,
                message="İzin verilen maksimum görsel dosyası sayısı aşıldı.",
            ))
            return candidates, issues

        seen_paths: set[str] = set()
        for upload in uploads:
            relative_path = self._safe_archive_path(upload.relative_path)
            if relative_path is None:
                issues.append(ImportIssue(
                    code=ImportIssueCode.INVALID_MEDIA_REFERENCE,
                    severity=ImportIssueSeverity.ERROR,
                    message="Güvenli olmayan klasör dosya yolu tespit edildi.",
                    file_name=upload.file_name,
                ))
                continue

            if not self._is_supported_image_path(relative_path):
                issues.append(ImportIssue(
                    code=ImportIssueCode.UNSUPPORTED_FILE,
                    severity=ImportIssueSeverity.WARNING,
                    message="Desteklenmeyen dosya türü görsel aktarımına alınmadı.",
                    file_name=upload.file_name,
                ))
                continue

            normalized = self._normalize_path(relative_path)
            if normalized in seen_paths:
                issues.append(ImportIssue(
                    code=ImportIssueCode.DUPLICATE_MEDIA,
                    severity=ImportIssueSeverity.ERROR,
                    message="Aynı göreli yola sahip birden fazla görsel gönderildi.",
                    file_name=relative_path,
                ))
                continue
            seen_paths.add(normalized)

            stored = self.storage.save_media_file(
                job_id=job_id,
                source=upload.stream,
                original_name=upload.file_name,
                relative_path=relative_path,
                content_type=upload.content_type or self._guess_image_content_type(
                    relative_path),
            )
            candidates.append(MediaCandidate(
                stored=stored, source_relative_path=relative_path))

        total_size = sum(item.stored.size_bytes for item in candidates)
        if total_size > self.MAX_TOTAL_MEDIA_BYTES:
            issues.append(ImportIssue(
                code=ImportIssueCode.OTHER,
                severity=ImportIssueSeverity.ERROR,
                message="Gönderilen görsellerin toplam boyutu güvenlik limitini aşıyor.",
            ))

        return candidates, issues

    def _validate_media_files(
        self,
        *,
        package: dict[str, Any],
        image_mode: ImportImageMode,
        candidates: list[MediaCandidate],
        issues: list[ImportIssue],
    ) -> ImportMediaSummary:
        tables = package.get("tables")
        if not isinstance(tables, dict):
            return ImportMediaSummary()

        media_rows = self._table_rows(tables, "media_asset")
        referenced_rows = [
            row for row in media_rows if self._string_or_none(row.get("storage_uri"))]

        if image_mode == ImportImageMode.NONE:
            return ImportMediaSummary(
                referenced=len(referenced_rows),
                supplied=0,
                matched=0,
                missing=len(referenced_rows),
                unused=0,
                duplicate=0,
            )

        matched_indexes: set[int] = set()
        matched_count = 0
        missing_count = 0
        duplicate_count = 0

        for row_index, row in enumerate(media_rows):
            storage_uri = self._string_or_none(row.get("storage_uri"))
            if not storage_uri:
                continue

            ref = self._normalize_path(storage_uri)
            matches = [
                i for i, candidate in enumerate(candidates)
                if self._paths_match(ref, candidate.normalized_path)
            ]

            if not matches:
                expected_name = self._file_name(storage_uri).lower()
                matches = [
                    i for i, candidate in enumerate(candidates)
                    if candidate.normalized_file_name == expected_name
                ]

            if not matches:
                missing_count += 1
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_MEDIA,
                    severity=ImportIssueSeverity.ERROR,
                    message="JSON içindeki medya referansı yüklenen dosyalar arasında bulunamadı.",
                    table_name="media_asset",
                    row_index=row_index,
                    record_id=self._string_or_none(row.get("anchor_id")),
                    field_name="storage_uri",
                    file_name=storage_uri,
                ))
                continue

            if len(matches) > 1:
                duplicate_count += 1
                issues.append(ImportIssue(
                    code=ImportIssueCode.DUPLICATE_MEDIA,
                    severity=ImportIssueSeverity.ERROR,
                    message="Bir medya referansı birden fazla dosyayla eşleşti.",
                    table_name="media_asset",
                    row_index=row_index,
                    record_id=self._string_or_none(row.get("anchor_id")),
                    field_name="storage_uri",
                    file_name=storage_uri,
                ))
                continue

            idx = matches[0]
            candidate = candidates[idx]
            matched_indexes.add(idx)
            matched_count += 1

            expected_size = self._int_or_none(row.get("byte_size"))
            if expected_size is not None and expected_size != candidate.stored.size_bytes:
                issues.append(ImportIssue(
                    code=ImportIssueCode.MEDIA_SIZE_MISMATCH,
                    severity=ImportIssueSeverity.ERROR,
                    message="Görsel dosya boyutu JSON media_asset.byte_size değeriyle uyuşmuyor.",
                    table_name="media_asset",
                    row_index=row_index,
                    record_id=self._string_or_none(row.get("anchor_id")),
                    field_name="byte_size",
                    file_name=storage_uri,
                    detail=f"Beklenen: {expected_size}, gerçek: {candidate.stored.size_bytes}",
                ))

            expected_sha = self._string_or_none(row.get("sha256_hex"))
            if expected_sha and expected_sha.lower() != candidate.stored.sha256_hex.lower():
                issues.append(ImportIssue(
                    code=ImportIssueCode.MEDIA_HASH_MISMATCH,
                    severity=ImportIssueSeverity.ERROR,
                    message="Görsel SHA-256 değeri JSON media_asset.sha256_hex değeriyle uyuşmuyor.",
                    table_name="media_asset",
                    row_index=row_index,
                    record_id=self._string_or_none(row.get("anchor_id")),
                    field_name="sha256_hex",
                    file_name=storage_uri,
                    detail=f"Beklenen: {expected_sha.lower()}, gerçek: {candidate.stored.sha256_hex.lower()}",
                ))

        unused_indexes = [i for i in range(
            len(candidates)) if i not in matched_indexes]
        for i in unused_indexes:
            issues.append(ImportIssue(
                code=ImportIssueCode.UNUSED_MEDIA,
                severity=ImportIssueSeverity.WARNING,
                message="Yüklenen görsel için JSON içinde eşleşen media_asset.storage_uri bulunamadı.",
                file_name=candidates[i].source_relative_path,
            ))

        return ImportMediaSummary(
            referenced=len(referenced_rows),
            supplied=len(candidates),
            matched=matched_count,
            missing=missing_count,
            unused=len(unused_indexes),
            duplicate=duplicate_count,
        )

    def _validate_json_package(
        self,
        path: Path,
    ) -> tuple[ImportValidationSummary, list[ImportIssue], dict[str, Any]]:
        issues: list[ImportIssue] = []
        try:
            package = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            issues.append(ImportIssue(
                code=ImportIssueCode.INVALID_JSON,
                severity=ImportIssueSeverity.ERROR,
                message="JSON dosyası sunucu tarafında parse edilemedi.",
                file_name=path.name,
                detail=str(exc)[:1000],
            ))
            return ImportValidationSummary(error_count=1, can_commit=False), issues, {}

        if not isinstance(package, dict):
            issues.append(ImportIssue(
                code=ImportIssueCode.SCHEMA_MISMATCH,
                severity=ImportIssueSeverity.ERROR,
                message="JSON kökü bir nesne olmalıdır.",
            ))
            return ImportValidationSummary(error_count=1, can_commit=False), issues, {}

        package_format = self._string_or_none(package.get("format"))
        format_version = self._string_or_none(package.get("format_version"))
        if package_format != "km-json-import":
            issues.append(ImportIssue(
                code=ImportIssueCode.SCHEMA_MISMATCH,
                severity=ImportIssueSeverity.ERROR,
                message="Desteklenmeyen JSON paket formatı. format='km-json-import' bekleniyor.",
                field_name="format",
            ))

        tables = package.get("tables")
        if not isinstance(tables, dict):
            issues.append(ImportIssue(
                code=ImportIssueCode.SCHEMA_MISMATCH,
                severity=ImportIssueSeverity.ERROR,
                message="JSON paketinde 'tables' nesnesi bulunamadı.",
                field_name="tables",
            ))
            tables = {}

        table_summaries: list[ImportTableSummary] = []
        total_rows = 0
        for table_name, rows in tables.items():
            if not isinstance(table_name, str):
                continue
            if not isinstance(rows, list):
                issues.append(ImportIssue(
                    code=ImportIssueCode.SCHEMA_MISMATCH,
                    severity=ImportIssueSeverity.ERROR,
                    message=f"{table_name} tablosu JSON dizisi olmalıdır.",
                    table_name=table_name,
                ))
                continue
            total_rows += len(rows)
            table_summaries.append(ImportTableSummary(
                table_name=table_name, row_count=len(rows)))

        for required in self.REQUIRED_TABLES:
            if required not in tables:
                issues.append(ImportIssue(
                    code=ImportIssueCode.SCHEMA_MISMATCH,
                    severity=ImportIssueSeverity.ERROR,
                    message=f"Zorunlu tablo bulunamadı: {required}",
                    table_name=required,
                ))

        record_anchors = self._table_rows(tables, "record_anchor")
        heritage_assets = self._table_rows(tables, "heritage_asset")
        persons = self._table_rows(tables, "person")
        organizations = self._table_rows(tables, "organization")
        media_assets = self._table_rows(tables, "media_asset")

        self._validate_record_anchors(record_anchors, issues)
        self._validate_heritage_assets(heritage_assets, record_anchors, issues)
        self._validate_media_assets(media_assets, record_anchors, issues)

        error_count = sum(
            1 for issue in issues if issue.severity == ImportIssueSeverity.ERROR)
        warning_count = sum(
            1 for issue in issues if issue.severity == ImportIssueSeverity.WARNING)

        target_database = package.get("target_database")
        target_schema = None
        if isinstance(target_database, dict):
            target_schema = self._string_or_none(target_database.get("schema"))

        package_metadata = package.get("package_metadata")
        if not isinstance(package_metadata, dict):
            package_metadata = {}

        summary = ImportValidationSummary(
            format=package_format,
            format_version=format_version,
            target_schema=target_schema,
            total_rows=total_rows,
            heritage_asset_count=len(heritage_assets),
            person_count=len(persons),
            organization_count=len(organizations),
            media_asset_count=len(media_assets),
            table_summaries=sorted(
                table_summaries, key=lambda item: item.table_name),
            media=ImportMediaSummary(referenced=len(media_assets)),
            error_count=error_count,
            warning_count=warning_count,
            can_commit=(error_count == 0),
        )
        return summary, issues, package_metadata

    def _validate_record_anchors(self, rows: list[dict[str, Any]], issues: list[ImportIssue]) -> None:
        seen: set[str] = set()
        for index, row in enumerate(rows):
            anchor_id = self._string_or_none(row.get("anchor_id"))
            if not anchor_id:
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="record_anchor.anchor_id zorunludur.",
                    table_name="record_anchor",
                    row_index=index,
                    field_name="anchor_id",
                ))
                continue
            if anchor_id in seen:
                issues.append(ImportIssue(
                    code=ImportIssueCode.DUPLICATE_PRIMARY_KEY,
                    severity=ImportIssueSeverity.ERROR,
                    message=f"Yinelenen record_anchor.anchor_id: {anchor_id}",
                    table_name="record_anchor",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="anchor_id",
                ))
            seen.add(anchor_id)
            if not self._string_or_none(row.get("display_label")):
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="record_anchor.display_label zorunludur.",
                    table_name="record_anchor",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="display_label",
                ))
            if not self._string_or_none(row.get("record_kind_code")):
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="record_anchor.record_kind_code zorunludur.",
                    table_name="record_anchor",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="record_kind_code",
                ))

    def _validate_heritage_assets(
        self,
        rows: list[dict[str, Any]],
        record_anchors: list[dict[str, Any]],
        issues: list[ImportIssue],
    ) -> None:
        anchor_ids = {self._string_or_none(
            row.get("anchor_id")) for row in record_anchors}
        anchor_ids.discard(None)
        seen: set[str] = set()
        for index, row in enumerate(rows):
            anchor_id = self._string_or_none(row.get("anchor_id"))
            if not anchor_id:
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="heritage_asset.anchor_id zorunludur.",
                    table_name="heritage_asset",
                    row_index=index,
                    field_name="anchor_id",
                ))
                continue
            if anchor_id in seen:
                issues.append(ImportIssue(
                    code=ImportIssueCode.DUPLICATE_PRIMARY_KEY,
                    severity=ImportIssueSeverity.ERROR,
                    message=f"Yinelenen heritage_asset.anchor_id: {anchor_id}",
                    table_name="heritage_asset",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="anchor_id",
                ))
            seen.add(anchor_id)
            if anchor_id not in anchor_ids:
                issues.append(ImportIssue(
                    code=ImportIssueCode.FOREIGN_KEY_ERROR,
                    severity=ImportIssueSeverity.ERROR,
                    message="heritage_asset kaydının eşleşen record_anchor kaydı bulunamadı.",
                    table_name="heritage_asset",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="anchor_id",
                ))

    def _validate_media_assets(
        self,
        rows: list[dict[str, Any]],
        record_anchors: list[dict[str, Any]],
        issues: list[ImportIssue],
    ) -> None:
        anchor_ids = {self._string_or_none(
            row.get("anchor_id")) for row in record_anchors}
        anchor_ids.discard(None)
        seen_ids: set[str] = set()
        seen_uris: set[str] = set()

        for index, row in enumerate(rows):
            anchor_id = self._string_or_none(row.get("anchor_id"))
            storage_uri = self._string_or_none(row.get("storage_uri"))
            mime_type = self._string_or_none(row.get("mime_type"))

            if not anchor_id:
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="media_asset.anchor_id zorunludur.",
                    table_name="media_asset",
                    row_index=index,
                    field_name="anchor_id",
                ))
            else:
                if anchor_id in seen_ids:
                    issues.append(ImportIssue(
                        code=ImportIssueCode.DUPLICATE_PRIMARY_KEY,
                        severity=ImportIssueSeverity.ERROR,
                        message=f"Yinelenen media_asset.anchor_id: {anchor_id}",
                        table_name="media_asset",
                        row_index=index,
                        record_id=anchor_id,
                        field_name="anchor_id",
                    ))
                seen_ids.add(anchor_id)
                if anchor_id not in anchor_ids:
                    issues.append(ImportIssue(
                        code=ImportIssueCode.FOREIGN_KEY_ERROR,
                        severity=ImportIssueSeverity.ERROR,
                        message="media_asset kaydının eşleşen record_anchor kaydı bulunamadı.",
                        table_name="media_asset",
                        row_index=index,
                        record_id=anchor_id,
                        field_name="anchor_id",
                    ))

            if not storage_uri:
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="media_asset.storage_uri zorunludur.",
                    table_name="media_asset",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="storage_uri",
                ))
            else:
                if storage_uri in seen_uris:
                    issues.append(ImportIssue(
                        code=ImportIssueCode.DUPLICATE_NATURAL_KEY,
                        severity=ImportIssueSeverity.ERROR,
                        message=f"Yinelenen media_asset.storage_uri: {storage_uri}",
                        table_name="media_asset",
                        row_index=index,
                        record_id=anchor_id,
                        field_name="storage_uri",
                    ))
                seen_uris.add(storage_uri)

            if not mime_type:
                issues.append(ImportIssue(
                    code=ImportIssueCode.MISSING_REQUIRED_FIELD,
                    severity=ImportIssueSeverity.ERROR,
                    message="media_asset.mime_type zorunludur.",
                    table_name="media_asset",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="mime_type",
                ))

            sha = self._string_or_none(row.get("sha256_hex"))
            if sha and not self._is_sha256(sha):
                issues.append(ImportIssue(
                    code=ImportIssueCode.CHECK_CONSTRAINT_ERROR,
                    severity=ImportIssueSeverity.ERROR,
                    message="media_asset.sha256_hex geçerli 64 karakterli lowercase SHA-256 olmalıdır.",
                    table_name="media_asset",
                    row_index=index,
                    record_id=anchor_id,
                    field_name="sha256_hex",
                ))

    @staticmethod
    def _read_package_object(path: Path) -> dict[str, Any] | None:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None
        return value if isinstance(value, dict) else None

    @staticmethod
    def _table_rows(tables: dict[str, Any], table_name: str) -> list[dict[str, Any]]:
        rows = tables.get(table_name)
        if not isinstance(rows, list):
            return []
        return [row for row in rows if isinstance(row, dict)]

    @staticmethod
    def _string_or_none(value: Any) -> str | None:
        if not isinstance(value, str):
            return None
        value = value.strip()
        return value or None

    @staticmethod
    def _int_or_none(value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
        return None

    @staticmethod
    def _is_sha256(value: str) -> bool:
        return len(value) == 64 and all(ch in "0123456789abcdef" for ch in value)

    @classmethod
    def _is_supported_image_path(cls, value: str) -> bool:
        return Path(value.replace("\\", "/")).suffix.lower() in cls.SUPPORTED_IMAGE_EXTENSIONS

    @staticmethod
    def _safe_archive_path(value: str) -> str | None:
        normalized = value.replace("\\", "/").strip()
        if not normalized or normalized.startswith("/"):
            return None
        parts = [part for part in normalized.split(
            "/") if part not in {"", "."}]
        if not parts or any(part == ".." or ":" in part for part in parts):
            return None
        return "/".join(parts)

    @staticmethod
    def _normalize_path(value: str) -> str:
        return value.replace("\\", "/").strip().strip("/").lower()

    @staticmethod
    def _file_name(value: str) -> str:
        return value.replace("\\", "/").rstrip("/").split("/")[-1]

    @staticmethod
    def _paths_match(reference: str, candidate: str) -> bool:
        return (
            reference == candidate
            or candidate.endswith("/" + reference)
            or reference.endswith("/" + candidate)
        )

    @staticmethod
    def _guess_image_content_type(value: str) -> str | None:
        return {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
            ".tif": "image/tiff",
            ".tiff": "image/tiff",
            ".svg": "image/svg+xml",
        }.get(Path(value).suffix.lower())

    @staticmethod
    def _apply_issue_summary(
        *,
        validation: ImportValidationSummary,
        issues: list[ImportIssue],
        media_summary: ImportMediaSummary,
    ) -> ImportValidationSummary:
        error_count = sum(
            1 for issue in issues if issue.severity == ImportIssueSeverity.ERROR)
        warning_count = sum(
            1 for issue in issues if issue.severity == ImportIssueSeverity.WARNING)
        return validation.model_copy(update={
            "media": media_summary,
            "error_count": error_count,
            "warning_count": warning_count,
            "can_commit": error_count == 0,
        })

    @staticmethod
    def _resolve_job_status(validation: ImportValidationSummary) -> ImportJobStatus:
        if validation.error_count > 0:
            return ImportJobStatus.REJECTED
        if validation.warning_count > 0:
            return ImportJobStatus.WARNING
        return ImportJobStatus.READY_FOR_REVIEW

    @staticmethod
    def _to_job_file(stored: StoredImportFile) -> ImportJobFile:
        return ImportJobFile(
            original_name=stored.original_name,
            stored_name=stored.stored_name,
            relative_path=stored.relative_path,
            content_type=stored.content_type,
            size_bytes=stored.size_bytes,
            sha256_hex=stored.sha256_hex,
        )

    @staticmethod
    def _stored_file_to_dict(stored: StoredImportFile) -> dict[str, Any]:
        return {
            "original_name": stored.original_name,
            "stored_name": stored.stored_name,
            "relative_path": stored.relative_path,
            "content_type": stored.content_type,
            "size_bytes": stored.size_bytes,
            "sha256_hex": stored.sha256_hex,
        }

    @staticmethod
    def _manifest_to_response(manifest: dict[str, Any]) -> ImportJobCreateResponse:
        try:
            return ImportJobCreateResponse(
                job_id=UUID(str(manifest["job_id"])),
                status=ImportJobStatus(manifest["status"]),
                source_name=manifest.get("source_name"),
                image_mode=ImportImageMode(manifest["image_mode"]),
                created_at=datetime.fromisoformat(manifest["created_at"]),
                updated_at=datetime.fromisoformat(manifest["updated_at"]),
                json_file=ImportJobFile.model_validate(manifest["json_file"]),
                image_files=[
                    ImportJobFile.model_validate(item)
                    for item in manifest.get("image_files", [])
                ],
                validation=(
                    ImportValidationSummary.model_validate(
                        manifest["validation"])
                    if manifest.get("validation")
                    else None
                ),
                issues=[
                    ImportIssue.model_validate(item)
                    for item in manifest.get("issues", [])
                ],
            )
        except Exception as exc:
            raise ImportServiceError("Import job manifest okunamadı.") from exc
