"use client";

// MIRASEXPLORER_IMPORT_PAGE_VERSION: DUPLICATE_PREFLIGHT_V4


import {
    useState,
} from "react";

import { ImportUploadPanel } from "@/components/editor/ImportUploadPanel";

import {
    DEFAULT_IMPORT_PROGRESS_STATE,
    formatImportFileSize,
    getImportFilesTotalSize,
    type ImportProgressState,
    type ImportUploadRequest,
    type ImportValidationResult,
} from "@/lib/import/importTypes";

import {
    parseImportJsonFile,
} from "@/lib/import/parseImportJson";

import {
    matchImportMedia,
} from "@/lib/import/matchImportMedia";

type LastUploadState = {
    jsonFileName: string;

    imageMode:
    | "none"
    | "zip"
    | "folder";

    imageSourceName: string | null;

    imageFileCount: number;

    imageTotalSize: number;

    sourceName: string | null;

    backendJobId: string | null;

    backendStatus: string | null;
};


type BackendImportIssue = {
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
    table_name?: string | null;
    row_index?: number | null;
    record_id?: string | null;
    field_name?: string | null;
    file_name?: string | null;
    detail?: string | null;
};

type BackendImportResponse = {
    job_id: string;
    status:
    | "received"
    | "validating"
    | "ready_for_review"
    | "warning"
    | "rejected"
    | "committing"
    | "committed"
    | "failed";
    source_name: string | null;
    image_mode: "none" | "zip" | "folder";
    image_files: Array<{
        original_name: string;
        stored_name: string;
        relative_path?: string | null;
        content_type?: string | null;
        size_bytes: number;
        sha256_hex?: string | null;
    }>;
    validation: {
        format?: string | null;
        format_version?: string | null;
        target_schema?: string | null;
        total_rows: number;
        heritage_asset_count: number;
        person_count: number;
        organization_count: number;
        media_asset_count: number;
        media: {
            referenced: number;
            supplied: number;
            matched: number;
            missing: number;
            unused: number;
            duplicate: number;
        };
        error_count: number;
        warning_count: number;
        can_commit: boolean;
    } | null;
    issues: BackendImportIssue[];
};

type BackendImportCommitResponse = {
    job_id: string;
    status: "committed";
    committed_at: string;
    inserted_rows: number;
    updated_rows: number;
    skipped_rows: number;
    message: string;
};

type BackendDuplicateAnalysisResponse = {
    job_id: string;
    job_status: string | null;
    source_name: string | null;
    analysis: {
        new: number;
        existing: number;
        uncheckable: number;
        total: number;
        tables: Record<
            string,
            {
                new: number;
                existing: number;
                uncheckable: number;
                total: number;
            }
        >;
    };
};

type DuplicateBlockedState = {
    detail: string;
    totalRows: number | null;
    newRows: number | null;
    existingRows: number | null;
    uncheckableRows: number | null;
};

const IMPORT_API_URL =
    process.env.NEXT_PUBLIC_IMPORT_API_URL ??
    "http://127.0.0.1:8000/api/editor/imports";

