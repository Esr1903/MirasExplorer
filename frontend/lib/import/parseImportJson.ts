import type {
    ImportIssue,
    ImportRecordPreview,
    ImportValidationResult,
} from "@/lib/import/importTypes";

type JsonRecord = Record<
    string,
    unknown
>;

type KmImportPackage = JsonRecord & {
    format: string;
    format_version?: string;
    tables: JsonRecord;
};

type KmRecordAnchor = JsonRecord & {
    anchor_id?: unknown;
    record_kind_code?: unknown;
    display_label?: unknown;
    record_status?: unknown;
    access_level?: unknown;
};

type KmHeritageAsset = JsonRecord & {
    anchor_id?: unknown;
    record_kind_code?: unknown;
    asset_type_concept_id?: unknown;
    short_description?: unknown;
    is_movable?: unknown;
};

type KmMediaAsset = JsonRecord & {
    anchor_id?: unknown;
    record_kind_code?: unknown;
    storage_uri?: unknown;
    mime_type?: unknown;
    byte_size?: unknown;
    sha256_hex?: unknown;
    technical_metadata?: unknown;
};

export async function parseImportJsonFile(
    file: File,
): Promise<ImportValidationResult> {
    let parsed: unknown;

    try {
        const text =
            await file.text();

        parsed =
            JSON.parse(text);
    } catch {
        return buildErrorResult(
            file,
            {
                id:
                    "invalid-json",

                severity:
                    "error",

                code:
                    "invalid_json",

                message:
                    "JSON dosyası parse edilemedi. Dosya sözdizimini kontrol edin.",

                fileName:
                    file.name,

                suggestion:
                    "Dosyanın geçerli JSON olduğundan emin olun.",
            },
        );
    }

    if (
        isKmJsonImportPackage(
            parsed,
        )
    ) {
        return parseKmJsonImportPackage(
            parsed,
            file,
        );
    }

    return parseGenericJson(
        parsed,
        file,
    );
}

