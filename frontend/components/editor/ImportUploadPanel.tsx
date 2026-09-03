"use client";

// MIRASEXPLORER_IMPORT_UPLOAD_VERSION: DRAG_DROP_V3_RELATIVE_PATH_CLONE

import {
    useRef,
    useState,
} from "react";

import {
    formatImportFileSize,
    getImportFilesTotalSize,
    type ImportImageInputMode,
    type ImportUploadRequest,
} from "@/lib/import/importTypes";

type ImportUploadPanelProps = {
    onSubmit: (
        payload: ImportUploadRequest,
    ) => void;

    isSubmitting?: boolean;
};

export function ImportUploadPanel({
    onSubmit,
    isSubmitting = false,
}: ImportUploadPanelProps) {
    const jsonInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const zipInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const folderInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const [
        jsonFile,
        setJsonFile,
    ] = useState<File | null>(
        null,
    );

    const [
        imageInputMode,
        setImageInputMode,
    ] = useState<ImportImageInputMode>(
        "none",
    );

    const [
        imagesZipFile,
        setImagesZipFile,
    ] = useState<File | null>(
        null,
    );

    const [
        imageFolderFiles,
        setImageFolderFiles,
    ] = useState<File[]>(
        [],
    );

    const [
        imageFolderName,
        setImageFolderName,
    ] = useState<string | null>(
        null,
    );

    const [
        sourceName,
        setSourceName,
    ] = useState("");

    const [
        notes,
        setNotes,
    ] = useState("");

    const [
        localError,
        setLocalError,
    ] = useState<
        string | null
    >(null);

    const [
        isDragActive,
        setIsDragActive,
    ] = useState(false);

    const dragDepthRef =
        useRef(0);

    function handleJsonFile(
        file: File | null,
    ) {
        setLocalError(null);

        if (!file) {
            setJsonFile(null);
            return;
        }

        const normalizedName =
            file.name.toLocaleLowerCase(
                "tr-TR",
            );

        if (
            !normalizedName.endsWith(
                ".json",
            )
        ) {
            setJsonFile(null);

            setLocalError(
                "JSON alanına yalnızca .json uzantılı bir dosya yükleyebilirsiniz.",
            );

            return;
        }

        setJsonFile(file);
    }

    function handleZipFile(
        file: File | null,
    ) {
        setLocalError(null);

        if (!file) {
            setImagesZipFile(
                null,
            );
            return;
        }

        const normalizedName =
            file.name.toLocaleLowerCase(
                "tr-TR",
            );

        if (
            !normalizedName.endsWith(
                ".zip",
            )
        ) {
            setImagesZipFile(
                null,
            );

            setLocalError(
                "ZIP modu seçiliyken yalnızca .zip uzantılı bir dosya yükleyebilirsiniz.",
            );

            return;
        }

        setImagesZipFile(
            file,
        );

        setImageFolderFiles(
            [],
        );

        setImageFolderName(
            null,
        );

        setImageInputMode(
            "zip",
        );
    }

    function applyImageFolderFiles(
        files: File[],
        folderNameHint?: string | null,
    ) {
        setLocalError(null);

        const imageFiles =
            files.filter(
                isSupportedImageFile,
            );

        if (
            imageFiles.length === 0
        ) {
            setLocalError(
                "Seçilen veya sürüklenen klasörde desteklenen bir görsel dosyası bulunamadı.",
            );

            setImageFolderFiles(
                [],
            );

            setImageFolderName(
                null,
            );

            return;
        }

        const firstRelativePath =
            imageFiles[0]
                .webkitRelativePath;

        const inferredFolderName =
            folderNameHint ||
            (firstRelativePath
                ? firstRelativePath.split(
                    "/",
                )[0]
                : "Sürüklenen görseller");

        setImageFolderFiles(
            imageFiles,
        );

        setImageFolderName(
            inferredFolderName,
        );

        setImagesZipFile(
            null,
        );

        setImageInputMode(
            "folder",
        );
    }

    function handleFolderFiles(
        files: FileList | null,
    ) {
        setLocalError(null);

        if (
            !files ||
            files.length === 0
        ) {
            setImageFolderFiles(
                [],
            );

            setImageFolderName(
                null,
            );

            return;
        }

        applyImageFolderFiles(
            Array.from(files),
        );
    }

    function handleDragEnter(
        event: React.DragEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current += 1;
        setIsDragActive(true);
    }

    function handleDragOver(
        event: React.DragEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        event.stopPropagation();

        if (
            event.dataTransfer
        ) {
            event.dataTransfer.dropEffect =
                "copy";
        }
    }

    function handleDragLeave(
        event: React.DragEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current = Math.max(
            0,
            dragDepthRef.current - 1,
        );

        if (
            dragDepthRef.current === 0
        ) {
            setIsDragActive(false);
        }
    }

    async function handleDrop(
        event: React.DragEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current = 0;
        setIsDragActive(false);
        setLocalError(null);

        try {
            const dropped =
                await collectDroppedFiles(
                    event.dataTransfer,
                );

            if (
                dropped.files.length === 0
            ) {
                setLocalError(
                    "Sürüklenen içerikte kullanılabilir dosya bulunamadı.",
                );
                return;
            }

            const jsonFiles =
                dropped.files.filter(
                    isJsonFile,
                );

            const zipFiles =
                dropped.files.filter(
                    isZipFile,
                );

            const imageFiles =
                dropped.files.filter(
                    isSupportedImageFile,
                );

            if (
                jsonFiles.length > 1
            ) {
                setLocalError(
                    "Aynı aktarım için yalnızca bir JSON dosyası bırakabilirsiniz.",
                );
                return;
            }

            if (
                zipFiles.length > 1
            ) {
                setLocalError(
                    "Aynı aktarım için yalnızca bir ZIP dosyası bırakabilirsiniz.",
                );
                return;
            }

            if (
                zipFiles.length > 0 &&
                imageFiles.length > 0
            ) {
                setLocalError(
                    "Aynı anda hem ZIP hem de açık görsel klasörü bırakılamaz. Görsel kaynağı olarak birini seçin.",
                );
                return;
            }

            if (
                jsonFiles[0]
            ) {
                handleJsonFile(
                    jsonFiles[0],
                );
            }

            if (
                zipFiles[0]
            ) {
                handleZipFile(
                    zipFiles[0],
                );
            } else if (
                imageFiles.length > 0
            ) {
                applyImageFolderFiles(
                    imageFiles,
                    dropped.rootFolderName,
                );
            }

            if (
                jsonFiles.length === 0 &&
                zipFiles.length === 0 &&
                imageFiles.length === 0
            ) {
                setLocalError(
                    "Yalnızca .json, .zip veya desteklenen görsel dosyaları / görsel klasörleri sürükleyebilirsiniz.",
                );
            }
        } catch (error) {
            setLocalError(
                error instanceof Error
                    ? error.message
                    : "Sürükle-bırak sırasında dosyalar okunamadı.",
            );
        }
    }

    function setImageMode(
        mode: ImportImageInputMode,
    ) {
        setLocalError(null);

        setImageInputMode(
            mode,
        );

        if (
            mode !== "zip"
        ) {
            setImagesZipFile(
                null,
            );

            if (
                zipInputRef.current
            ) {
                zipInputRef.current.value =
                    "";
            }
        }

        if (
            mode !== "folder"
        ) {
            setImageFolderFiles(
                [],
            );

            setImageFolderName(
                null,
            );

            if (
                folderInputRef.current
            ) {
                folderInputRef.current.value =
                    "";
            }
        }
    }

    function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setLocalError(null);

        if (!jsonFile) {
            setLocalError(
                "Aktarımı başlatmak için bir JSON dosyası seçmelisiniz.",
            );

            return;
        }

        if (
            imageInputMode === "zip" &&
            !imagesZipFile
        ) {
            setLocalError(
                "ZIP modu seçildi. Devam etmek için bir .zip dosyası seçin veya görsel modunu değiştirin.",
            );

            return;
        }

        if (
            imageInputMode === "folder" &&
            imageFolderFiles.length === 0
        ) {
            setLocalError(
                "Klasör modu seçildi. Devam etmek için görsel klasörünü seçin veya görsel modunu değiştirin.",
            );

            return;
        }

        onSubmit({
            jsonFile,

            imageInputMode,

            imagesZipFile:
                imageInputMode ===
                    "zip"
                    ? imagesZipFile
                    : null,

            imageFolderFiles:
                imageInputMode ===
                    "folder"
                    ? imageFolderFiles
                    : [],

            imageFolderName:
                imageInputMode ===
                    "folder"
                    ? imageFolderName
                    : null,

            sourceName:
                sourceName.trim() ||
                null,

            notes:
                notes.trim() ||
                null,

            subfieldCode: null,
        });
    }

    const folderSize =
        getImportFilesTotalSize(
            imageFolderFiles,
        );

    return (
        <form
            className="import-upload-panel"
            onSubmit={
                handleSubmit
            }
            onDragEnter={
                handleDragEnter
            }
            onDragOver={
                handleDragOver
            }
            onDragLeave={
                handleDragLeave
            }
            onDrop={
                handleDrop
            }
        >
            <div className="import-upload-panel__header">
                <div>
                    <p className="miras-eyebrow">
                        Yeni Veri Aktarımı
                    </p>

                    <h2>
                        JSON ve görselleri
                        yükleyin
                    </h2>

                    <p>
                        Veri dosyanızı ve varsa
                        bu kayıtlara ait görselleri
                        sisteme ekleyin.
                        Görseller ZIP dosyası,
                        normal klasör veya hiç
                        görsel olmadan
                        aktarılabilir.
                    </p>
                </div>

                <span className="import-upload-panel__security">
                    Önce doğrula
                </span>
            </div>

            <div className="import-upload-panel__files">
                <div
                    role="region"
                    aria-label="Sürükle bırak yükleme alanı"
                    style={{
                        gridColumn: "1 / -1",
                        border: isDragActive
                            ? "2px dashed currentColor"
                            : "1px dashed rgba(31, 45, 61, 0.28)",
                        borderRadius: "18px",
                        padding: "16px 18px",
                        background: isDragActive
                            ? "rgba(31, 45, 61, 0.06)"
                            : "rgba(255, 255, 255, 0.42)",
                        transition: "160ms ease",
                    }}
                >
                    <strong
                        style={{
                            display: "block",
                            marginBottom: "5px",
                        }}
                    >
                        {isDragActive
                            ? "Dosyaları buraya bırakın"
                            : "Sürükle & bırak"}
                    </strong>

                    <span>
                        JSON dosyasını ve görsel klasörünü aynı anda sürükleyebilirsiniz.
                        İsterseniz JSON + ZIP de bırakabilirsiniz.
                    </span>
                </div>

                <UploadFileCard
                    title="JSON veri dosyası"
                    description="Kültürel miras kayıtlarını içeren ana veri dosyası."
                    accept=".json,application/json"
                    required
                    file={
                        jsonFile
                    }
                    inputRef={
                        jsonInputRef
                    }
                    onFileChange={
                        handleJsonFile
                    }
                    onRemove={() => {
                        setJsonFile(
                            null,
                        );

                        if (
                            jsonInputRef.current
                        ) {
                            jsonInputRef.current.value =
                                "";
                        }
                    }}
                />

                <div className="import-image-source-card">
                    <div className="import-image-source-card__header">
                        <div>
                            <h3>
                                Görseller
                            </h3>

                            <p>
                                ZIP, normal klasör veya
                                görselsiz aktarım
                                seçebilirsiniz. Görsel
                                klasörünü bu forma doğrudan
                                sürükleyip bırakabilirsiniz.
                            </p>
                        </div>

                        <span>
                            İsteğe bağlı
                        </span>
                    </div>

                    <div className="import-image-source-card__modes">
                        <ImageModeButton
                            active={
                                imageInputMode ===
                                "zip"
                            }
                            label="ZIP seç"
                            description="images.zip"
                            onClick={() => {
                                setImageMode(
                                    "zip",
                                );

                                zipInputRef.current?.click();
                            }}
                        />

                        <ImageModeButton
                            active={
                                imageInputMode ===
                                "folder"
                            }
                            label="Klasör seç"
                            description="Ziplenmemiş görseller"
                            onClick={() => {
                                setImageMode(
                                    "folder",
                                );

                                folderInputRef.current?.click();
                            }}
                        />

                        <ImageModeButton
                            active={
                                imageInputMode ===
                                "none"
                            }
                            label="Görselsiz"
                            description="Sadece JSON"
                            onClick={() =>
                                setImageMode(
                                    "none",
                                )
                            }
                        />
                    </div>

                    <input
                        ref={
                            zipInputRef
                        }
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        className="import-file-card__input"
                        onChange={(
                            event,
                        ) =>
                            handleZipFile(
                                event.target
                                    .files?.[0] ??
                                null,
                            )
                        }
                    />

                    <input
                        ref={
                            folderInputRef
                        }
                        type="file"
                        multiple
                        className="import-file-card__input"
                        onChange={(
                            event,
                        ) =>
                            handleFolderFiles(
                                event.target
                                    .files,
                            )
                        }
                        {...({
                            webkitdirectory: "",
                            directory: "",
                        } as React.InputHTMLAttributes<HTMLInputElement>)}
                    />

                    {imageInputMode ===
                        "zip" &&
                        imagesZipFile ? (
                        <SelectedImageSource
                            title={
                                imagesZipFile.name
                            }
                            description={
                                formatImportFileSize(
                                    imagesZipFile.size,
                                )
                            }
                            onRemove={() =>
                                setImageMode(
                                    "none",
                                )
                            }
                        />
                    ) : null}

                    {imageInputMode ===
                        "folder" &&
                        imageFolderFiles.length >
                        0 ? (
                        <SelectedImageSource
                            title={
                                imageFolderName ??
                                "Görsel klasörü"
                            }
                            description={`${imageFolderFiles.length} görsel · ${formatImportFileSize(
                                folderSize,
                            )}`}
                            onRemove={() =>
                                setImageMode(
                                    "none",
                                )
                            }
                        />
                    ) : null}

                    {imageInputMode ===
                        "none" ? (
                        <div className="import-image-source-card__empty">
                            <span>
                                Görsel yüklenmeyecek.
                                JSON doğrulamasına
                                görselsiz devam
                                edebilirsiniz.
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="import-upload-panel__metadata">
                <label>
                    <span>
                        Kaynak adı
                    </span>

                    <input
                        type="text"
                        value={
                            sourceName
                        }
                        onChange={(
                            event,
                        ) =>
                            setSourceName(
                                event.target
                                    .value,
                            )
                        }
                        placeholder="Örn. Ebru Tez Koleksiyonu"
                    />
                </label>

                <label>
                    <span>
                        Editör notu
                    </span>

                    <textarea
                        value={
                            notes
                        }
                        onChange={(
                            event,
                        ) =>
                            setNotes(
                                event.target
                                    .value,
                            )
                        }
                        placeholder="Bu aktarım hakkında kısa bir not ekleyebilirsiniz."
                        rows={4}
                    />
                </label>
            </div>

            {localError ? (
                <div
                    className="import-upload-panel__error"
                    role="alert"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        />

                        <path
                            d="M12 7v6M12 17h.01"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        />
                    </svg>

                    <span>
                        {localError}
                    </span>
                </div>
            ) : null}

            <div className="import-upload-panel__footer">
                <div className="import-upload-panel__note">
                    <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        aria-hidden="true"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                        />

                        <path
                            d="M12 10v6M12 7h.01"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                        />
                    </svg>

                    <p>
                        Boş ve
                        <code>
                            null
                        </code>
                        {" "}
                        alanlar tek başına hata
                        kabul edilmez. Zorunlu
                        alanlar doğrulama
                        aşamasında ayrıca kontrol
                        edilir.
                    </p>
                </div>

                <button
                    type="submit"
                    className="import-upload-panel__submit"
                    disabled={
                        !jsonFile ||
                        isSubmitting
                    }
                >
                    {isSubmitting
                        ? "Dosyalar hazırlanıyor..."
                        : "Doğrulamayı başlat"}

                    {!isSubmitting ? (
                        <svg
                            viewBox="0 0 24 24"
                            width="17"
                            height="17"
                            aria-hidden="true"
                        >
                            <path
                                d="M5 12h14M14 7l5 5-5 5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    ) : null}
                </button>
            </div>
        </form>
    );
}

type UploadFileCardProps = {
    title: string;

    description: string;

    accept: string;

    required?: boolean;

    file: File | null;

    inputRef:
    React.RefObject<HTMLInputElement | null>;

    onFileChange: (
        file: File | null,
    ) => void;

    onRemove: () => void;
};

function UploadFileCard({
    title,
    description,
    accept,
    required = false,
    file,
    inputRef,
    onFileChange,
    onRemove,
}: UploadFileCardProps) {
    return (
        <div
            className={
                file
                    ? "import-file-card import-file-card--selected"
                    : "import-file-card"
            }
        >
            <input
                ref={
                    inputRef
                }
                type="file"
                accept={
                    accept
                }
                className="import-file-card__input"
                onChange={(
                    event,
                ) =>
                    onFileChange(
                        event.target
                            .files?.[0] ??
                        null,
                    )
                }
            />

            <div className="import-file-card__top">
                <div className="import-file-card__icon">
                    {file ? (
                        <svg
                            viewBox="0 0 24 24"
                            width="22"
                            height="22"
                            aria-hidden="true"
                        >
                            <path
                                d="m6 12 4 4 8-9"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    ) : (
                        <svg
                            viewBox="0 0 24 24"
                            width="22"
                            height="22"
                            aria-hidden="true"
                        >
                            <path
                                d="M12 16V5M8 9l4-4 4 4M5 15v4h14v-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>

                <div>
                    <div className="import-file-card__title-row">
                        <h3>
                            {title}
                        </h3>

                        {required ? (
                            <span>
                                Zorunlu
                            </span>
                        ) : (
                            <span>
                                İsteğe bağlı
                            </span>
                        )}
                    </div>

                    <p>
                        {description}
                    </p>
                </div>
            </div>

            {file ? (
                <div className="import-file-card__selected-file">
                    <div>
                        <strong>
                            {file.name}
                        </strong>

                        <span>
                            {formatImportFileSize(
                                file.size,
                            )}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onRemove
                        }
                    >
                        Kaldır
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="import-file-card__choose"
                    onClick={() =>
                        inputRef.current?.click()
                    }
                >
                    Dosya seç

                    <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        aria-hidden="true"
                    >
                        <path
                            d="M7 12h10M13 8l4 4-4 4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}

type ImageModeButtonProps = {
    active: boolean;
    label: string;
    description: string;
    onClick: () => void;
};

function ImageModeButton({
    active,
    label,
    description,
    onClick,
}: ImageModeButtonProps) {
    return (
        <button
            type="button"
            className={
                active
                    ? "import-image-mode import-image-mode--active"
                    : "import-image-mode"
            }
            onClick={
                onClick
            }
        >
            <strong>
                {label}
            </strong>

            <span>
                {description}
            </span>
        </button>
    );
}

type SelectedImageSourceProps = {
    title: string;
    description: string;
    onRemove: () => void;
};

function SelectedImageSource({
    title,
    description,
    onRemove,
}: SelectedImageSourceProps) {
    return (
        <div className="import-image-source-card__selected">
            <div>
                <strong>
                    {title}
                </strong>

                <span>
                    {description}
                </span>
            </div>

            <button
                type="button"
                onClick={
                    onRemove
                }
            >
                Kaldır
            </button>
        </div>
    );
}

type DroppedEntry = {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    fullPath?: string;
};

type DroppedFileEntry =
    DroppedEntry & {
        file: (
            success: (file: File) => void,
            error?: (error: unknown) => void,
        ) => void;
    };

type DroppedDirectoryReader = {
    readEntries: (
        success: (entries: DroppedEntry[]) => void,
        error?: (error: unknown) => void,
    ) => void;
};

type DroppedDirectoryEntry =
    DroppedEntry & {
        createReader: () => DroppedDirectoryReader;
    };

type DataTransferItemWithEntry = {
    webkitGetAsEntry?: () =>
        DroppedEntry | null;
};

type DroppedFilesResult = {
    files: File[];
    rootFolderName: string | null;
};

async function collectDroppedFiles(
    dataTransfer: DataTransfer,
): Promise<DroppedFilesResult> {
    const items = Array.from(
        dataTransfer.items ?? [],
    );

    const entries = items
        .map((item) => {
            const typedItem =
                item as unknown as DataTransferItemWithEntry;

            return typedItem.webkitGetAsEntry?.() ??
                null;
        })
        .filter(
            (entry): entry is DroppedEntry =>
                entry !== null,
        );

    if (
        entries.length === 0
    ) {
        return {
            files: Array.from(
                dataTransfer.files ?? [],
            ),
            rootFolderName: null,
        };
    }

    const files: File[] = [];
    const directoryNames: string[] = [];

    for (const entry of entries) {
        if (entry.isDirectory) {
            directoryNames.push(
                entry.name,
            );
        }

        const entryFiles =
            await readDroppedEntry(
                entry,
                entry.isDirectory
                    ? entry.name
                    : "",
            );

        files.push(
            ...entryFiles,
        );
    }

    const firstRelativePath =
        files.find(
            isSupportedImageFile,
        )?.webkitRelativePath ??
        "";

    const inferredRootFromPath =
        firstRelativePath.includes("/")
            ? firstRelativePath.split("/")[0]
            : null;

    return {
        files,
        rootFolderName:
            directoryNames.length === 1
                ? directoryNames[0]
                : directoryNames.length > 1
                    ? "Sürüklenen görsel klasörleri"
                    : inferredRootFromPath,
    };
}

async function readDroppedEntry(
    entry: DroppedEntry,
    relativePath: string,
): Promise<File[]> {
    if (entry.isFile) {
        const fileEntry =
            entry as DroppedFileEntry;

        const file =
            await new Promise<File>(
                (resolve, reject) => {
                    fileEntry.file(
                        resolve,
                        reject,
                    );
                },
            );

        const nativeFullPath =
            normalizeDroppedPath(
                entry.fullPath,
            );

        const fallbackPath =
            relativePath
                ? `${relativePath}/${file.name}`
                : file.name;

        return [
            withRelativePath(
                file,
                nativeFullPath ||
                fallbackPath,
            ),
        ];
    }

    if (entry.isDirectory) {
        const directoryEntry =
            entry as DroppedDirectoryEntry;

        const reader =
            directoryEntry.createReader();

        const childEntries =
            await readAllDirectoryEntries(
                reader,
            );

        const files: File[] = [];

        for (const child of childEntries) {
            const childPath =
                relativePath
                    ? `${relativePath}/${child.name}`
                    : child.name;

            const childFiles =
                await readDroppedEntry(
                    child,
                    child.isDirectory
                        ? childPath
                        : relativePath,
                );

            files.push(
                ...childFiles,
            );
        }

        return files;
    }

    return [];
}

async function readAllDirectoryEntries(
    reader: DroppedDirectoryReader,
): Promise<DroppedEntry[]> {
    const entries: DroppedEntry[] = [];

    while (true) {
        const batch =
            await new Promise<DroppedEntry[]>(
                (resolve, reject) => {
                    reader.readEntries(
                        resolve,
                        reject,
                    );
                },
            );

        if (batch.length === 0) {
            break;
        }

        entries.push(...batch);
    }

    return entries;
}

function normalizeDroppedPath(
    value: string | undefined,
): string {
    if (!value) {
        return "";
    }

    return value
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/");
}

function withRelativePath(
    file: File,
    relativePath: string,
): File {
    const normalizedRelativePath =
        normalizeDroppedPath(
            relativePath,
        );

    // Drag & drop ile gelen native File nesnesindeki
    // webkitRelativePath alanı Chrome/Edge tarafında
    // salt-okunur olabilir. Bu nedenle original File'i
    // değiştirmek yerine yeni bir File klonlayıp relative
    // path bilgisini kendi property'miz olarak ekliyoruz.
    const clonedFile =
        new File(
            [file],
            file.name,
            {
                type: file.type,
                lastModified:
                    file.lastModified,
            },
        );

    try {
        Object.defineProperty(
            clonedFile,
            "webkitRelativePath",
            {
                configurable: true,
                enumerable: true,
                value:
                    normalizedRelativePath,
            },
        );
    } catch {
        // Çok eski / sıra dışı tarayıcılar için güvenli geri dönüş.
        // Böyle bir durumda dosya yine yüklenebilir fakat relative
        // path eşleştirmesi backend doğrulamasında başarısız olabilir.
    }

    return clonedFile;
}

function isJsonFile(
    file: File,
) {
    return file.name
        .toLocaleLowerCase(
            "tr-TR",
        )
        .endsWith(
            ".json",
        );
}

function isZipFile(
    file: File,
) {
    return file.name
        .toLocaleLowerCase(
            "tr-TR",
        )
        .endsWith(
            ".zip",
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

    const normalizedName =
        file.name.toLocaleLowerCase(
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
            normalizedName.endsWith(
                extension,
            ),
    );
}