export default function EditorImportPage() {
    const [
        progress,
        setProgress,
    ] = useState<ImportProgressState>(
        DEFAULT_IMPORT_PROGRESS_STATE,
    );

    const [
        validationResult,
        setValidationResult,
    ] =
        useState<ImportValidationResult | null>(
            null,
        );

    const [
        lastUpload,
        setLastUpload,
    ] =
        useState<LastUploadState | null>(
            null,
        );

    const [
        isCommitting,
        setIsCommitting,
    ] = useState(false);

    const [
        commitResult,
        setCommitResult,
    ] =
        useState<BackendImportCommitResponse | null>(
            null,
        );

    const [
        duplicateBlocked,
        setDuplicateBlocked,
    ] =
        useState<DuplicateBlockedState | null>(
            null,
        );

    const [
        duplicateAnalysis,
        setDuplicateAnalysis,
    ] =
        useState<BackendDuplicateAnalysisResponse | null>(
            null,
        );

    const isSubmitting =
        progress.status ===
        "uploading" ||
        progress.status ===
        "validating";

    async function handleSubmit(
        payload: ImportUploadRequest,
    ) {
        setValidationResult(
            null,
        );

        setCommitResult(
            null,
        );

        setDuplicateBlocked(
            null,
        );

        setDuplicateAnalysis(
            null,
        );

        setIsCommitting(
            false,
        );

        const folderFiles =
            payload.imageFolderFiles ??
            [];

        const imageSourceName =
            payload.imageInputMode ===
                "zip"
                ? payload.imagesZipFile
                    ?.name ??
                null
                : payload.imageInputMode ===
                    "folder"
                    ? payload.imageFolderName ??
                    "Görsel klasörü"
                    : null;

        const initialImageFileCount =
            payload.imageInputMode ===
                "folder"
                ? folderFiles.length
                : payload.imageInputMode ===
                    "zip" &&
                    payload.imagesZipFile
                    ? 1
                    : 0;

        const imageTotalSize =
            payload.imageInputMode ===
                "folder"
                ? getImportFilesTotalSize(
                    folderFiles,
                )
                : payload.imageInputMode ===
                    "zip" &&
                    payload.imagesZipFile
                    ? payload.imagesZipFile
                        .size
                    : 0;

        setLastUpload({
            jsonFileName:
                payload.jsonFile.name,

            imageMode:
                payload.imageInputMode,

            imageSourceName,

            imageFileCount:
                initialImageFileCount,

            imageTotalSize,

            sourceName:
                payload.sourceName ??
                null,

            backendJobId:
                null,

            backendStatus:
                null,
        });

        setProgress({
            status:
                "uploading",

            progress: 10,

            message:
                "Dosyalar yerel doğrulama için hazırlanıyor.",

            currentStep:
                "Dosya hazırlığı",
        });

        try {
            setProgress({
                status:
                    "validating",

                progress: 25,

                message:
                    "JSON paketi ve veritabanı uyumlu kayıt yapısı tarayıcı tarafında doğrulanıyor.",

                currentStep:
                    "Yerel JSON doğrulama",
            });

            const jsonResult =
                await parseImportJsonFile(
                    payload.jsonFile,
                );

            if (
                jsonResult.status ===
                "error"
            ) {
                setValidationResult(
                    jsonResult,
                );

                setProgress({
                    status:
                        "error",

                    progress: 100,

                    message:
                        "JSON doğrulaması tamamlandı ancak aktarımı engelleyen hatalar bulundu.",

                    currentStep:
                        "Yerel doğrulama sonucu",
                });

                return;
            }

            setProgress({
                status:
                    "validating",

                progress: 45,

                message:
                    payload.imageInputMode ===
                        "none"
                        ? "JSON içindeki medya referansları değerlendiriliyor."
                        : payload.imageInputMode ===
                            "zip"
                            ? "ZIP içindeki görseller JSON storage_uri kayıtlarıyla yerel olarak eşleştiriliyor."
                            : "Seçilen klasördeki görseller JSON storage_uri kayıtlarıyla yerel olarak eşleştiriliyor.",

                currentStep:
                    "Yerel görsel eşleştirme",
            });

            const mediaResult =
                await matchImportMedia({
                    validationResult:
                        jsonResult,

                    upload:
                        payload,
                });

            const combinedIssues = [
                ...jsonResult.issues,
                ...mediaResult.issues,
            ];

            const hasLocalErrors =
                combinedIssues.some(
                    (issue) =>
                        issue.severity ===
                        "error",
                );

            const hasLocalWarnings =
                combinedIssues.some(
                    (issue) =>
                        issue.severity ===
                        "warning",
                );

            const localResult:
                ImportValidationResult = {
                ...jsonResult,

                status:
                    hasLocalErrors
                        ? "error"
                        : hasLocalWarnings
                            ? "warning"
                            : "ready",

                issues:
                    combinedIssues,

                assets:
                    mediaResult.assets,

                summary: {
                    ...jsonResult.summary,

                    matchedImages:
                        mediaResult.matchedImages,

                    missingImages:
                        mediaResult.missingImages,

                    unusedImages:
                        mediaResult.unusedImages,

                    canCommit:
                        jsonResult.summary
                            .canCommit &&
                        !hasLocalErrors,
                },
            };

            setValidationResult(
                localResult,
            );

            setLastUpload(
                (current) =>
                    current
                        ? {
                            ...current,

                            imageFileCount:
                                payload.imageInputMode ===
                                    "none"
                                    ? 0
                                    : mediaResult.selectedImageFileCount,
                        }
                        : current,
            );

            if (hasLocalErrors) {
                setProgress({
                    status:
                        "error",

                    progress: 100,

                    message:
                        "Yerel doğrulamada aktarımı engelleyen hata bulundu. Backend staging işlemi başlatılmadı.",

                    currentStep:
                        "Yerel doğrulama sonucu",
                });

                return;
            }

            setProgress({
                status:
                    "uploading",

                progress: 65,

                message:
                    "Doğrulanan JSON ve görseller güvenli staging için backend servisine gönderiliyor.",

                currentStep:
                    "Backend staging",
            });

            const formData =
                new FormData();

            formData.append(
                "json_file",
                payload.jsonFile,
                payload.jsonFile.name,
            );

            formData.append(
                "image_mode",
                payload.imageInputMode,
            );

            if (
                payload.sourceName
                    ?.trim()
            ) {
                formData.append(
                    "source_name",
                    payload.sourceName.trim(),
                );
            }

            if (
                payload.imageInputMode ===
                "zip" &&
                payload.imagesZipFile
            ) {
                formData.append(
                    "images_zip_file",
                    payload.imagesZipFile,
                    payload.imagesZipFile.name,
                );
            }

            if (
                payload.imageInputMode ===
                "folder"
            ) {
                for (
                    const file
                    of folderFiles
                ) {
                    formData.append(
                        "image_files",
                        file,
                        file.name,
                    );

                    formData.append(
                        "image_relative_paths",
                        file.webkitRelativePath ||
                        file.name,
                    );
                }
            }

            const response =
                await fetch(
                    IMPORT_API_URL,
                    {
                        method:
                            "POST",

                        body:
                            formData,
                    },
                );

            const rawResponse =
                await response.json()
                    .catch(
                        () => null,
                    );

            if (!response.ok) {
                const detail =
                    rawResponse &&
                        typeof rawResponse ===
                        "object" &&
                        "detail" in rawResponse
                        ? String(
                            rawResponse.detail,
                        )
                        : `Backend HTTP ${response.status}`;

                throw new Error(
                    detail,
                );
            }

            const backendResult =
                rawResponse as
                BackendImportResponse;

            if (
                !backendResult ||
                typeof backendResult.job_id !==
                "string"
            ) {
                throw new Error(
                    "Backend geçerli bir import job yanıtı döndürmedi.",
                );
            }

            const backendValidation =
                backendResult.validation;

            if (!backendValidation) {
                throw new Error(
                    "Backend doğrulama özeti bulunamadı.",
                );
            }

            const backendHasErrors =
                backendValidation.error_count >
                0 ||
                backendResult.status ===
                "rejected" ||
                backendResult.status ===
                "failed";

            const backendHasWarnings =
                backendValidation.warning_count >
                0 ||
                backendResult.status ===
                "warning";

            const finalResult:
                ImportValidationResult = {
                ...localResult,

                status:
                    backendHasErrors
                        ? "error"
                        : backendHasWarnings
                            ? "warning"
                            : "ready",

                summary: {
                    ...localResult.summary,

                    matchedImages:
                        backendValidation
                            .media
                            .matched,

                    missingImages:
                        backendValidation
                            .media
                            .missing,

                    unusedImages:
                        backendValidation
                            .media
                            .unused,

                    canCommit:
                        backendValidation
                            .can_commit &&
                        !backendHasErrors,
                },
            };

            setValidationResult(
                finalResult,
            );

            setLastUpload(
                (current) =>
                    current
                        ? {
                            ...current,

                            imageFileCount:
                                backendValidation
                                    .media
                                    .supplied,

                            backendJobId:
                                backendResult
                                    .job_id,

                            backendStatus:
                                backendResult
                                    .status,
                        }
                        : current,
            );

            if (backendHasErrors) {
                setProgress({
                    status:
                        "error",

                    progress: 100,

                    message:
                        `Backend staging doğrulaması başarısız. ${backendValidation.error_count} hata bulundu.`,

                    currentStep:
                        "Backend doğrulama sonucu",
                });

                return;
            }

            if (backendHasWarnings) {
                setProgress({
                    status:
                        "warning",

                    progress: 100,

                    message:
                        `Backend staging tamamlandı. ${backendValidation.warning_count} uyarı bulundu. Job: ${backendResult.job_id}`,

                    currentStep:
                        "İnceleme bekliyor",
                });

                return;
            }

            setProgress({
                status:
                    "validating",

                progress: 92,

                message:
                    "Staging doğrulandı. Veritabanında aynı primary key değerlerinin bulunup bulunmadığı kontrol ediliyor.",

                currentStep:
                    "DB duplicate ön kontrolü",
            });

            const duplicateResponse =
                await fetch(
                    `${IMPORT_API_URL}/${backendResult.job_id}/duplicate-analysis`,
                    {
                        method: "GET",
                    },
                );

            const duplicateBody: unknown =
                await duplicateResponse.json()
                    .catch(
                        () => null,
                    );

            if (!duplicateResponse.ok) {
                let detail =
                    `Duplicate analiz HTTP ${duplicateResponse.status}`;

                if (
                    duplicateBody &&
                    typeof duplicateBody ===
                    "object" &&
                    "detail" in duplicateBody
                ) {
                    detail = String(
                        (duplicateBody as {
                            detail?: unknown;
                        }).detail,
                    );
                }

                throw new Error(
                    detail,
                );
            }

            const duplicateResult =
                duplicateBody as BackendDuplicateAnalysisResponse;

            if (
                !duplicateResult ||
                !duplicateResult.analysis ||
                typeof duplicateResult.analysis.total !==
                "number"
            ) {
                throw new Error(
                    "Backend geçerli bir duplicate analiz yanıtı döndürmedi.",
                );
            }

            setDuplicateAnalysis(
                duplicateResult,
            );

            const dbAnalysis =
                duplicateResult.analysis;

            const duplicateBlockedBeforeCommit =
                dbAnalysis.existing > 0 ||
                dbAnalysis.uncheckable > 0 ||
                dbAnalysis.new !== dbAnalysis.total;

            if (duplicateBlockedBeforeCommit) {
                setDuplicateBlocked({
                    detail:
                        "Commit öncesi veritabanı duplicate kontrolü aktarımı engelledi.",
                    totalRows:
                        dbAnalysis.total,
                    newRows:
                        dbAnalysis.new,
                    existingRows:
                        dbAnalysis.existing,
                    uncheckableRows:
                        dbAnalysis.uncheckable,
                });

                setValidationResult(
                    (current) =>
                        current
                            ? {
                                ...current,
                                status: "warning",
                                summary: {
                                    ...current.summary,
                                    canCommit: false,
                                },
                            }
                            : current,
                );

                setLastUpload(
                    (current) =>
                        current
                            ? {
                                ...current,
                                backendStatus:
                                    "duplicate_blocked",
                            }
                            : current,
                );

                setProgress({
                    status: "warning",
                    progress: 100,
                    message:
                        `Commit öncesi DB kontrolü aktarımı engelledi. Yeni: ${dbAnalysis.new}, mevcut: ${dbAnalysis.existing}, kontrol edilemeyen: ${dbAnalysis.uncheckable}. Veritabanında değişiklik yapılmadı.`,
                    currentStep:
                        "DUPLICATE_BLOCKED",
                });

                return;
            }

            setProgress({
                status:
                    "ready",

                progress: 100,

                message:
                    payload.imageInputMode ===
                        "none"
                        ? `JSON backend staging alanına alındı. Job: ${backendResult.job_id}`
                        : `Backend doğrulaması tamamlandı. ${backendValidation.media.matched} / ${backendValidation.media.referenced} görsel eşleşti. Job: ${backendResult.job_id}`,

                currentStep:
                    "READY_FOR_REVIEW",
            });
        } catch (error) {
            console.error(
                "Import validation/staging failed:",
                error,
            );

            setProgress({
                status:
                    "error",

                progress: 100,

                message:
                    error instanceof Error
                        ? `Backend aktarım hatası: ${error.message}`
                        : "Dosyalar işlenirken beklenmeyen bir hata oluştu.",

                currentStep:
                    "Aktarım hatası",
            });
        }
    }

    async function handleCommit() {
        const jobId =
            lastUpload?.backendJobId;

        const canCommit =
            Boolean(jobId) &&
            lastUpload?.backendStatus ===
            "ready_for_review" &&
            validationResult?.summary
                .canCommit === true &&
            !isCommitting;

        if (!canCommit || !jobId) {
            return;
        }

        const confirmed =
            window.confirm(
                `Bu staging job doğrulandı. ${validationResult?.summary.totalRecords ?? 0} kayıt PostgreSQL veritabanına tek transaction içinde aktarılacak. Devam etmek istiyor musunuz?`,
            );

        if (!confirmed) {
            return;
        }

        setIsCommitting(
            true,
        );

        setCommitResult(
            null,
        );

        setDuplicateBlocked(
            null,
        );

        setProgress({
            status: "uploading",
            progress: 100,
            message:
                "Doğrulanmış staging job PostgreSQL veritabanına aktarılıyor.",
            currentStep:
                "COMMITTING",
        });

        try {
            const response =
                await fetch(
                    `${IMPORT_API_URL}/${jobId}/commit`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            expected_status:
                                "ready_for_review",
                            confirmation: true,
                        }),
                    },
                );

            const responseBody: unknown =
                await response.json();

            if (!response.ok) {
                let detail =
                    `HTTP ${response.status}`;

                if (
                    responseBody &&
                    typeof responseBody ===
                    "object" &&
                    "detail" in responseBody &&
                    typeof (
                        responseBody as {
                            detail?: unknown;
                        }
                    ).detail === "string"
                ) {
                    detail = (
                        responseBody as {
                            detail: string;
                        }
                    ).detail;
                }

                if (response.status === 409) {
                    const countsMatch =
                        detail.match(
                            /Toplam:\s*(\d+),\s*yeni:\s*(\d+),\s*mevcut:\s*(\d+),\s*kontrol edilemeyen:\s*(\d+)/i,
                        );

                    const duplicateState: DuplicateBlockedState = {
                        detail,
                        totalRows: countsMatch
                            ? Number(countsMatch[1])
                            : null,
                        newRows: countsMatch
                            ? Number(countsMatch[2])
                            : null,
                        existingRows: countsMatch
                            ? Number(countsMatch[3])
                            : null,
                        uncheckableRows: countsMatch
                            ? Number(countsMatch[4])
                            : null,
                    };

                    setDuplicateBlocked(
                        duplicateState,
                    );

                    setValidationResult(
                        (current) =>
                            current
                                ? {
                                    ...current,
                                    status: "warning",
                                    summary: {
                                        ...current.summary,
                                        canCommit: false,
                                    },
                                }
                                : current,
                    );

                    setLastUpload(
                        (current) =>
                            current
                                ? {
                                    ...current,
                                    backendStatus:
                                        "duplicate_blocked",
                                }
                                : current,
                    );

                    setProgress({
                        status: "warning",
                        progress: 100,
                        message:
                            duplicateState.existingRows !== null
                                ? `Duplicate paket engellendi. ${duplicateState.existingRows} veritabanı satırı zaten mevcut; veritabanında değişiklik yapılmadı.`
                                : "Duplicate paket engellendi. Veritabanında değişiklik yapılmadı.",
                        currentStep:
                            "DUPLICATE_BLOCKED",
                    });

                    return;
                }

                throw new Error(
                    detail,
                );
            }

            const committed =
                responseBody as BackendImportCommitResponse;

            setCommitResult(
                committed,
            );

            setLastUpload(
                (current) =>
                    current
                        ? {
                            ...current,
                            backendStatus:
                                committed.status,
                        }
                        : current,
            );

            setProgress({
                status: "ready",
                progress: 100,
                message:
                    `${committed.inserted_rows} kayıt PostgreSQL veritabanına başarıyla commit edildi.`,
                currentStep:
                    "COMMITTED",
            });
        } catch (error) {
            console.warn(
                "Import commit failed:",
                error,
            );

            setProgress({
                status: "error",
                progress: 100,
                message:
                    error instanceof Error
                        ? `Commit hatası: ${error.message}`
                        : "Veritabanına aktarım sırasında beklenmeyen bir hata oluştu.",
                currentStep:
                    "COMMIT_FAILED",
            });
        } finally {
            setIsCommitting(
                false,
            );
        }
    }

    const canCommitCurrentJob =
        Boolean(
            lastUpload?.backendJobId,
        ) &&
        lastUpload?.backendStatus ===
        "ready_for_review" &&
        validationResult?.summary
            .canCommit === true &&
        duplicateAnalysis !== null &&
        duplicateAnalysis.analysis.existing ===
        0 &&
        duplicateAnalysis.analysis.uncheckable ===
        0 &&
        duplicateAnalysis.analysis.new ===
        duplicateAnalysis.analysis.total &&
        !isCommitting;

    return (
        <div className="editor-import-page">
            <section className="editor-import-hero">
                <div className="miras-container">
                    <div className="editor-import-hero__grid">
                        <div>
                            <p className="miras-eyebrow">
                                Editör Alanı
                            </p>

                            <h1 className="editor-import-hero__title">
                                Yeni koleksiyon
                                <span>
                                    {" "}
                                    verisi aktarın.
                                </span>
                            </h1>

                            <p className="editor-import-hero__description">
                                Veritabanı uyumlu
                                JSON paketlerinizi
                                ve ilişkili
                                görsellerinizi
                                kontrollü biçimde
                                sisteme alın.
                                Görseller ZIP,
                                normal klasör veya
                                görselsiz olarak
                                işlenebilir.
                            </p>
                        </div>

                        <div className="editor-import-hero__workflow">
                            <WorkflowStep
                                number="01"
                                label="Dosyaları seç"
                                active
                            />

                            <WorkflowStep
                                number="02"
                                label="Doğrula"
                                active={
                                    progress.status !==
                                    "idle"
                                }
                            />

                            <WorkflowStep
                                number="03"
                                label="Önizle"
                                active={
                                    validationResult !==
                                    null &&
                                    validationResult
                                        .summary
                                        .totalRecords >
                                    0
                                }
                            />

                            <WorkflowStep
                                number="04"
                                label="Onayla"
                                active={
                                    lastUpload?.backendStatus ===
                                    "ready_for_review" ||
                                    lastUpload?.backendStatus ===
                                    "committed"
                                }
                            />

                            <WorkflowStep
                                number="05"
                                label="Yayınla"
                                active={
                                    lastUpload?.backendStatus ===
                                    "committed"
                                }
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="editor-import-content">
                <div className="miras-container editor-import-content__grid">
                    <main>
                        <ImportUploadPanel
                            onSubmit={
                                handleSubmit
                            }
                            isSubmitting={
                                isSubmitting ||
                                isCommitting
                            }
                        />

                        {validationResult ? (
                            <ValidationSummary
                                result={
                                    validationResult
                                }
                            />
                        ) : null}
                    </main>

                    <aside className="editor-import-sidebar">
                        <section className="editor-import-status-card">
                            <div className="editor-import-status-card__header">
                                <p className="miras-eyebrow">
                                    Aktarım Durumu
                                </p>

                                <StatusBadge
                                    status={
                                        progress.status
                                    }
                                />
                            </div>

                            <div className="editor-import-progress">
                                <div className="editor-import-progress__track">
                                    <span
                                        style={{
                                            width: `${progress.progress}%`,
                                        }}
                                    />
                                </div>

                                <div className="editor-import-progress__meta">
                                    <strong>
                                        {
                                            progress.progress
                                        }
                                        %
                                    </strong>

                                    <span>
                                        {
                                            progress.currentStep ??
                                            "Bekleniyor"
                                        }
                                    </span>
                                </div>
                            </div>

                            <p className="editor-import-status-card__message">
                                {
                                    progress.message
                                }
                            </p>
                        </section>

                        {validationResult ? (
                            <section className="editor-import-status-card">
                                <div className="editor-import-status-card__header">
                                    <p className="miras-eyebrow">
                                        Doğrulama Özeti
                                    </p>

                                    <StatusBadge
                                        status={
                                            validationResult
                                                .status
                                        }
                                    />
                                </div>

                                <dl className="editor-import-last-upload__summary">
                                    <SummaryRow
                                        label="Toplam kayıt"
                                        value={
                                            validationResult
                                                .summary
                                                .totalRecords
                                        }
                                    />

                                    <SummaryRow
                                        label="Geçerli"
                                        value={
                                            validationResult
                                                .summary
                                                .validRecords
                                        }
                                    />

                                    <SummaryRow
                                        label="Uyarılı"
                                        value={
                                            validationResult
                                                .summary
                                                .warningRecords
                                        }
                                    />

                                    <SummaryRow
                                        label="Hatalı"
                                        value={
                                            validationResult
                                                .summary
                                                .errorRecords
                                        }
                                    />

                                    <SummaryRow
                                        label="Duplicate"
                                        value={
                                            validationResult
                                                .summary
                                                .duplicateRecords
                                        }
                                    />

                                    <SummaryRow
                                        label="Görsel referansı"
                                        value={
                                            validationResult
                                                .summary
                                                .referencedImages
                                        }
                                    />

                                    <SummaryRow
                                        label="Eşleşen görsel"
                                        value={
                                            validationResult
                                                .summary
                                                .matchedImages
                                        }
                                    />

                                    <SummaryRow
                                        label="Eksik görsel"
                                        value={
                                            validationResult
                                                .summary
                                                .missingImages
                                        }
                                    />

                                    <SummaryRow
                                        label="Kullanılmayan"
                                        value={
                                            validationResult
                                                .summary
                                                .unusedImages
                                        }
                                    />
                                </dl>
                            </section>
                        ) : null}

                        {lastUpload?.backendJobId ? (
                            <section className="editor-import-status-card">
                                <div className="editor-import-status-card__header">
                                    <p className="miras-eyebrow">
                                        Veritabanı Onayı
                                    </p>

                                    <StatusBadge
                                        status={
                                            lastUpload.backendStatus ===
                                                "committed"
                                                ? "ready"
                                                : canCommitCurrentJob
                                                    ? "ready"
                                                    : progress.status
                                        }
                                    />
                                </div>

                                <p className="editor-import-status-card__message">
                                    {lastUpload.backendStatus ===
                                        "committed"
                                        ? "Bu staging job PostgreSQL veritabanına başarıyla aktarıldı."
                                        : lastUpload.backendStatus ===
                                            "duplicate_blocked"
                                            ? "Duplicate paket engellendi. Bu paketteki veritabanı satırları daha önce aktarılmış görünüyor; güvenlik nedeniyle ikinci kez commit edilmedi ve veritabanında hiçbir değişiklik yapılmadı."
                                            : canCommitCurrentJob
                                                ? "Doğrulama ve veritabanı duplicate ön kontrolü tamamlandı. Paketteki tüm DB satırları yeni; job güvenli şekilde commit edilebilir."
                                                : "Commit için job durumunun ready_for_review ve doğrulama sonucunun canCommit=true olması gerekir."}
                                </p>

                                {duplicateAnalysis &&
                                    !duplicateBlocked ? (
                                    <dl className="editor-import-last-upload__summary">
                                        <SummaryRow
                                            label="Toplam DB satırı"
                                            value={
                                                duplicateAnalysis.analysis.total
                                            }
                                        />
                                        <SummaryRow
                                            label="Yeni DB satırı"
                                            value={
                                                duplicateAnalysis.analysis.new
                                            }
                                        />
                                        <SummaryRow
                                            label="Zaten mevcut"
                                            value={
                                                duplicateAnalysis.analysis.existing
                                            }
                                        />
                                        <SummaryRow
                                            label="Kontrol edilemeyen"
                                            value={
                                                duplicateAnalysis.analysis.uncheckable
                                            }
                                        />
                                    </dl>
                                ) : null}

                                {duplicateBlocked ? (
                                    <dl className="editor-import-last-upload__summary">
                                        {duplicateBlocked.totalRows !== null ? (
                                            <SummaryRow
                                                label="Toplam DB satırı"
                                                value={
                                                    duplicateBlocked.totalRows
                                                }
                                            />
                                        ) : null}

                                        {duplicateBlocked.newRows !== null ? (
                                            <SummaryRow
                                                label="Yeni DB satırı"
                                                value={
                                                    duplicateBlocked.newRows
                                                }
                                            />
                                        ) : null}

                                        {duplicateBlocked.existingRows !== null ? (
                                            <SummaryRow
                                                label="Zaten mevcut"
                                                value={
                                                    duplicateBlocked.existingRows
                                                }
                                            />
                                        ) : null}

                                        {duplicateBlocked.uncheckableRows !== null ? (
                                            <SummaryRow
                                                label="Kontrol edilemeyen"
                                                value={
                                                    duplicateBlocked.uncheckableRows
                                                }
                                            />
                                        ) : null}
                                    </dl>
                                ) : null}

                                {commitResult ? (
                                    <dl className="editor-import-last-upload__summary">
                                        <SummaryRow
                                            label="Eklenen"
                                            value={
                                                commitResult.inserted_rows
                                            }
                                        />
                                        <SummaryRow
                                            label="Güncellenen"
                                            value={
                                                commitResult.updated_rows
                                            }
                                        />
                                        <SummaryRow
                                            label="Atlanan"
                                            value={
                                                commitResult.skipped_rows
                                            }
                                        />
                                    </dl>
                                ) : null}

                                {lastUpload.backendStatus ===
                                    "duplicate_blocked" ? (
                                    <p className="editor-import-status-card__message">
                                        Job: {
                                            lastUpload.backendJobId
                                        }
                                    </p>
                                ) : null}

                                {lastUpload.backendStatus !==
                                    "committed" &&
                                    lastUpload.backendStatus !==
                                    "duplicate_blocked" ? (
                                    <div className="import-upload-panel__footer">
                                        <p className="editor-import-status-card__message">
                                            Job: {
                                                lastUpload.backendJobId
                                            }
                                        </p>

                                        <button
                                            type="button"
                                            className="import-upload-panel__submit"
                                            disabled={
                                                !canCommitCurrentJob
                                            }
                                            onClick={
                                                handleCommit
                                            }
                                        >
                                            {isCommitting
                                                ? "Veritabanına aktarılıyor..."
                                                : "Onayla ve Veritabanına Aktar"}
                                        </button>
                                    </div>
                                ) : null}
                            </section>
                        ) : null}

                        <section className="editor-import-rules-card">
                            <p className="miras-eyebrow">
                                Aktarım Kuralları
                            </p>

                            <h2>
                                Güvenli aktarım
                            </h2>

                            <ul>
                                <li>
                                    JSON dosyası
                                    zorunludur.
                                </li>

                                <li>
                                    JSON doğrudan ortak
                                    veritabanı şemasına
                                    uyumlu
                                    <code>
                                        km-json-import
                                    </code>
                                    {" "}
                                    paketi olabilir.
                                </li>

                                <li>
                                    Görseller ZIP veya
                                    normal klasör
                                    olarak seçilebilir.
                                </li>

                                <li>
                                    JSON içindeki
                                    <code>
                                        media_asset.storage_uri
                                    </code>
                                    {" "}
                                    değerleri fiziksel
                                    dosyalarla
                                    eşleştirilir.
                                </li>

                                <li>
                                    <code>
                                        null
                                    </code>
                                    {" "}
                                    değerler tek başına
                                    hata değildir.
                                </li>

                                <li>
                                    Eşleşmeyen görsel
                                    referansları
                                    aktarımı engeller.
                                </li>

                                <li>
                                    Kullanılmayan
                                    görseller uyarı
                                    olarak raporlanır.
                                </li>

                                <li>
                                    İlk aktarım staging
                                    alanına alınır.
                                </li>
                            </ul>
                        </section>

                        {lastUpload ? (
                            <section className="editor-import-last-upload">
                                <p className="miras-eyebrow">
                                    Son Seçim
                                </p>

                                <dl>
                                    <div>
                                        <dt>
                                            JSON
                                        </dt>

                                        <dd>
                                            {
                                                lastUpload
                                                    .jsonFileName
                                            }
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            Görsel modu
                                        </dt>

                                        <dd>
                                            {getImageModeLabel(
                                                lastUpload.imageMode,
                                            )}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            Görseller
                                        </dt>

                                        <dd>
                                            {lastUpload.imageSourceName ??
                                                "Eklenmedi"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            Görsel dosyası
                                        </dt>

                                        <dd>
                                            {
                                                lastUpload
                                                    .imageFileCount
                                            }
                                        </dd>
                                    </div>

                                    {lastUpload.imageMode !==
                                        "none" ? (
                                        <div>
                                            <dt>
                                                Paket boyutu
                                            </dt>

                                            <dd>
                                                {formatImportFileSize(
                                                    lastUpload
                                                        .imageTotalSize,
                                                )}
                                            </dd>
                                        </div>
                                    ) : null}

                                    <div>
                                        <dt>
                                            Kaynak
                                        </dt>

                                        <dd>
                                            {
                                                lastUpload
                                                    .sourceName ??
                                                "Belirtilmedi"
                                            }
                                        </dd>
                                    </div>

                                    {lastUpload.backendJobId ? (
                                        <div>
                                            <dt>
                                                Staging Job
                                            </dt>

                                            <dd>
                                                {
                                                    lastUpload
                                                        .backendJobId
                                                }
                                            </dd>
                                        </div>
                                    ) : null}

                                    {lastUpload.backendStatus ? (
                                        <div>
                                            <dt>
                                                Backend durum
                                            </dt>

                                            <dd>
                                                {
                                                    lastUpload
                                                        .backendStatus
                                                }
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </section>
                        ) : null}
                    </aside>
                </div>
            </section>
        </div>
    );
}

type ValidationSummaryProps = {
    result: ImportValidationResult;
};

function ValidationSummary({
    result,
}: ValidationSummaryProps) {
    return (
        <section className="editor-import-validation">
            <div className="editor-import-validation__header">
                <div>
                    <p className="miras-eyebrow">
                        JSON Önizleme
                    </p>

                    <h2>
                        {
                            result.summary
                                .totalRecords
                        }
                        {" "}
                        kayıt bulundu
                    </h2>

                    <p>
                        Veritabanı uyumlu JSON
                        paketi ve medya
                        referanslarının doğrulama
                        özeti.
                    </p>
                </div>

                <StatusBadge
                    status={
                        result.status
                    }
                />
            </div>

            <div className="editor-import-validation__stats">
                <ValidationStat
                    label="Toplam"
                    value={
                        result.summary
                            .totalRecords
                    }
                />

                <ValidationStat
                    label="Geçerli"
                    value={
                        result.summary
                            .validRecords
                    }
                />

                <ValidationStat
                    label="Hatalı"
                    value={
                        result.summary
                            .errorRecords
                    }
                />

                <ValidationStat
                    label="Referans"
                    value={
                        result.summary
                            .referencedImages
                    }
                />

                <ValidationStat
                    label="Eşleşen"
                    value={
                        result.summary
                            .matchedImages
                    }
                />

                <ValidationStat
                    label="Eksik"
                    value={
                        result.summary
                            .missingImages
                    }
                />

                <ValidationStat
                    label="Kullanılmayan"
                    value={
                        result.summary
                            .unusedImages
                    }
                />
            </div>

            {result.issues.length >
                0 ? (
                <div className="editor-import-validation__issues">
                    <div className="editor-import-validation__section-heading">
                        <h3>
                            Tespit edilen sorunlar
                        </h3>

                        <span>
                            {
                                result.issues
                                    .length
                            }
                        </span>
                    </div>

                    <div className="editor-import-validation__issue-list">
                        {result.issues
                            .slice(0, 12)
                            .map(
                                (issue) => (
                                    <article
                                        key={
                                            issue.id
                                        }
                                        className={`editor-import-issue editor-import-issue--${issue.severity}`}
                                    >
                                        <div>
                                            <strong>
                                                {
                                                    issue.message
                                                }
                                            </strong>

                                            {issue.suggestion ? (
                                                <p>
                                                    {
                                                        issue.suggestion
                                                    }
                                                </p>
                                            ) : null}
                                        </div>

                                        <span>
                                            {
                                                issue.severity ===
                                                    "error"
                                                    ? "Hata"
                                                    : issue.severity ===
                                                        "warning"
                                                        ? "Uyarı"
                                                        : "Bilgi"
                                            }
                                        </span>
                                    </article>
                                ),
                            )}
                    </div>

                    {result.issues.length >
                        12 ? (
                        <p className="editor-import-validation__more">
                            +
                            {
                                result.issues
                                    .length -
                                12
                            }
                            {" "}
                            ek sorun daha bulundu.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {result.records.length >
                0 ? (
                <div className="editor-import-validation__records">
                    <div className="editor-import-validation__section-heading">
                        <h3>
                            İlk kayıtlar
                        </h3>

                        <span>
                            {
                                result.records
                                    .length
                            }
                        </span>
                    </div>

                    <div className="editor-import-record-list">
                        {result.records
                            .slice(0, 10)
                            .map(
                                (record) => (
                                    <article
                                        key={
                                            record.index
                                        }
                                        className="editor-import-record"
                                    >
                                        <span className="editor-import-record__index">
                                            {String(
                                                record.index +
                                                1,
                                            ).padStart(
                                                2,
                                                "0",
                                            )}
                                        </span>

                                        <div className="editor-import-record__content">
                                            <strong>
                                                {record.title ??
                                                    "Başlıksız kayıt"}
                                            </strong>

                                            <p>
                                                {record.sourceId
                                                    ? `Kaynak ID: ${record.sourceId}`
                                                    : "Kaynak ID bulunamadı"}
                                            </p>
                                        </div>

                                        <span
                                            className={`editor-import-record__status editor-import-record__status--${record.status}`}
                                        >
                                            {
                                                record.status ===
                                                    "valid"
                                                    ? "Geçerli"
                                                    : record.status ===
                                                        "warning"
                                                        ? "Uyarı"
                                                        : record.status ===
                                                            "duplicate"
                                                            ? "Duplicate"
                                                            : "Hata"
                                            }
                                        </span>
                                    </article>
                                ),
                            )}
                    </div>

                    {result.records.length >
                        10 ? (
                        <p className="editor-import-validation__more">
                            İlk 10 kayıt
                            gösteriliyor.
                            Toplam{" "}
                            {
                                result.records
                                    .length
                            }
                            {" "}
                            kayıt bulundu.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}

type ValidationStatProps = {
    label: string;
    value: number;
};

function ValidationStat({
    label,
    value,
}: ValidationStatProps) {
    return (
        <div className="editor-import-validation-stat">
            <strong>
                {value}
            </strong>

            <span>
                {label}
            </span>
        </div>
    );
}

type SummaryRowProps = {
    label: string;
    value: number;
};

function SummaryRow({
    label,
    value,
}: SummaryRowProps) {
    return (
        <div>
            <dt>
                {label}
            </dt>

            <dd>
                {value}
            </dd>
        </div>
    );
}

type WorkflowStepProps = {
    number: string;
    label: string;
    active?: boolean;
};

function WorkflowStep({
    number,
    label,
    active = false,
}: WorkflowStepProps) {
    return (
        <div
            className={
                active
                    ? "editor-import-workflow-step editor-import-workflow-step--active"
                    : "editor-import-workflow-step"
            }
        >
            <span>
                {number}
            </span>

            <strong>
                {label}
            </strong>
        </div>
    );
}

type StatusBadgeProps = {
    status:
    | "idle"
    | "uploading"
    | "validating"
    | "ready"
    | "warning"
    | "error"
    | "committing"
    | "completed";
};

const statusLabels:
    Record<
        StatusBadgeProps["status"],
        string
    > = {
    idle:
        "Bekliyor",

    uploading:
        "Yükleniyor",

    validating:
        "Doğrulanıyor",

    ready:
        "Hazır",

    warning:
        "Uyarı",

    error:
        "Hata",

    committing:
        "Aktarılıyor",

    completed:
        "Tamamlandı",
};

function StatusBadge({
    status,
}: StatusBadgeProps) {
    return (
        <span
            className={`editor-import-status editor-import-status--${status}`}
        >
            {statusLabels[
                status
            ]}
        </span>
    );
}

function getImageModeLabel(
    mode:
        | "none"
        | "zip"
        | "folder",
) {
    if (
        mode === "zip"
    ) {
        return "ZIP";
    }

    if (
        mode ===
        "folder"
    ) {
        return "Klasör";
    }

    return "Görselsiz";
}