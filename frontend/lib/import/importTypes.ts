export type ImportJobStatus =
    | "idle"
    | "uploading"
    | "validating"
    | "ready"
    | "warning"
    | "error"
    | "committing"
    | "completed";

export type ImportIssueSeverity =
    | "info"
    | "warning"
    | "error";

export type ImportIssueCode =
    | "missing_required_field"
    | "invalid_field_type"
    | "unknown_field"
    | "duplicate_record"
    | "duplicate_external_id"
    | "missing_image"
    | "unused_image"
    | "invalid_image_reference"
    | "invalid_archive"
    | "unsupported_file"
    | "invalid_json"
    | "schema_mismatch"
    | "record_without_title"
    | "invalid_relation"
    | "invalid_location"
    | "invalid_date"
    | "other";

export type ImportFileKind =
    | "json"
    | "images_zip"
    | "images_folder";

export type ImportRecordStatus =
    | "valid"
    | "warning"
    | "error"
    | "duplicate";

export type ImportAssetMatchStatus =
    | "matched"
    | "missing"
    | "unused"
    | "duplicate";

export type ImportImageInputMode =
    | "none"
    | "zip"
    | "folder";

export type ImportFileInfo = {
    id: string;

    kind: ImportFileKind;

    fileName: string;

    sizeBytes: number;

    mimeType?: string | null;

    relativePath?: string | null;

    uploadedAt?: string | null;
};

export type ImportIssue = {
    id: string;

    severity: ImportIssueSeverity;

    code: ImportIssueCode;

    message: string;

    recordIndex?: number | null;

    recordId?: string | null;

    field?: string | null;

    fileName?: string | null;

    suggestion?: string | null;
};

export type ImportRecordPreview = {
    index: number;

    sourceId?: string | null;

    title: string | null;

    subfieldCode?: string | null;

    subfieldTitle?: string | null;

    recordType?: string | null;

    status: ImportRecordStatus;

    imageReferenceCount: number;

    matchedImageCount: number;

    issueCount: number;

    raw?: Record<
        string,
        unknown
    >;
};

export type ImportAssetMatch = {
    reference: string;

    fileName?: string | null;

    relativePath?: string | null;

    status: ImportAssetMatchStatus;

    matchedRecordIds: string[];

    issueIds: string[];
};

export type ImportValidationSummary = {
    totalRecords: number;

    validRecords: number;

    warningRecords: number;

    errorRecords: number;

    duplicateRecords: number;

    referencedImages: number;

    matchedImages: number;

    missingImages: number;

    unusedImages: number;

    canCommit: boolean;
};

export type ImportValidationResult = {
    jobId: string;

    status: ImportJobStatus;

    schemaVersion?: string | null;

    sourceName?: string | null;

    files: ImportFileInfo[];

    summary: ImportValidationSummary;

    issues: ImportIssue[];

    records: ImportRecordPreview[];

    assets: ImportAssetMatch[];
};

export type ImportUploadRequest = {
    jsonFile: File;

    imageInputMode: ImportImageInputMode;

    imagesZipFile?: File | null;

    imageFolderFiles?: File[];

    imageFolderName?: string | null;

    subfieldCode?: string | null;

    sourceName?: string | null;

    notes?: string | null;
};

export type ImportCommitRequest = {
    jobId: string;

    publishMode:
    | "staging"
    | "publish";

    skipWarnings?: boolean;

    notes?: string | null;
};

export type ImportCommitResult = {
    jobId: string;

    status: ImportJobStatus;

    insertedRecords: number;

    updatedRecords: number;

    skippedRecords: number;

    insertedMedia: number;

    linkedMedia: number;

    publishedRecords: number;

    completedAt?: string | null;
};

export type ImportProgressState = {
    status: ImportJobStatus;

    progress: number;

    message: string;

    currentStep?: string | null;
};

export type ImportUiState = {
    jsonFile: File | null;

    imageInputMode: ImportImageInputMode;

    imagesZipFile: File | null;

    imageFolderFiles: File[];

    imageFolderName: string | null;

    validationResult: ImportValidationResult | null;

    progress: ImportProgressState;

    selectedRecordIndex: number | null;

    selectedIssueId: string | null;
};

export const DEFAULT_IMPORT_PROGRESS_STATE:
    ImportProgressState = {
    status: "idle",
    progress: 0,
    message:
        "Henüz bir aktarım başlatılmadı.",
    currentStep: null,
};

export const DEFAULT_IMPORT_UI_STATE:
    ImportUiState = {
    jsonFile: null,

    imageInputMode: "none",

    imagesZipFile: null,

    imageFolderFiles: [],

    imageFolderName: null,

    validationResult: null,

    progress:
        DEFAULT_IMPORT_PROGRESS_STATE,

    selectedRecordIndex: null,

    selectedIssueId: null,
};

export function formatImportFileSize(
    bytes: number,
) {
    if (bytes <= 0) {
        return "0 B";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB",
    ];

    const unitIndex = Math.min(
        Math.floor(
            Math.log(bytes) /
            Math.log(1024),
        ),
        units.length - 1,
    );

    const value =
        bytes /
        1024 ** unitIndex;

    return `${value.toFixed(
        unitIndex === 0
            ? 0
            : value >= 10
                ? 1
                : 2,
    )} ${units[unitIndex]}`;
}

export function getImportFilesTotalSize(
    files: File[],
) {
    return files.reduce(
        (
            total,
            file,
        ) =>
            total +
            file.size,
        0,
    );
}