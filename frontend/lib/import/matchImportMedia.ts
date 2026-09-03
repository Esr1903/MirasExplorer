import JSZip from "jszip";

import type {
    ImportAssetMatch,
    ImportIssue,
    ImportUploadRequest,
    ImportValidationResult,
} from "@/lib/import/importTypes";

type MediaMatchInput = {
    validationResult: ImportValidationResult;

    upload: ImportUploadRequest;
};

type MediaCandidate = {
    fileName: string;

    relativePath: string;

    normalizedFileName: string;

    normalizedRelativePath: string;
};

type MediaMatchOutput = {
    assets: ImportAssetMatch[];

    issues: ImportIssue[];

    matchedImages: number;

    missingImages: number;

    unusedImages: number;

    duplicateImages: number;

    selectedImageFileCount: number;
};

export async function matchImportMedia({
    validationResult,
    upload,
}: MediaMatchInput): Promise<MediaMatchOutput> {
    const referencedAssets =
        validationResult.assets;

    if (
        upload.imageInputMode ===
        "none"
    ) {
        return buildNoImageModeResult(
            referencedAssets,
        );
    }

    const candidates =
        upload.imageInputMode ===
            "zip"
            ? await readZipCandidates(
                upload.imagesZipFile,
            )
            : readFolderCandidates(
                upload.imageFolderFiles ??
                [],
            );

    return matchReferencesToCandidates(
        referencedAssets,
        candidates,
    );
}

async function readZipCandidates(
    zipFile: File | null | undefined,
): Promise<MediaCandidate[]> {
    if (!zipFile) {
        return [];
    }

    const zip =
        await JSZip.loadAsync(
            zipFile,
        );

    const candidates:
        MediaCandidate[] = [];

    Object.values(
        zip.files,
    ).forEach(
        (entry) => {
            if (
                entry.dir
            ) {
                return;
            }

            if (
                !isSupportedImagePath(
                    entry.name,
                )
            ) {
                return;
            }

            const relativePath =
                normalizeRelativePath(
                    entry.name,
                );

            const fileName =
                getFileNameFromPath(
                    relativePath,
                );

            candidates.push({
                fileName,

                relativePath,

                normalizedFileName:
                    normalizePathForMatch(
                        fileName,
                    ),

                normalizedRelativePath:
                    normalizePathForMatch(
                        relativePath,
                    ),
            });
        },
    );

    return candidates;
}

function readFolderCandidates(
    files: File[],
): MediaCandidate[] {
    return files
        .filter(
            isSupportedImageFile,
        )
        .map(
            (file) => {
                const relativePath =
                    normalizeRelativePath(
                        file.webkitRelativePath ||
                        file.name,
                    );

                const fileName =
                    getFileNameFromPath(
                        relativePath,
                    );

                return {
                    fileName,

                    relativePath,

                    normalizedFileName:
                        normalizePathForMatch(
                            fileName,
                        ),

                    normalizedRelativePath:
                        normalizePathForMatch(
                            relativePath,
                        ),
                };
            },
        );
}