function parseKmJsonImportPackage(
    parsed: KmImportPackage,
    file: File,
): ImportValidationResult {
    const issues:
        ImportIssue[] = [];

    const tables =
        parsed.tables;

    const recordAnchors =
        readTable<KmRecordAnchor>(
            tables,
            "record_anchor",
        );

    const heritageAssets =
        readTable<KmHeritageAsset>(
            tables,
            "heritage_asset",
        );

    const mediaAssets =
        readTable<KmMediaAsset>(
            tables,
            "media_asset",
        );

    const persons =
        readTable(
            tables,
            "person",
        );

    const organizations =
        readTable(
            tables,
            "organization",
        );

    const relations =
        readTable(
            tables,
            "entity_relation",
        );

    const entityNames =
        readTable(
            tables,
            "entity_name",
        );

    const assertions =
        readTable(
            tables,
            "assertion",
        );

    const anchorMap =
        buildAnchorMap(
            recordAnchors,
        );

    validatePackageMetadata(
        parsed,
        issues,
    );

    validateImportOrder(
        parsed,
        tables,
        issues,
    );

    validateDuplicateAnchorIds(
        recordAnchors,
        issues,
    );

    validateMediaAssets(
        mediaAssets,
        issues,
    );

    const mediaCountByTarget =
        buildMediaCountByTarget(
            mediaAssets,
            relations,
        );

    const records:
        ImportRecordPreview[] =
        heritageAssets.map(
            (
                asset,
                index,
            ) =>
                buildHeritageAssetPreview(
                    asset,
                    index,
                    anchorMap,
                    mediaCountByTarget,
                    issues,
                ),
        );

    const duplicateIndexes =
        findDuplicateSourceIds(
            records,
            issues,
        );

    const normalizedRecords =
        records.map(
            (record) => {
                if (
                    !duplicateIndexes.has(
                        record.index,
                    )
                ) {
                    return record;
                }

                return {
                    ...record,

                    status:
                        "duplicate" as const,

                    issueCount:
                        record.issueCount +
                        1,
                };
            },
        );

    const validRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "valid",
        ).length;

    const warningRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "warning",
        ).length;

    const errorRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "error",
        ).length;

    const duplicateRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "duplicate",
        ).length;

    const referencedImages =
        mediaAssets.filter(
            (media) =>
                Boolean(
                    readString(
                        media.storage_uri,
                    ),
                ),
        ).length;

    const blockingErrors =
        issues.filter(
            (issue) =>
                issue.severity ===
                "error",
        );

    const warningIssues =
        issues.filter(
            (issue) =>
                issue.severity ===
                "warning",
        );

    const packageMetadata =
        isJsonRecord(
            parsed.package_metadata,
        )
            ? parsed.package_metadata
            : null;

    const sourceKey =
        packageMetadata
            ? readString(
                packageMetadata.source_key,
            )
            : null;

    const releaseName =
        packageMetadata
            ? readString(
                packageMetadata.release_name,
            )
            : null;

    const sourceName =
        [
            sourceKey,
            releaseName,
        ]
            .filter(Boolean)
            .join(" · ") ||
        file.name;

    /*
     * Buradaki toplam kayıt sayısı bütün SQL satırlarının
     * toplamı değildir.
     *
     * Editör önizlemesinin ana konusu olan
     * heritage_asset kayıtlarının sayısıdır.
     *
     * person / organization / assertion / relation gibi
     * ilişkili tablolar ayrıca paket metadatasında korunur.
     */
    return {
        jobId:
            createLocalJobId(),

        status:
            blockingErrors.length >
                0
                ? "error"
                : warningIssues.length >
                    0
                    ? "warning"
                    : "ready",

        schemaVersion:
            readString(
                parsed.format_version,
            ),

        sourceName,

        files: [
            {
                id:
                    "json-file",

                kind:
                    "json",

                fileName:
                    file.name,

                sizeBytes:
                    file.size,

                mimeType:
                    file.type ||
                    "application/json",

                uploadedAt:
                    new Date().toISOString(),
            },
        ],

        summary: {
            totalRecords:
                normalizedRecords.length,

            validRecords,

            warningRecords,

            errorRecords,

            duplicateRecords,

            referencedImages,

            /*
             * ZIP / klasör gerçek eşleştirmesi henüz
             * ayrı media validator katmanında yapılacak.
             */
            matchedImages: 0,

            missingImages: 0,

            unusedImages: 0,

            canCommit:
                blockingErrors.length ===
                0,
        },

        issues,

        records:
            normalizedRecords,

        assets:
            mediaAssets
                .map(
                    (
                        media,
                        index,
                    ) => {
                        const storageUri =
                            readString(
                                media.storage_uri,
                            );

                        if (!storageUri) {
                            return null;
                        }

                        return {
                            reference:
                                storageUri,

                            fileName:
                                getFileNameFromPath(
                                    storageUri,
                                ),

                            relativePath:
                                storageUri,

                            status:
                                "missing" as const,

                            matchedRecordIds:
                                getMediaTargetIds(
                                    media,
                                    relations,
                                ),

                            issueIds: [],
                        };
                    },
                )
                .filter(
                    (
                        item,
                    ): item is NonNullable<
                        typeof item
                    > => item !== null,
                ),

        /*
         * Bu bilgiler ImportValidationResult tipinde ayrı alan
         * olmadığı için raw preview kayıtlarında korunuyor.
         *
         * UI tarafında sonraki aşamada paket özeti için:
         * persons.length
         * organizations.length
         * entityNames.length
         * assertions.length
         * relations.length
         * ayrıca gösterilebilir.
         */
    };
}

