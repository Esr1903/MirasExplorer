from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest

from app.imports import commit_service as commit_module
from app.imports.commit_service import ImportCommitNotAllowedError, ImportCommitService
from app.imports.storage import ImportStagingStorage


class _Transaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False


class _Session:
    def begin(self):
        return _Transaction()


def _ready_job(tmp_path):
    storage = ImportStagingStorage(tmp_path / "staging")
    job_id = uuid4()
    storage.create_job(job_id)
    (storage.package_dir(job_id) / "import.json").write_text("{}", encoding="utf-8")
    storage.write_manifest(job_id=job_id, payload={"status": "ready_for_review"})
    return storage, job_id


@pytest.mark.parametrize(
    "analysis",
    [
        {"total": 3637, "new": 0, "existing": 3637, "uncheckable": 0},
        {"total": 1, "new": 0, "existing": 0, "uncheckable": 1},
    ],
)
def test_commit_is_blocked_for_existing_or_uncheckable_rows(
    tmp_path, monkeypatch, analysis
) -> None:
    storage, job_id = _ready_job(tmp_path)

    class _Repository:
        def __init__(self, session):
            self.session = session

        async def analyze_package_duplicates_from_file(self, package_path):
            return analysis

    monkeypatch.setattr(commit_module, "ImportRepository", _Repository)
    service = ImportCommitService(session=_Session(), storage=storage)

    with pytest.raises(ImportCommitNotAllowedError):
        asyncio.run(service.commit_job(job_id))

    # The guard fires before COMMITTING state or any insert is attempted.
    assert storage.read_manifest(job_id)["status"] == "ready_for_review"
