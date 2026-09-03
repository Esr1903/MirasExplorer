"use client";

import {
    useMemo,
    useState,
} from "react";

import {
    SEARCH_ENTITY_TYPE_OPTIONS,
    SEARCH_MATERIAL_OPTIONS,
    SEARCH_PERIOD_OPTIONS,
    SEARCH_PLACE_OPTIONS,
    SEARCH_TECHNIQUE_OPTIONS,
    type SearchEntityTypeCode,
    type SearchFilterState,
} from "@/lib/constants/searchConfig";

import {
    MOVABLE_HERITAGE_SUBFIELDS,
} from "@/lib/constants/heritageCategories";

type SearchFiltersProps = {
    filters: SearchFilterState;

    onEntityTypeChange: (
        value: SearchEntityTypeCode,
    ) => void;

    onToggleSubfield: (
        code: string,
    ) => void;

    onTogglePeriod: (
        code: string,
    ) => void;

    onToggleTechnique: (
        code: string,
    ) => void;

    onToggleMaterial: (
        code: string,
    ) => void;

    onTogglePlace: (
        code: string,
    ) => void;

    onClearFilters: () => void;
};

type FilterSectionKey =
    | "entity"
    | "subfields"
    | "periods"
    | "techniques"
    | "materials"
    | "places";

type FilterOption = {
    code: string;
    label: string;
};

