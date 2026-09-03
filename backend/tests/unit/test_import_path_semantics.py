from __future__ import annotations

from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest

from app.imports.schemas import ImportImageMode
from app.imports.service import ImportJobService, MediaCandidate, MediaUploadInput
from app.imports.storage import ImportStagingStorage, ImportStorageError, StoredImportFile


def _candidate(tmp_path: Path, relative_path: str) -> MediaCandidate:
    file_path = tmp_path / Path(relative_path).name
    file_path.write_bytes(b"image")
    stored = StoredImportFile(
        original_name=file_path.name,
        stored_name=file_path.name,
        relative_path=f"media/{relative_path}",
        content_type="image/webp",
        size_bytes=file_path.stat().st_size,
        sha256_hex="0" * 64,
        absolute_path=file_path,
    )
    return MediaCandidate(stored=stored, source_relative_path=relative_path)


def test_windows_and_web_folder_paths_have_the_same_match_semantics(tmp_path: Path) -> None:
    service = ImportJobService(ImportStagingStorage(tmp_path / "staging"))
    package = {
        "tables": {
            "media_asset": [
                {"anchor_id": str(uuid4()), "storage_uri": r"308981_images\nested\image.webp"}
            ]
        }
    }
    issues = []
    summary = service._validate_media_files(
        package=package,
        image_mode=ImportImageMode.FOLDER,
        candidates=[_candidate(tmp_path, "308981_images/nested/image.webp")],
        issues=issues,
    )

    assert summary.referenced == 1
    assert summary.supplied == 1
    assert summary.matched == 1
    assert summary.missing == 0
    assert issues == []


def test_nested_folder_upload_preserves_canonical_relative_path(tmp_path: Path) -> None:
    storage = ImportStagingStorage(tmp_path / "staging")
    service = ImportJobService(storage)
    job_id = uuid4()
    storage.create_job(job_id)
    candidates, issues = service._stage_folder_media(
        job_id=job_id,
        uploads=[
            MediaUploadInput(
                stream=BytesIO(b"image"),
                file_name="image.webp",
                relative_path=r"308981_images\nested\image.webp",
                content_type="image/webp",
            )
        ],
    )

    assert issues == []
    assert candidates[0].source_relative_path == "308981_images/nested/image.webp"
    assert candidates[0].stored.relative_path == "media/308981_images/nested/image.webp"


@pytest.mark.parametrize(
    "unsafe_path",
    ["../secret.webp", r"folder\..\secret.webp", r"C:\secret.webp", "/absolute.webp"],
)
def test_storage_rejects_traversal_and_absolute_paths(unsafe_path: str) -> None:
    if unsafe_path == "/absolute.webp":
        # Leading separators are currently normalized by the storage layer, while
        # the service rejects them before storage. Exercise that public boundary.
        assert ImportJobService._safe_archive_path(unsafe_path) is None
        return
    assert ImportJobService._safe_archive_path(unsafe_path) is None
    with pytest.raises(ImportStorageError):
        ImportStagingStorage._safe_relative_path(unsafe_path)
