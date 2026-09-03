from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.import_repository import (
    ImportRepository,
    ImportRepositoryError,
)
from app.imports.schemas import (
    ImportCommitResponse,
    ImportJobStatus,
)
from app.imports.storage import (
    ImportStagingStorage,
    ImportStorageError,
)


class ImportCommitServiceError(RuntimeError):
    pass


class ImportCommitNotAllowedError(
    ImportCommitServiceError
):
    pass


class ImportCommitService:
    def __init__(
        self,
        *,
        session: AsyncSession,
        storage: ImportStagingStorage,
    ) -> None:
        self.session = session
        self.storage = storage

    async def commit_job(
        self,
        job_id: UUID,
    ) -> ImportCommitResponse:
        manifest = self._read_manifest(
            job_id
        )

        current_status = (
            self._parse_status(
                manifest.get("status")
            )
        )

        if (
            current_status
            != ImportJobStatus.READY_FOR_REVIEW
        ):
            raise ImportCommitNotAllowedError(
                (
                    "Import job commit için "
                    "uygun durumda değil. "
                    f"Mevcut durum: "
                    f"{current_status.value}"
                )
            )

        package_path = (
            self.storage.package_dir(
                job_id
            )
            / "import.json"
        )

        if not package_path.is_file():
            raise ImportCommitServiceError(
                (
                    "Staging JSON paketi "
                    "bulunamadı: "
                    f"{package_path}"
                )
            )

        repository = ImportRepository(
            self.session
        )

        #
        # 1. DUPLICATE / IDEMPOTENCY ÖN KONTROLÜ
        #
        # Bu aşama sadece SELECT yapar.
        # Veritabanına hiçbir kayıt yazılmaz.
        #
        # Kontrol ayrı transaction içinde yapılır.
        # Böylece daha sonra gerçek import transaction'ı
        # temiz bir transaction sınırıyla başlar.
        #
        try:
            async with self.session.begin():
                duplicate_analysis = (
                    await repository
                    .analyze_package_duplicates_from_file(
                        package_path
                    )
                )

        except ImportRepositoryError as exc:
            raise ImportCommitServiceError(
                (
                    "Commit öncesi duplicate "
                    "analizi başarısız oldu."
                )
            ) from exc

        except Exception as exc:
            raise ImportCommitServiceError(
                (
                    "Commit öncesi veritabanı "
                    "kontrolü başarısız oldu."
                )
            ) from exc

        existing_rows = int(
            duplicate_analysis.get(
                "existing",
                0,
            )
        )

        uncheckable_rows = int(
            duplicate_analysis.get(
                "uncheckable",
                0,
            )
        )

        new_rows = int(
            duplicate_analysis.get(
                "new",
                0,
            )
        )

        total_rows = int(
            duplicate_analysis.get(
                "total",
                0,
            )
        )

        #
        # Mevcut PK tespit edilirse commit YASAK.
        #
        # Şu anki güvenli politika:
        #
        # - INSERT-only
        # - otomatik UPDATE yok
        # - otomatik overwrite yok
        # - otomatik skip yok
        #
        # Böylece var olan kültürel miras verisinin
        # yanlışlıkla ezilmesi mümkün olmaz.
        #
        if existing_rows > 0:
            raise ImportCommitNotAllowedError(
                (
                    "Duplicate kontrolü commit "
                    "işlemini engelledi. "
                    f"Toplam: {total_rows}, "
                    f"yeni: {new_rows}, "
                    f"mevcut: {existing_rows}, "
                    f"kontrol edilemeyen: "
                    f"{uncheckable_rows}. "
                    "Bu paket veritabanında "
                    "zaten bulunan primary key "
                    "değerleri içeriyor."
                )
            )

        #
        # PK'sı belirlenemeyen kayıt varsa da
        # körlemesine commit yapmıyoruz.
        #
        if uncheckable_rows > 0:
            raise ImportCommitNotAllowedError(
                (
                    "Duplicate kontrolü commit "
                    "işlemini engelledi. "
                    f"{uncheckable_rows} kayıt "
                    "primary key üzerinden "
                    "güvenli biçimde kontrol "
                    "edilemedi."
                )
            )

        #
        # Analiz sonucundaki toplam kayıt sayısı
        # tutarlı olmalı.
        #
        if (
            total_rows > 0
            and new_rows != total_rows
        ):
            raise ImportCommitNotAllowedError(
                (
                    "Duplicate analiz sonucu "
                    "tutarsız. "
                    f"Toplam: {total_rows}, "
                    f"yeni: {new_rows}, "
                    f"mevcut: {existing_rows}, "
                    f"kontrol edilemeyen: "
                    f"{uncheckable_rows}."
                )
            )

        #
        # 2. COMMITTING DURUMUNA GEÇ
        #
        committing_at = datetime.now(
            UTC
        )

        self._update_manifest_status(
            manifest=manifest,
            status=(
                ImportJobStatus.COMMITTING
            ),
            updated_at=committing_at,
        )

        manifest[
            "duplicate_analysis"
        ] = duplicate_analysis

        self.storage.write_manifest(
            job_id=job_id,
            payload=manifest,
        )

        #
        # 3. GERÇEK VERİTABANI IMPORT TRANSACTION'I
        #
        inserted_counts: dict[
            str,
            int,
        ] = {}

        try:
            #
            # Duplicate analizinden sonra
            # repository cache'lerini temiz bir
            # instance ile başlatıyoruz.
            #
            repository = ImportRepository(
                self.session
            )

            async with self.session.begin():
                inserted_counts = (
                    await repository
                    .import_package_from_file(
                        package_path
                    )
                )

        except Exception as exc:
            await self.session.rollback()

            failed_at = datetime.now(
                UTC
            )

            self._update_manifest_status(
                manifest=manifest,
                status=(
                    ImportJobStatus.FAILED
                ),
                updated_at=failed_at,
            )

            manifest[
                "commit_error"
            ] = str(exc)[:4000]

            self.storage.write_manifest(
                job_id=job_id,
                payload=manifest,
            )

            raise ImportCommitServiceError(
                (
                    "Import transaction "
                    "başarısız oldu ve rollback "
                    "uygulandı."
                )
            ) from exc

        #
        # 4. BAŞARILI COMMIT
        #
        committed_at = datetime.now(
            UTC
        )

        inserted_rows = sum(
            inserted_counts.values()
        )

        self._update_manifest_status(
            manifest=manifest,
            status=(
                ImportJobStatus.COMMITTED
            ),
            updated_at=committed_at,
        )

        manifest[
            "committed_at"
        ] = committed_at.isoformat()

        manifest[
            "commit_summary"
        ] = {
            "inserted_rows":
                inserted_rows,
            "updated_rows":
                0,
            "skipped_rows":
                0,
            "tables":
                inserted_counts,
        }

        manifest.pop(
            "commit_error",
            None,
        )

        self.storage.write_manifest(
            job_id=job_id,
            payload=manifest,
        )

        return ImportCommitResponse(
            job_id=job_id,
            status=(
                ImportJobStatus.COMMITTED
            ),
            committed_at=committed_at,
            inserted_rows=inserted_rows,
            updated_rows=0,
            skipped_rows=0,
            message=(
                "Import job başarıyla "
                "PostgreSQL'e commit edildi."
            ),
        )

    def _read_manifest(
        self,
        job_id: UUID,
    ) -> dict:
        try:
            return (
                self.storage.read_manifest(
                    job_id
                )
            )

        except ImportStorageError as exc:
            raise ImportCommitServiceError(
                (
                    "Import job bulunamadı: "
                    f"{job_id}"
                )
            ) from exc

    @staticmethod
    def _parse_status(
        raw_status: object,
    ) -> ImportJobStatus:
        try:
            return ImportJobStatus(
                str(raw_status)
            )

        except Exception as exc:
            raise ImportCommitServiceError(
                (
                    "Import manifest içinde "
                    "geçersiz status değeri var: "
                    f"{raw_status!r}"
                )
            ) from exc

    @staticmethod
    def _update_manifest_status(
        *,
        manifest: dict,
        status: ImportJobStatus,
        updated_at: datetime,
    ) -> None:
        manifest[
            "status"
        ] = status.value

        manifest[
            "updated_at"
        ] = updated_at.isoformat()