function buildHeritageAssetPreview(
    asset: KmHeritageAsset,
    index: number,
    anchorMap: Map<
        string,
        KmRecordAnchor
    >,
    mediaCountByTarget: Map<
        string,
        number
    >,
    issues: ImportIssue[],
): ImportRecordPreview {
    const anchorId =
        readString(
            asset.anchor_id,
        );

    const anchor =
        anchorId
            ? anchorMap.get(
                anchorId,
            )
            : undefined;

    const displayLabel =
        anchor
            ? readString(
                anchor.display_label,
            )
            : null;

    const shortDescription =
        readString(
            asset.short_description,
        );

    const assetTypeCode =
        readConceptCode(
            asset.asset_type_concept_id,
        );

    let status:
        ImportRecordPreview["status"] =
        "valid";

    let issueCount = 0;

    if (!anchorId) {
        issues.push({
            id:
                `heritage-asset-${index}-missing-anchor-id`,

            severity:
                "error",

            code:
                "missing_required_field",

            message:
                `Eser kaydı ${index + 1} için anchor_id bulunamadı.`,

            recordIndex:
                index,

            field:
                "anchor_id",

            suggestion:
                "heritage_asset kaydının record_anchor ile bağlanabilmesi için anchor_id zorunludur.",
        });

        status =
            "error";

        issueCount += 1;
    }

    if (
        anchorId &&
        !anchor
    ) {
        issues.push({
            id:
                `heritage-asset-${index}-missing-record-anchor`,

            severity:
                "error",

            code:
                "invalid_relation",

            message:
                `Eser kaydı ${index + 1} için eşleşen record_anchor bulunamadı.`,

            recordIndex:
                index,

            recordId:
                anchorId,

            field:
                "anchor_id",

            suggestion:
                "heritage_asset.anchor_id değerinin record_anchor tablosunda bulunması gerekir.",
        });

        status =
            "error";

        issueCount += 1;
    }

    if (
        !displayLabel
    ) {
        issues.push({
            id:
                `heritage-asset-${index}-missing-display-label`,

            severity:
                "warning",

            code:
                "record_without_title",

            message:
                `Eser kaydı ${index + 1} için görünen başlık bulunamadı.`,

            recordIndex:
                index,

            recordId:
                anchorId,

            field:
                "display_label",

            suggestion:
                "record_anchor.display_label alanını kontrol edin.",
        });

        if (
            status !==
            "error"
        ) {
            status =
                "warning";
        }

        issueCount += 1;
    }

    const imageReferenceCount =
        anchorId
            ? mediaCountByTarget.get(
                anchorId,
            ) ?? 0
            : 0;

    return {
        index,

        sourceId:
            anchorId,

        title:
            displayLabel ??
            shortDescription ??
            null,

        subfieldCode:
            assetTypeCode,

        /*
         * Şimdilik concept tablosundaki preferred_label
         * çözümlemesini burada yapmıyoruz.
         *
         * asset type code kaybolmasın diye kod alanında tutuluyor.
         */
        subfieldTitle:
            assetTypeCode,

        recordType:
            "heritage_asset",

        status,

        imageReferenceCount,

        matchedImageCount: 0,

        issueCount,

        raw: {
            ...asset,

            record_anchor:
                anchor ??
                null,
        },
    };
}

function buildAnchorMap(
    anchors: KmRecordAnchor[],
) {
    const map =
        new Map<
            string,
            KmRecordAnchor
        >();

    for (
        const anchor of anchors
    ) {
        const anchorId =
            readString(
                anchor.anchor_id,
            );

        if (!anchorId) {
            continue;
        }

        map.set(
            anchorId,
            anchor,
        );
    }

    return map;
}

function buildMediaCountByTarget(
    mediaAssets: KmMediaAsset[],
    relations: JsonRecord[],
) {
    const counts =
        new Map<
            string,
            number
        >();

    const mediaIds =
        new Set(
            mediaAssets
                .map(
                    (media) =>
                        readString(
                            media.anchor_id,
                        ),
                )
                .filter(
                    (
                        value,
                    ): value is string =>
                        Boolean(value),
                ),
        );

    for (
        const relation of relations
    ) {
        const subjectId =
            readString(
                relation.subject_anchor_id,
            );

        const objectId =
            readString(
                relation.object_anchor_id,
            );

        if (
            !subjectId ||
            !objectId ||
            !mediaIds.has(
                subjectId,
            )
        ) {
            continue;
        }

        const relationType =
            readConceptCode(
                relation.relation_type_concept_id,
            );

        /*
         * Bu paketlerde medya -> eser bağlantısı
         * entity_relation ile "documents" olarak geliyor.
         *
         * Fakat gelecekteki paketlerde relation type
         * eksik olsa bile medya subject ise ilişkiyi kaybetmemek
         * için yalnızca açıkça farklı bir relation varsa atlıyoruz.
         */
        if (
            relationType &&
            relationType !==
            "documents"
        ) {
            continue;
        }

        counts.set(
            objectId,
            (
                counts.get(
                    objectId,
                ) ?? 0
            ) + 1,
        );
    }

    return counts;
}

function getMediaTargetIds(
    media: KmMediaAsset,
    relations: JsonRecord[],
) {
    const mediaId =
        readString(
            media.anchor_id,
        );

    if (!mediaId) {
        return [];
    }

    const targets =
        new Set<string>();

    for (
        const relation of relations
    ) {
        const subjectId =
            readString(
                relation.subject_anchor_id,
            );

        if (
            subjectId !==
            mediaId
        ) {
            continue;
        }

        const relationType =
            readConceptCode(
                relation.relation_type_concept_id,
            );

        if (
            relationType &&
            relationType !==
            "documents"
        ) {
            continue;
        }

        const objectId =
            readString(
                relation.object_anchor_id,
            );

        if (
            objectId
        ) {
            targets.add(
                objectId,
            );
        }
    }

    return [
        ...targets,
    ];
}

