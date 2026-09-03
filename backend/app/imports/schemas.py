from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ImportJobStatus(StrEnum):
    RECEIVED = "received"
    VALIDATING = "validating"
    READY_FOR_REVIEW = "ready_for_review"
    WARNING = "warning"
    REJECTED = "rejected"
    COMMITTING = "committing"
    COMMITTED = "committed"
    FAILED = "failed"


class ImportImageMode(StrEnum):
    NONE = "none"
    ZIP = "zip"
    FOLDER = "folder"


class ImportIssueSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class ImportIssueCode(StrEnum):
    INVALID_JSON = "invalid_json"
    SCHEMA_MISMATCH = "schema_mismatch"

    MISSING_REQUIRED_FIELD = "missing_required_field"
    INVALID_FIELD_TYPE = "invalid_field_type"

    DUPLICATE_PRIMARY_KEY = "duplicate_primary_key"
    DUPLICATE_NATURAL_KEY = "duplicate_natural_key"

    FOREIGN_KEY_ERROR = "foreign_key_error"
    CHECK_CONSTRAINT_ERROR = "check_constraint_error"

    INVALID_MEDIA_REFERENCE = "invalid_media_reference"
    MISSING_MEDIA = "missing_media"
    UNUSED_MEDIA = "unused_media"
    DUPLICATE_MEDIA = "duplicate_media"
    MEDIA_HASH_MISMATCH = "media_hash_mismatch"
    MEDIA_SIZE_MISMATCH = "media_size_mismatch"

    UNSUPPORTED_FILE = "unsupported_file"
    INVALID_ARCHIVE = "invalid_archive"

    OTHER = "other"


class ImportIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: ImportIssueCode
    severity: ImportIssueSeverity

    message: str = Field(
        min_length=1,
        max_length=2000,
    )

    table_name: str | None = Field(
        default=None,
        max_length=128,
    )

    row_index: int | None = Field(
        default=None,
        ge=0,
    )

    record_id: str | None = Field(
        default=None,
        max_length=255,
    )

    field_name: str | None = Field(
        default=None,
        max_length=255,
    )

    file_name: str | None = Field(
        default=None,
        max_length=1024,
    )

    detail: str | None = Field(
        default=None,
        max_length=4000,
    )


class ImportTableSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    table_name: str = Field(
        min_length=1,
        max_length=128,
    )

    row_count: int = Field(
        ge=0,
    )


class ImportMediaSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    referenced: int = Field(
        default=0,
        ge=0,
    )

    supplied: int = Field(
        default=0,
        ge=0,
    )

    matched: int = Field(
        default=0,
        ge=0,
    )

    missing: int = Field(
        default=0,
        ge=0,
    )

    unused: int = Field(
        default=0,
        ge=0,
    )

    duplicate: int = Field(
        default=0,
        ge=0,
    )


class ImportValidationSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: str | None = None
    format_version: str | None = None
    target_schema: str | None = None

    total_rows: int = Field(
        default=0,
        ge=0,
    )

    heritage_asset_count: int = Field(
        default=0,
        ge=0,
    )

    person_count: int = Field(
        default=0,
        ge=0,
    )

    organization_count: int = Field(
        default=0,
        ge=0,
    )

    media_asset_count: int = Field(
        default=0,
        ge=0,
    )

    table_summaries: list[ImportTableSummary] = Field(
        default_factory=list,
    )

    media: ImportMediaSummary = Field(
        default_factory=ImportMediaSummary,
    )

    error_count: int = Field(
        default=0,
        ge=0,
    )

    warning_count: int = Field(
        default=0,
        ge=0,
    )

    can_commit: bool = False


class ImportJobFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    original_name: str = Field(
        min_length=1,
        max_length=1024,
    )

    stored_name: str = Field(
        min_length=1,
        max_length=1024,
    )

    relative_path: str | None = Field(
        default=None,
        max_length=2048,
    )

    content_type: str | None = Field(
        default=None,
        max_length=255,
    )

    size_bytes: int = Field(
        ge=0,
    )

    sha256_hex: str | None = Field(
        default=None,
        pattern=r"^[0-9a-f]{64}$",
    )


class ImportJobCreateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: UUID
    status: ImportJobStatus

    source_name: str | None = None

    image_mode: ImportImageMode

    created_at: datetime
    updated_at: datetime

    json_file: ImportJobFile

    image_files: list[ImportJobFile] = Field(
        default_factory=list,
    )

    validation: ImportValidationSummary | None = None

    issues: list[ImportIssue] = Field(
        default_factory=list,
    )


class ImportJobDetailResponse(
    ImportJobCreateResponse
):
    package_metadata: dict[str, Any] = Field(
        default_factory=dict,
    )


class ImportCommitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_status: ImportJobStatus = (
        ImportJobStatus.READY_FOR_REVIEW
    )

    confirmation: bool = False


class ImportCommitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: UUID
    status: ImportJobStatus

    committed_at: datetime | None = None

    inserted_rows: int = Field(
        default=0,
        ge=0,
    )

    updated_rows: int = Field(
        default=0,
        ge=0,
    )

    skipped_rows: int = Field(
        default=0,
        ge=0,
    )

    message: str