export function SearchFilters({
    filters,
    onEntityTypeChange,
    onToggleSubfield,
    onTogglePeriod,
    onToggleTechnique,
    onToggleMaterial,
    onTogglePlace,
    onClearFilters,
}: SearchFiltersProps) {
    const [
        openSections,
        setOpenSections,
    ] = useState<
        Record<
            FilterSectionKey,
            boolean
        >
    >({
        entity: true,
        subfields: true,
        periods: false,
        techniques: false,
        materials: false,
        places: false,
    });

    const [
        subfieldQuery,
        setSubfieldQuery,
    ] = useState("");

    const activeFilterCount =
        useMemo(() => {
            return (
                filters.subfields.length +
                filters.periods.length +
                filters.techniques.length +
                filters.materials.length +
                filters.places.length +
                (filters.entityType !== "all"
                    ? 1
                    : 0)
            );
        }, [filters]);

    const subfieldOptions =
        useMemo<FilterOption[]>(() => {
            return MOVABLE_HERITAGE_SUBFIELDS
                .map((subfield) => ({
                    code: subfield.code,
                    label:
                        subfield.shortTitle ??
                        subfield.title,
                }))
                .sort((a, b) =>
                    a.label.localeCompare(
                        b.label,
                        "tr-TR",
                        {
                            sensitivity: "base",
                        },
                    ),
                );
        }, []);

    const filteredSubfieldOptions =
        useMemo(() => {
            const normalizedQuery =
                subfieldQuery
                    .trim()
                    .toLocaleLowerCase(
                        "tr-TR",
                    );

            if (!normalizedQuery) {
                return subfieldOptions;
            }

            return subfieldOptions.filter(
                (option) =>
                    option.label
                        .toLocaleLowerCase(
                            "tr-TR",
                        )
                        .includes(
                            normalizedQuery,
                        ),
            );
        }, [
            subfieldOptions,
            subfieldQuery,
        ]);

    function toggleSection(
        section: FilterSectionKey,
    ) {
        setOpenSections(
            (current) => ({
                ...current,
                [section]:
                    !current[section],
            }),
        );
    }

    return (
        <aside
            className="search-filters"
            aria-label="Arama filtreleri"
        >
            <div className="search-filters__header">
                <div>
                    <p className="search-filters__eyebrow">
                        Filtreler
                    </p>

                    <h2 className="search-filters__title">
                        Sonuçları daralt
                    </h2>
                </div>

                {activeFilterCount > 0 ? (
                    <button
                        type="button"
                        className="search-filters__clear"
                        onClick={
                            onClearFilters
                        }
                    >
                        Temizle
                    </button>
                ) : null}
            </div>

            {activeFilterCount > 0 ? (
                <div className="search-filters__active-count">
                    <strong>
                        {activeFilterCount}
                    </strong>

                    <span>
                        aktif filtre
                    </span>
                </div>
            ) : null}

            <FilterAccordion
                title="Kayıt türü"
                isOpen={
                    openSections.entity
                }
                activeCount={
                    filters.entityType !==
                        "all"
                        ? 1
                        : 0
                }
                onToggle={() =>
                    toggleSection(
                        "entity",
                    )
                }
            >
                <div className="search-filter-type-list">
                    {SEARCH_ENTITY_TYPE_OPTIONS.map(
                        (option) => {
                            const isActive =
                                filters.entityType ===
                                option.code;

                            return (
                                <button
                                    key={
                                        option.code
                                    }
                                    type="button"
                                    className={
                                        isActive
                                            ? "search-filter-type search-filter-type--active"
                                            : "search-filter-type"
                                    }
                                    onClick={() =>
                                        onEntityTypeChange(
                                            option.code,
                                        )
                                    }
                                >
                                    <span>
                                        {
                                            option.label
                                        }
                                    </span>

                                    {isActive ? (
                                        <span
                                            className="search-filter-type__dot"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                </button>
                            );
                        },
                    )}
                </div>
            </FilterAccordion>

            <FilterAccordion
                title="Kültürel miras alanı"
                isOpen={
                    openSections.subfields
                }
                activeCount={
                    filters.subfields.length
                }
                onToggle={() =>
                    toggleSection(
                        "subfields",
                    )
                }
            >
                <div className="search-filter-search">
                    <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        aria-hidden="true"
                    >
                        <path
                            d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                        />
                    </svg>

                    <input
                        type="search"
                        value={
                            subfieldQuery
                        }
                        onChange={(
                            event,
                        ) =>
                            setSubfieldQuery(
                                event.target
                                    .value,
                            )
                        }
                        placeholder="Alan ara..."
                        aria-label="Kültürel miras alanlarında ara"
                    />

                    {subfieldQuery ? (
                        <button
                            type="button"
                            className="search-filter-search__clear"
                            onClick={() =>
                                setSubfieldQuery(
                                    "",
                                )
                            }
                            aria-label="Alan aramasını temizle"
                        >
                            ×
                        </button>
                    ) : null}
                </div>

                {filteredSubfieldOptions.length >
                    0 ? (
                    <FilterCheckboxList
                        options={
                            filteredSubfieldOptions
                        }
                        selected={
                            filters.subfields
                        }
                        onToggle={
                            onToggleSubfield
                        }
                    />
                ) : (
                    <p className="search-filter-empty">
                        Bu ifadeyle eşleşen
                        kültürel miras alanı
                        bulunamadı.
                    </p>
                )}
            </FilterAccordion>

            <FilterAccordion
                title="Dönem"
                isOpen={
                    openSections.periods
                }
                activeCount={
                    filters.periods.length
                }
                onToggle={() =>
                    toggleSection(
                        "periods",
                    )
                }
            >
                <FilterCheckboxList
                    options={
                        SEARCH_PERIOD_OPTIONS
                    }
                    selected={
                        filters.periods
                    }
                    onToggle={
                        onTogglePeriod
                    }
                />
            </FilterAccordion>

            <FilterAccordion
                title="Teknik"
                isOpen={
                    openSections.techniques
                }
                activeCount={
                    filters.techniques.length
                }
                onToggle={() =>
                    toggleSection(
                        "techniques",
                    )
                }
            >
                <FilterCheckboxList
                    options={
                        SEARCH_TECHNIQUE_OPTIONS
                    }
                    selected={
                        filters.techniques
                    }
                    onToggle={
                        onToggleTechnique
                    }
                />
            </FilterAccordion>

            <FilterAccordion
                title="Malzeme"
                isOpen={
                    openSections.materials
                }
                activeCount={
                    filters.materials.length
                }
                onToggle={() =>
                    toggleSection(
                        "materials",
                    )
                }
            >
                <FilterCheckboxList
                    options={
                        SEARCH_MATERIAL_OPTIONS
                    }
                    selected={
                        filters.materials
                    }
                    onToggle={
                        onToggleMaterial
                    }
                />
            </FilterAccordion>

            <FilterAccordion
                title="Yer"
                isOpen={
                    openSections.places
                }
                activeCount={
                    filters.places.length
                }
                onToggle={() =>
                    toggleSection(
                        "places",
                    )
                }
            >
                <FilterCheckboxList
                    options={
                        SEARCH_PLACE_OPTIONS
                    }
                    selected={
                        filters.places
                    }
                    onToggle={
                        onTogglePlace
                    }
                />
            </FilterAccordion>
        </aside>
    );
}

type FilterAccordionProps = {
    title: string;
    isOpen: boolean;
    activeCount: number;
    onToggle: () => void;
    children: React.ReactNode;
};

function FilterAccordion({
    title,
    isOpen,
    activeCount,
    onToggle,
    children,
}: FilterAccordionProps) {
    return (
        <section
            className={
                isOpen
                    ? "search-filter-group search-filter-group--open"
                    : "search-filter-group"
            }
        >
            <button
                type="button"
                className="search-filter-group__toggle"
                onClick={
                    onToggle
                }
                aria-expanded={
                    isOpen
                }
            >
                <span className="search-filter-group__heading">
                    <span>
                        {title}
                    </span>

                    {activeCount > 0 ? (
                        <strong>
                            {
                                activeCount
                            }
                        </strong>
                    ) : null}
                </span>

                <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    aria-hidden="true"
                    className="search-filter-group__chevron"
                >
                    <path
                        d="m7 10 5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isOpen ? (
                <div className="search-filter-group__content">
                    {children}
                </div>
            ) : null}
        </section>
    );
}

type FilterCheckboxListProps = {
    options: FilterOption[];

    selected: string[];

    onToggle: (
        code: string,
    ) => void;
};

function FilterCheckboxList({
    options,
    selected,
    onToggle,
}: FilterCheckboxListProps) {
    return (
        <div className="search-filter-checkbox-list">
            {options.map(
                (option) => {
                    const isChecked =
                        selected.includes(
                            option.code,
                        );

                    return (
                        <label
                            key={
                                option.code
                            }
                            className="search-filter-checkbox"
                        >
                            <input
                                type="checkbox"
                                checked={
                                    isChecked
                                }
                                onChange={() =>
                                    onToggle(
                                        option.code,
                                    )
                                }
                            />

                            <span
                                className="search-filter-checkbox__control"
                                aria-hidden="true"
                            >
                                {isChecked ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="13"
                                        height="13"
                                    >
                                        <path
                                            d="m6 12 4 4 8-9"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : null}
                            </span>

                            <span className="search-filter-checkbox__label">
                                {
                                    option.label
                                }
                            </span>
                        </label>
                    );
                },
            )}
        </div>
    );
}