function validatePackageMetadata(
    parsed: KmImportPackage,
    issues: ImportIssue[],
) {
    if (
        parsed.format !==
        "km-json-import"
    ) {
        issues.push({
            id:
                "invalid-package-format",

            severity:
                "error",

            code:
                "schema_mismatch",

            message:
                "Paket formatı km-json-import değil.",

            field:
                "format",
        });
    }

    const version =
        readString(
            parsed.format_version,
        );

    if (!version) {
        issues.push({
            id:
                "missing-format-version",

            severity:
                "warning",

            code:
                "missing_required_field",

            message:
                "Paket format_version bilgisi bulunamadı.",

            field:
                "format_version",
        });
    }

    const heritageAssets =
        readTable(
            parsed.tables,
            "heritage_asset",
        );

    if (
        heritageAssets.length ===
        0
    ) {
        issues.push({
            id:
                "missing-heritage-assets",

            severity:
                "error",

            code:
                "schema_mismatch",

            message:
                "Paket içinde heritage_asset kaydı bulunamadı.",

            field:
                "tables.heritage_asset",

            suggestion:
                "Taşınabilir kültürel miras paketi en az bir heritage_asset kaydı içermelidir.",
        });
    }
}

function validateImportOrder(
    parsed: KmImportPackage,
    tables: JsonRecord,
    issues: ImportIssue[],
) {
    if (
        !Array.isArray(
            parsed.import_order,
        )
    ) {
        issues.push({
            id:
                "missing-import-order",

            severity:
                "warning",

            code:
                "schema_mismatch",

            message:
                "Paket import_order dizisi içermiyor.",

            field:
                "import_order",

            suggestion:
                "Veritabanı aktarım sırasının açıkça tanımlanması önerilir.",
        });

        return;
    }

    const tableNames =
        Object.keys(
            tables,
        );

    const importOrder =
        parsed.import_order.filter(
            (
                item,
            ): item is string =>
                typeof item ===
                "string",
        );

    const missingTables =
        tableNames.filter(
            (tableName) =>
                !importOrder.includes(
                    tableName,
                ),
        );

    if (
        missingTables.length >
        0
    ) {
        issues.push({
            id:
                "import-order-table-mismatch",

            severity:
                "warning",

            code:
                "schema_mismatch",

            message:
                `import_order içinde ${missingTables.length} tablo eksik.`,

            field:
                "import_order",

            suggestion:
                missingTables.join(
                    ", ",
                ),
        });
    }
}

function validateDuplicateAnchorIds(
    anchors: KmRecordAnchor[],
    issues: ImportIssue[],
) {
    const seen =
        new Set<string>();

    const duplicates =
        new Set<string>();

    anchors.forEach(
        (
            anchor,
            index,
        ) => {
            const anchorId =
                readString(
                    anchor.anchor_id,
                );

            if (!anchorId) {
                issues.push({
                    id:
                        `record-anchor-${index}-missing-id`,

                    severity:
                        "error",

                    code:
                        "missing_required_field",

                    message:
                        `record_anchor satırı ${index + 1} için anchor_id bulunamadı.`,

                    recordIndex:
                        index,

                    field:
                        "anchor_id",
                });

                return;
            }

            if (
                seen.has(
                    anchorId,
                )
            ) {
                duplicates.add(
                    anchorId,
                );
            }

            seen.add(
                anchorId,
            );
        },
    );

    for (
        const anchorId of duplicates
    ) {
        issues.push({
            id:
                `duplicate-anchor-${anchorId}`,

            severity:
                "error",

            code:
                "duplicate_record",

            message:
                `record_anchor içinde yinelenen anchor_id bulundu: ${anchorId}`,

            recordId:
                anchorId,

            field:
                "anchor_id",
        });
    }
}

