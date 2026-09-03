from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.import_repository import (
    ImportRepository,
    ImportRepositoryError,
)
from app.db.session import get_db_session

from .commit_service import (
    ImportCommitNotAllowedError,
    ImportCommitService,
    ImportCommitServiceError,
)
from .schemas import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportImageMode,
    ImportJobCreateResponse,
    ImportJobStatus,
)
from .service import (
    ImportJobNotFoundError,
    ImportJobService,
    MediaUploadInput,
)
from .storage import (
    ImportStagingStorage,
    ImportStorageError,
)


router = APIRouter(
    prefix="/api/editor/imports",
    tags=["editor-imports"],
)


def get_import_storage() -> ImportStagingStorage:
    storage_root = (
        Path.cwd()
        / "storage"
        / "imports"
    )

    return ImportStagingStorage(
        storage_root
    )


def get_import_service() -> ImportJobService:
    return ImportJobService(
        get_import_storage()
    )


@router.post(
    "",
    response_model=ImportJobCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_import_job(
    json_file: UploadFile = File(...),
    image_mode: ImportImageMode = Form(
        ImportImageMode.NONE
    ),
    source_name: str | None = Form(
        default=None
    ),
    images_zip_file: UploadFile | None = File(
        default=None
    ),
    image_files: list[UploadFile] | None = File(
        default=None
    ),
    image_relative_paths: list[str] | None = Form(
        default=None
    ),
) -> ImportJobCreateResponse:
    service = get_import_service()

    if not json_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JSON dosya adı bulunamadı.",
        )

    try:
        await json_file.seek(0)

        zip_stream = None
        zip_file_name = None
        zip_content_type = None

        if images_zip_file is not None:
            if not images_zip_file.filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ZIP dosya adı bulunamadı.",
                )

            await images_zip_file.seek(0)

            zip_stream = (
                images_zip_file.file
            )

            zip_file_name = (
                images_zip_file.filename
            )

            zip_content_type = (
                images_zip_file.content_type
            )

        folder_uploads: list[
            MediaUploadInput
        ] = []

        valid_image_files = image_files or []

        incoming_paths = (
            image_relative_paths or []
        )

        for index, upload in enumerate(
            valid_image_files
        ):
            if not upload.filename:
                continue

            await upload.seek(0)

            relative_path = (
                incoming_paths[index]
                if (
                    index < len(
                        incoming_paths
                    )
                    and incoming_paths[index]
                    and incoming_paths[index]
                    != "string"
                )
                else upload.filename
            )

            folder_uploads.append(
                MediaUploadInput(
                    stream=upload.file,
                    file_name=upload.filename,
                    relative_path=relative_path,
                    content_type=upload.content_type,
                )
            )

        return service.create_job(
            json_stream=json_file.file,
            json_file_name=json_file.filename,
            json_content_type=json_file.content_type,
            image_mode=image_mode,
            source_name=source_name,
            images_zip_stream=zip_stream,
            images_zip_file_name=zip_file_name,
            images_zip_content_type=zip_content_type,
            folder_files=folder_uploads,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{job_id}",
    response_model=ImportJobCreateResponse,
)
async def get_import_job(
    job_id: UUID,
) -> ImportJobCreateResponse:
    service = get_import_service()

    try:
        return service.get_job(
            job_id
        )

    except ImportJobNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/{job_id}/duplicate-analysis",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
)
async def analyze_import_job_duplicates(
    job_id: UUID,
    db_session: AsyncSession = Depends(
        get_db_session
    ),
) -> dict[str, Any]:
    storage = get_import_storage()

    try:
        manifest = storage.read_manifest(
            job_id
        )

    except ImportStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Import staging job bulunamadı: "
                f"{job_id}"
            ),
        ) from exc

    package_path = (
        storage.package_dir(job_id)
        / "import.json"
    )

    if not package_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Import staging JSON paketi "
                "bulunamadı."
            ),
        )

    repository = ImportRepository(
        db_session
    )

    try:
        analysis = (
            await repository
            .analyze_package_duplicates_from_file(
                package_path
            )
        )

    except ImportRepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return {
        "job_id": str(job_id),
        "job_status": manifest.get(
            "status"
        ),
        "source_name": manifest.get(
            "source_name"
        ),
        "analysis": analysis,
    }


@router.post(
    "/{job_id}/commit",
    response_model=ImportCommitResponse,
    status_code=status.HTTP_200_OK,
)
async def commit_import_job(
    job_id: UUID,
    request: ImportCommitRequest,
    db_session: AsyncSession = Depends(
        get_db_session
    ),
) -> ImportCommitResponse:
    if not request.confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Commit işlemi için "
                "confirmation=true gönderilmelidir."
            ),
        )

    if (
        request.expected_status
        != ImportJobStatus.READY_FOR_REVIEW
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Commit için expected_status "
                "'ready_for_review' olmalıdır."
            ),
        )

    service = ImportCommitService(
        session=db_session,
        storage=get_import_storage(),
    )

    try:
        return await service.commit_job(
            job_id
        )

    except ImportCommitNotAllowedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except ImportCommitServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
