from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO
from uuid import UUID


class ImportStorageError(RuntimeError):
    pass


@dataclass(frozen=True)
class StoredImportFile:
    original_name: str
    stored_name: str
    relative_path: str
    content_type: str | None
    size_bytes: int
    sha256_hex: str
    absolute_path: Path


class ImportStagingStorage:
    """
    Import job dosyalarını ana veritabanına commit edilmeden önce
    izole bir staging alanında tutar.

    Önerilen yapı:

    storage/
      imports/
        <job-uuid>/
          package/
            import.json
          media/
            ...
          metadata/
            manifest.json
    """

    def __init__(
        self,
        root_dir: Path,
    ) -> None:
        self.root_dir = (
            root_dir.expanduser().resolve()
        )

    def ensure_root(self) -> None:
        self.root_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

    def job_dir(
        self,
        job_id: UUID,
    ) -> Path:
        return (
            self.root_dir /
            str(job_id)
        )

    def package_dir(
        self,
        job_id: UUID,
    ) -> Path:
        return (
            self.job_dir(job_id) /
            "package"
        )

    def media_dir(
        self,
        job_id: UUID,
    ) -> Path:
        return (
            self.job_dir(job_id) /
            "media"
        )

    def metadata_dir(
        self,
        job_id: UUID,
    ) -> Path:
        return (
            self.job_dir(job_id) /
            "metadata"
        )

    def manifest_path(
        self,
        job_id: UUID,
    ) -> Path:
        return (
            self.metadata_dir(job_id) /
            "manifest.json"
        )

    def create_job(
        self,
        job_id: UUID,
    ) -> Path:
        self.ensure_root()

        job_dir = self.job_dir(
            job_id,
        )

        if job_dir.exists():
            raise ImportStorageError(
                f"Import staging job already exists: {job_id}"
            )

        self.package_dir(
            job_id,
        ).mkdir(
            parents=True,
            exist_ok=False,
        )

        self.media_dir(
            job_id,
        ).mkdir(
            parents=True,
            exist_ok=False,
        )

        self.metadata_dir(
            job_id,
        ).mkdir(
            parents=True,
            exist_ok=False,
        )

        return job_dir

    def delete_job(
        self,
        job_id: UUID,
    ) -> None:
        path = self.job_dir(
            job_id,
        )

        if path.exists():
            shutil.rmtree(
                path,
            )

    def save_json_package(
        self,
        *,
        job_id: UUID,
        source: BinaryIO,
        original_name: str,
        content_type: str | None,
    ) -> StoredImportFile:
        safe_name = self._safe_file_name(
            original_name,
        )

        if not safe_name.lower().endswith(
            ".json"
        ):
            raise ImportStorageError(
                "Import package must use .json extension."
            )

        destination = (
            self.package_dir(job_id) /
            "import.json"
        )

        return self._copy_stream(
            source=source,
            destination=destination,
            original_name=original_name,
            stored_name="import.json",
            relative_path="package/import.json",
            content_type=content_type,
        )

    def save_media_file(
        self,
        *,
        job_id: UUID,
        source: BinaryIO,
        original_name: str,
        relative_path: str | None,
        content_type: str | None,
    ) -> StoredImportFile:
        safe_relative_path = (
            self._safe_relative_path(
                relative_path
                or original_name
            )
        )

        destination = (
            self.media_dir(job_id) /
            safe_relative_path
        )

        destination.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        return self._copy_stream(
            source=source,
            destination=destination,
            original_name=original_name,
            stored_name=destination.name,
            relative_path=(
                Path("media") /
                safe_relative_path
            ).as_posix(),
            content_type=content_type,
        )

    def write_manifest(
        self,
        *,
        job_id: UUID,
        payload: dict,
    ) -> Path:
        path = self.manifest_path(
            job_id,
        )

        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temp_path = path.with_suffix(
            ".json.tmp"
        )

        temp_path.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
                default=str,
            )
            + "\n",
            encoding="utf-8",
        )

        temp_path.replace(
            path,
        )

        return path

    def read_manifest(
        self,
        job_id: UUID,
    ) -> dict:
        path = self.manifest_path(
            job_id,
        )

        if not path.is_file():
            raise ImportStorageError(
                f"Import manifest not found: {job_id}"
            )

        try:
            data = json.loads(
                path.read_text(
                    encoding="utf-8",
                )
            )
        except Exception as exc:
            raise ImportStorageError(
                f"Import manifest is invalid JSON: {job_id}"
            ) from exc

        if not isinstance(
            data,
            dict,
        ):
            raise ImportStorageError(
                f"Import manifest root must be an object: {job_id}"
            )

        return data

    def _copy_stream(
        self,
        *,
        source: BinaryIO,
        destination: Path,
        original_name: str,
        stored_name: str,
        relative_path: str,
        content_type: str | None,
    ) -> StoredImportFile:
        destination.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        sha256 = hashlib.sha256()
        size_bytes = 0

        try:
            with destination.open(
                "wb"
            ) as output:
                while True:
                    chunk = source.read(
                        1024 * 1024
                    )

                    if not chunk:
                        break

                    if not isinstance(
                        chunk,
                        (
                            bytes,
                            bytearray,
                        ),
                    ):
                        raise ImportStorageError(
                            "Upload stream returned non-byte data."
                        )

                    output.write(
                        chunk,
                    )

                    sha256.update(
                        chunk,
                    )

                    size_bytes += len(
                        chunk,
                    )
        except Exception:
            if destination.exists():
                destination.unlink()

            raise

        return StoredImportFile(
            original_name=original_name,
            stored_name=stored_name,
            relative_path=relative_path,
            content_type=content_type,
            size_bytes=size_bytes,
            sha256_hex=sha256.hexdigest(),
            absolute_path=destination,
        )

    @staticmethod
    def _safe_file_name(
        value: str,
    ) -> str:
        name = Path(
            value.replace(
                "\\",
                "/",
            )
        ).name.strip()

        if not name:
            raise ImportStorageError(
                "Empty file name is not allowed."
            )

        if name in {
            ".",
            "..",
        }:
            raise ImportStorageError(
                "Invalid file name."
            )

        return name

    @staticmethod
    def _safe_relative_path(
        value: str,
    ) -> Path:
        normalized = (
            value.replace(
                "\\",
                "/",
            )
            .strip()
            .lstrip("/")
        )

        if not normalized:
            raise ImportStorageError(
                "Empty relative path is not allowed."
            )

        parts = [
            part
            for part in normalized.split(
                "/"
            )
            if part not in {
                "",
                ".",
            }
        ]

        if not parts:
            raise ImportStorageError(
                "Invalid relative path."
            )

        if any(
            part == ".."
            for part in parts
        ):
            raise ImportStorageError(
                "Path traversal is not allowed."
            )

        if any(
            ":" in part
            for part in parts
        ):
            raise ImportStorageError(
                "Absolute or drive-qualified paths are not allowed."
            )

        return Path(
            *parts
        )