function validateMediaAssets(
    mediaAssets: KmMediaAsset[],
    issues: ImportIssue[],
) {
    const seenStorageUris =
        new Set<string>();

    mediaAssets.forEach(
        (
            media,
            index,
        ) => {
            const storageUri =
                readString(
                    media.storage_uri,
                );

            const mediaId =
                readString(
                    media.anchor_id,
                );

            if (
                !mediaId
            ) {
                issues.push({
                    id:
                        `media-${index}-missing-anchor-id`,

                    severity:
                        "error",

                    code:
                        "missing_required_field",

                    message:
                        `Medya kaydı ${index + 1} için anchor_id bulunamadı.`,

                    field:
                        "anchor_id",
                });
            }

            if (
                !storageUri
            ) {
                issues.push({
                    id:
                        `media-${index}-missing-storage-uri`,

                    severity:
                        "error",

                    code:
                        "invalid_image_reference",

                    message:
                        `Medya kaydı ${index + 1} için storage_uri bulunamadı.`,

                    recordId:
                        mediaId,

                    field:
                        "storage_uri",
                });

                return;
            }

            if (
                seenStorageUris.has(
                    storageUri,
                )
            ) {
                issues.push({
                    id:
                        `duplicate-storage-uri-${index}`,

                    severity:
                        "warning",

                    code:
                        "duplicate_record",

                    message:
                        `Aynı görsel yolu birden fazla media_asset kaydında kullanılıyor: ${storageUri}`,

                    recordId:
                        mediaId,

                    fileName:
                        getFileNameFromPath(
                            storageUri,
                        ),
                });
            }

            seenStorageUris.add(
                storageUri,
            );
        },
    );
}

function findDuplicateSourceIds(
    records: ImportRecordPreview[],
    issues: ImportIssue[],
) {
    const seen =
        new Map<
            string,
            number
        >();

    const duplicates =
        new Set<number>();

    records.forEach(
        (record) => {
            if (
                !record.sourceId
            ) {
                return;
            }

            const normalizedId =
                record.sourceId
                    .trim()
                    .toLocaleLowerCase(
                        "tr-TR",
                    );

            const previous =
                seen.get(
                    normalizedId,
                );

            if (
                previous !==
                undefined
            ) {
                duplicates.add(
                    previous,
                );

                duplicates.add(
                    record.index,
                );

                issues.push({
                    id:
                        `duplicate-heritage-asset-${normalizedId}-${record.index}`,

                    severity:
                        "error",

                    code:
                        "duplicate_external_id",

                    message:
                        `heritage_asset içinde yinelenen anchor_id bulundu: ${record.sourceId}`,

                    recordIndex:
                        record.index,

                    recordId:
                        record.sourceId,
                });

                return;
            }

            seen.set(
                normalizedId,
                record.index,
            );
        },
    );

    return duplicates;
}

/*
 * km-json-import olmayan daha basit JSON'lar için
 * eski esnek davranışı koruyoruz.
 *
 * Böylece ileride bütün dosyaların aynı paketi kullanmadığı
 * durumlarda editör ekranı tamamen kırılmaz.
 */
function parseGenericJson(
    parsed: unknown,
    file: File,
): ImportValidationResult {
    const issues:
        ImportIssue[] = [];

    const rawRecords =
        extractGenericRecordArray(
            parsed,
        );

    if (
        !rawRecords
    ) {
        return buildErrorResult(
            file,
            {
                id:
                    "record-array-not-found",

                severity:
                    "error",

                code:
                    "schema_mismatch",

                message:
                    "Desteklenen bir kayıt yapısı bulunamadı.",

                suggestion:
                    "km-json-import paketinde tables.heritage_asset beklenir. Basit JSON'larda ise records/items/data/catalog benzeri bir kayıt listesi kullanılabilir.",
            },
            readStringProperty(
                parsed,
                [
                    "format_version",
                    "schema_version",
                    "schemaVersion",
                    "version",
                ],
            ),
        );
    }

    const records =
        rawRecords.map(
            (
                record,
                index,
            ) =>
                buildGenericPreview(
                    record,
                    index,
                    issues,
                ),
        );

    const duplicates =
        findDuplicateSourceIds(
            records,
            issues,
        );

    const normalizedRecords =
        records.map(
            (record) =>
                duplicates.has(
                    record.index,
                )
                    ? {
                        ...record,

                        status:
                            "duplicate" as const,

                        issueCount:
                            record.issueCount +
                            1,
                    }
                    : record,
        );

    const errorRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "error",
        ).length;

    const warningRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "warning",
        ).length;

    const duplicateRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "duplicate",
        ).length;

    const validRecords =
        normalizedRecords.filter(
            (record) =>
                record.status ===
                "valid",
        ).length;

    const hasErrors =
        issues.some(
            (issue) =>
                issue.severity ===
                "error",
        );

    const hasWarnings =
        issues.some(
            (issue) =>
                issue.severity ===
                "warning",
        );

    return {
        jobId:
            createLocalJobId(),

        status:
            hasErrors
                ? "error"
                : hasWarnings
                    ? "warning"
                    : "ready",

        schemaVersion:
            readStringProperty(
                parsed,
                [
                    "schema_version",
                    "schemaVersion",
                    "version",
                ],
            ),

        sourceName:
            file.name,

        files: [
            {
                id:
                    "json-file",

                kind:
                    "json",

                fileName:
                    file.name,

                sizeBytes:
                    file.size,

                mimeType:
                    file.type ||
                    "application/json",

                uploadedAt:
                    new Date().toISOString(),
            },
        ],

        summary: {
            totalRecords:
                normalizedRecords.length,

            validRecords,

            warningRecords,

            errorRecords,

            duplicateRecords,

            referencedImages:
                normalizedRecords.reduce(
                    (
                        total,
                        record,
                    ) =>
                        total +
                        record.imageReferenceCount,
                    0,
                ),

            matchedImages: 0,

            missingImages: 0,

            unusedImages: 0,

            canCommit:
                !hasErrors,
        },

        issues,

        records:
            normalizedRecords,

        assets: [],
    };
}

