from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest

from app.imports import commit_service as commit_module
from app.imports.commit_service import ImportCommitService, ImportCommitServiceError
from app.imports.storage import ImportStagingStorage


class _Transaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False


class _Session:
    def __init__(self):
        self.begin_count = 0
        self.rollback_count = 0

    def begin(self):
        self.begin_count += 1
        return _Transaction()

    async def rollback(self):
        self.rollback_count += 1


def test_late_import_failure_rolls_back_and_marks_job_failed(tmp_path, monkeypatch) -> None:
    storage = ImportStagingStorage(tmp_path / "staging")
    job_id = uuid4()
    storage.create_job(job_id)
    (storage.package_dir(job_id) / "import.json").write_text("{}", encoding="utf-8")
    storage.write_manifest(job_id=job_id, payload={"status": "ready_for_review"})
    session = _Session()

    class _Repository:
        def __init__(self, current_session):
            self.session = current_session

        async def analyze_package_duplicates_from_file(self, package_path):
            return {"total": 5000, "new": 5000, "existing": 0, "uncheckable": 0}

        async def import_package_from_file(self, package_path):
            raise RuntimeError("row 5000 failed")

    monkeypatch.setattr(commit_module, "ImportRepository", _Repository)
    service = ImportCommitService(session=session, storage=storage)

    with pytest.raises(ImportCommitServiceError, match="rollback"):
        asyncio.run(service.commit_job(job_id))

    manifest = storage.read_manifest(job_id)
    assert session.begin_count == 2
    assert session.rollback_count == 1
    assert manifest["status"] == "failed"
    assert "row 5000 failed" in manifest["commit_error"]
