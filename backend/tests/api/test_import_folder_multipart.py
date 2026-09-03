from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.imports import routes
from app.imports.service import ImportJobService
from app.imports.storage import ImportStagingStorage
from app.main import app


def test_folder_multipart_files_reach_staging_with_aligned_relative_paths(
    tmp_path, monkeypatch
) -> None:
    service = ImportJobService(ImportStagingStorage(tmp_path / "staging"))
    monkeypatch.setattr(routes, "get_import_service", lambda: service)
    package = {
        "format": "km-json-import",
        "format_version": "1.0",
        "target_schema": "km",
        "tables": {
            "record_anchor": [],
            "heritage_asset": [],
            "media_asset": [],
        },
    }

    with TestClient(app) as client:
        response = client.post(
            "/api/editor/imports",
            data={
                "image_mode": "folder",
                "image_relative_paths": [
                    "308981_images/nested/a.webp",
                    r"308981_images\b.webp",
                ],
            },
            files=[
                (
                    "json_file",
                    ("308981_km_import.json", json.dumps(package), "application/json"),
                ),
                ("image_files", ("a.webp", b"a", "image/webp")),
                ("image_files", ("b.webp", b"b", "image/webp")),
            ],
        )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert [item["relative_path"] for item in payload["image_files"]] == [
        "media/308981_images/nested/a.webp",
        "media/308981_images/b.webp",
    ]