function buildGenericPreview(
    rawRecord: JsonRecord,
    index: number,
    issues: ImportIssue[],
): ImportRecordPreview {
    const title =
        readFirstString(
            rawRecord,
            [
                "title",
                "name",
                "display_label",
                "eser_adi",
                "eserAdi",
                "object_name",
                "objectName",
                "catalog_title",
                "catalogTitle",
            ],
        );

    const sourceId =
        readFirstString(
            rawRecord,
            [
                "anchor_id",
                "id",
                "uuid",
                "source_id",
                "sourceId",
                "external_id",
                "externalId",
                "catalog_no",
                "catalogNo",
            ],
        );

    const imageReferences =
        collectImageReferences(
            rawRecord,
        );

    let status:
        ImportRecordPreview["status"] =
        "valid";

    let issueCount = 0;

    if (!title) {
        issues.push({
            id:
                `generic-${index}-missing-title`,

            severity:
                "error",

            code:
                "record_without_title",

            message:
                `Kayıt ${index + 1} için başlık bulunamadı.`,

            recordIndex:
                index,

            recordId:
                sourceId,

            field:
                "title",
        });

        status =
            "error";

        issueCount += 1;
    }

    if (!sourceId) {
        issues.push({
            id:
                `generic-${index}-missing-id`,

            severity:
                "warning",

            code:
                "missing_required_field",

            message:
                `Kayıt ${index + 1} için açık bir kayıt kimliği bulunamadı.`,

            recordIndex:
                index,

            field:
                "id",
        });

        if (
            status !==
            "error"
        ) {
            status =
                "warning";
        }

        issueCount += 1;
    }

    return {
        index,

        sourceId,

        title,

        subfieldCode:
            readFirstString(
                rawRecord,
                [
                    "subfield_code",
                    "subfieldCode",
                    "category_code",
                    "categoryCode",
                ],
            ),

        subfieldTitle:
            readFirstString(
                rawRecord,
                [
                    "subfield_title",
                    "subfieldTitle",
                    "category",
                    "category_name",
                ],
            ),

        recordType:
            readFirstString(
                rawRecord,
                [
                    "record_type",
                    "recordType",
                    "entity_type",
                    "entityType",
                    "type",
                ],
            ),

        status,

        imageReferenceCount:
            imageReferences.length,

        matchedImageCount: 0,

        issueCount,

        raw:
            rawRecord,
    };
}

function extractGenericRecordArray(
    parsed: unknown,
): JsonRecord[] | null {
    if (
        Array.isArray(parsed)
    ) {
        return parsed.filter(
            isJsonRecord,
        );
    }

    if (
        !isJsonRecord(
            parsed,
        )
    ) {
        return null;
    }

    const possibleKeys = [
        "records",
        "items",
        "data",
        "catalog",
        "catalogs",
        "entries",
        "assets",
        "heritage_assets",
    ];

    for (
        const key of possibleKeys
    ) {
        const value =
            parsed[key];

        if (
            Array.isArray(
                value,
            )
        ) {
            return value.filter(
                isJsonRecord,
            );
        }
    }

    return null;
}