function matchReferencesToCandidates(
    referencedAssets: ImportAssetMatch[],
    candidates: MediaCandidate[],
): MediaMatchOutput {
    const issues:
        ImportIssue[] = [];

    const usedCandidateIndexes =
        new Set<number>();

    const matchedAssets =
        referencedAssets.map(
            (
                asset,
                assetIndex,
            ) => {
                const reference =
                    normalizeRelativePath(
                        asset.reference,
                    );

                const normalizedReference =
                    normalizePathForMatch(
                        reference,
                    );

                const referenceFileName =
                    getFileNameFromPath(
                        reference,
                    );

                const normalizedReferenceFileName =
                    normalizePathForMatch(
                        referenceFileName,
                    );

                const exactPathMatches =
                    candidates
                        .map(
                            (
                                candidate,
                                index,
                            ) => ({
                                candidate,
                                index,
                            }),
                        )
                        .filter(
                            ({
                                candidate,
                            }) =>
                                pathEndsWith(
                                    candidate.normalizedRelativePath,
                                    normalizedReference,
                                ),
                        );

                if (
                    exactPathMatches.length ===
                    1
                ) {
                    const match =
                        exactPathMatches[0];

                    usedCandidateIndexes.add(
                        match.index,
                    );

                    return {
                        ...asset,

                        fileName:
                            match.candidate
                                .fileName,

                        relativePath:
                            match.candidate
                                .relativePath,

                        status:
                            "matched" as const,
                    };
                }

                if (
                    exactPathMatches.length >
                    1
                ) {
                    const issueId =
                        `duplicate-path-${assetIndex}`;

                    issues.push({
                        id:
                            issueId,

                        severity:
                            "error",

                        code:
                            "invalid_image_reference",

                        message:
                            `Aynı görsel yolu birden fazla dosyayla eşleşti: ${asset.reference}`,

                        fileName:
                            referenceFileName,

                        suggestion:
                            "ZIP veya klasörde yinelenen göreli yolları kontrol edin.",
                    });

                    exactPathMatches.forEach(
                        ({
                            index,
                        }) =>
                            usedCandidateIndexes.add(
                                index,
                            ),
                    );

                    return {
                        ...asset,

                        status:
                            "duplicate" as const,

                        issueIds: [
                            ...asset.issueIds,
                            issueId,
                        ],
                    };
                }

                const fileNameMatches =
                    candidates
                        .map(
                            (
                                candidate,
                                index,
                            ) => ({
                                candidate,
                                index,
                            }),
                        )
                        .filter(
                            ({
                                candidate,
                            }) =>
                                candidate.normalizedFileName ===
                                normalizedReferenceFileName,
                        );

                if (
                    fileNameMatches.length ===
                    1
                ) {
                    const match =
                        fileNameMatches[0];

                    usedCandidateIndexes.add(
                        match.index,
                    );

                    return {
                        ...asset,

                        fileName:
                            match.candidate
                                .fileName,

                        relativePath:
                            match.candidate
                                .relativePath,

                        status:
                            "matched" as const,
                    };
                }

                if (
                    fileNameMatches.length >
                    1
                ) {
                    const issueId =
                        `duplicate-file-name-${assetIndex}`;

                    issues.push({
                        id:
                            issueId,

                        severity:
                            "error",

                        code:
                            "invalid_image_reference",

                        message:
                            `Aynı dosya adı birden fazla görselle eşleşti: ${referenceFileName}`,

                        fileName:
                            referenceFileName,

                        suggestion:
                            "Aynı isimli görseller farklı klasörlerde bulunuyorsa JSON içindeki storage_uri değerlerinin göreli klasör yolunu açıkça belirtmesi gerekir.",
                    });

                    fileNameMatches.forEach(
                        ({
                            index,
                        }) =>
                            usedCandidateIndexes.add(
                                index,
                            ),
                    );

                    return {
                        ...asset,

                        status:
                            "duplicate" as const,

                        issueIds: [
                            ...asset.issueIds,
                            issueId,
                        ],
                    };
                }

                const issueId =
                    `missing-image-${assetIndex}`;

                issues.push({
                    id:
                        issueId,

                    severity:
                        "error",

                    code:
                        "missing_image",

                    message:
                        `JSON içinde referans verilen görsel bulunamadı: ${asset.reference}`,

                    fileName:
                        referenceFileName,

                    suggestion:
                        "ZIP veya klasör içindeki dosya adını ve JSON media_asset.storage_uri değerini karşılaştırın.",
                });

                return {
                    ...asset,

                    status:
                        "missing" as const,

                    issueIds: [
                        ...asset.issueIds,
                        issueId,
                    ],
                };
            },
        );

    const unusedCandidates =
        candidates
            .map(
                (
                    candidate,
                    index,
                ) => ({
                    candidate,
                    index,
                }),
            )
            .filter(
                ({
                    index,
                }) =>
                    !usedCandidateIndexes.has(
                        index,
                    ),
            );

    unusedCandidates.forEach(
        ({
            candidate,
            index,
        }) => {
            issues.push({
                id:
                    `unused-image-${index}`,

                severity:
                    "warning",

                code:
                    "unused_image",

                message:
                    `Görsel paketi içinde JSON tarafından kullanılmayan dosya bulundu: ${candidate.relativePath}`,

                fileName:
                    candidate.fileName,

                suggestion:
                    "Bu dosya gerçekten gereksizse paket dışında bırakılabilir; ilgili bir esere aitse JSON storage_uri bağlantısını kontrol edin.",
            });
        },
    );

    const matchedImages =
        matchedAssets.filter(
            (asset) =>
                asset.status ===
                "matched",
        ).length;

    const missingImages =
        matchedAssets.filter(
            (asset) =>
                asset.status ===
                "missing",
        ).length;

    const duplicateImages =
        matchedAssets.filter(
            (asset) =>
                asset.status ===
                "duplicate",
        ).length;

    return {
        assets:
            matchedAssets,

        issues,

        matchedImages,

        missingImages,

        unusedImages:
            unusedCandidates.length,

        duplicateImages,

        selectedImageFileCount:
            candidates.length,
    };
}

function buildNoImageModeResult(
    referencedAssets: ImportAssetMatch[],
): MediaMatchOutput {
    /*
     * Görselsiz mod özellikle destekleniyor.
     *
     * Burada JSON içindeki media_asset kayıtlarını
     * "hatalı JSON" olarak işaretlemiyoruz.
     *
     * Fakat fiziksel dosyalar verilmediği için
     * mevcut referanslar doğrulanmış sayılmaz.
     */
    const assets =
        referencedAssets.map(
            (asset) => ({
                ...asset,

                status:
                    "missing" as const,
            }),
        );

    return {
        assets,

        issues: [],

        matchedImages: 0,

        missingImages:
            referencedAssets.length,

        unusedImages: 0,

        duplicateImages: 0,

        selectedImageFileCount: 0,
    };
}

function pathEndsWith(
    candidatePath: string,
    referencePath: string,
) {
    if (
        candidatePath ===
        referencePath
    ) {
        return true;
    }

    return candidatePath.endsWith(
        `/${referencePath}`,
    );
}

function normalizeRelativePath(
    value: string,
) {
    return value
        .replace(
            /\\/g,
            "/",
        )
        .replace(
            /^\.\/+/,
            "",
        )
        .replace(
            /\/+/g,
            "/",
        )
        .trim();
}

function normalizePathForMatch(
    value: string,
) {
    return normalizeRelativePath(
        value,
    ).toLocaleLowerCase(
        "tr-TR",
    );
}

function getFileNameFromPath(
    path: string,
) {
    const normalized =
        normalizeRelativePath(
            path,
        );

    const parts =
        normalized.split(
            "/",
        );

    return (
        parts[
        parts.length -
        1
        ] ||
        normalized
    );
}

function isSupportedImageFile(
    file: File,
) {
    if (
        file.type.startsWith(
            "image/",
        )
    ) {
        return true;
    }

    return isSupportedImagePath(
        file.name,
    );
}

function isSupportedImagePath(
    path: string,
) {
    const normalized =
        path.toLocaleLowerCase(
            "tr-TR",
        );

    return [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".bmp",
        ".tif",
        ".tiff",
        ".svg",
    ].some(
        (extension) =>
            normalized.endsWith(
                extension,
            ),
    );
}