function collectImageReferences(
    record: JsonRecord,
) {
    const references =
        new Set<string>();

    const imageKeys = [
        "storage_uri",
        "image",
        "images",
        "image_path",
        "imagePath",
        "image_paths",
        "imagePaths",
        "media",
        "media_files",
        "mediaFiles",
        "figure",
        "figures",
        "photo",
        "photos",
    ];

    for (
        const key of imageKeys
    ) {
        collectStringValues(
            record[key],
            references,
        );
    }

    return [
        ...references,
    ];
}

function collectStringValues(
    value: unknown,
    target: Set<string>,
) {
    if (
        typeof value ===
        "string"
    ) {
        const normalized =
            value.trim();

        if (
            normalized
        ) {
            target.add(
                normalized,
            );
        }

        return;
    }

    if (
        Array.isArray(
            value,
        )
    ) {
        value.forEach(
            (item) =>
                collectStringValues(
                    item,
                    target,
                ),
        );

        return;
    }

    if (
        isJsonRecord(
            value,
        )
    ) {
        Object.values(
            value,
        ).forEach(
            (item) =>
                collectStringValues(
                    item,
                    target,
                ),
        );
    }
}

function readTable<
    T extends JsonRecord = JsonRecord,
>(
    tables: JsonRecord,
    tableName: string,
): T[] {
    const value =
        tables[
        tableName
        ];

    if (
        !Array.isArray(
            value,
        )
    ) {
        return [];
    }

    return value.filter(
        (
            item,
        ): item is T =>
            isJsonRecord(
                item,
            ),
    );
}

function readConceptCode(
    value: unknown,
) {
    if (
        !isJsonRecord(
            value,
        )
    ) {
        return null;
    }

    return (
        readString(
            value.concept_code,
        ) ??
        readString(
            value.code,
        )
    );
}

function readFirstString(
    record: JsonRecord,
    keys: string[],
) {
    for (
        const key of keys
    ) {
        const value =
            record[key];

        const result =
            readString(
                value,
            );

        if (
            result
        ) {
            return result;
        }
    }

    return null;
}

function readString(
    value: unknown,
) {
    if (
        typeof value ===
        "string"
    ) {
        const normalized =
            value.trim();

        return (
            normalized ||
            null
        );
    }

    if (
        typeof value ===
        "number" ||
        typeof value ===
        "bigint"
    ) {
        return String(
            value,
        );
    }

    return null;
}

function readStringProperty(
    value: unknown,
    keys: string[],
) {
    if (
        !isJsonRecord(
            value,
        )
    ) {
        return null;
    }

    return readFirstString(
        value,
        keys,
    );
}

function isKmJsonImportPackage(
    value: unknown,
): value is KmImportPackage {
    if (
        !isJsonRecord(
            value,
        )
    ) {
        return false;
    }

    return (
        value.format ===
        "km-json-import" &&
        isJsonRecord(
            value.tables,
        )
    );
}

function isJsonRecord(
    value: unknown,
): value is JsonRecord {
    return (
        typeof value ===
        "object" &&
        value !== null &&
        !Array.isArray(
            value,
        )
    );
}

function getFileNameFromPath(
    path: string,
) {
    const normalized =
        path.replace(
            /\\/g,
            "/",
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

function buildErrorResult(
    file: File,
    issue: ImportIssue,
    schemaVersion:
        | string
        | null = null,
): ImportValidationResult {
    return {
        jobId:
            createLocalJobId(),

        status:
            "error",

        schemaVersion,

        sourceName:
            file.name,

        files: [
            {
                id:
                    "json-file",

                kind:
                    "json",

                fileName:
                    file.name,

                sizeBytes:
                    file.size,

                mimeType:
                    file.type ||
                    "application/json",

                uploadedAt:
                    new Date().toISOString(),
            },
        ],

        summary: {
            totalRecords: 0,

            validRecords: 0,

            warningRecords: 0,

            errorRecords: 0,

            duplicateRecords: 0,

            referencedImages: 0,

            matchedImages: 0,

            missingImages: 0,

            unusedImages: 0,

            canCommit: false,
        },

        issues: [
            issue,
        ],

        records: [],

        assets: [],
    };
}

function createLocalJobId() {
    if (
        typeof crypto !==
        "undefined" &&
        typeof crypto.randomUUID ===
        "function"
    ) {
        return crypto.randomUUID();
    }

    return `local-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
}