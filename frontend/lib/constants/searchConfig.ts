export type SearchSortCode =
    | "relevance"
    | "title-asc"
    | "title-desc"
    | "newest"
    | "oldest";

export type SearchEntityTypeCode =
    | "all"
    | "heritage_asset"
    | "person"
    | "place"
    | "organization"
    | "cultural_document";

export type SearchViewMode =
    | "grid"
    | "list";

export type SearchFilterState = {
    query: string;

    entityType: SearchEntityTypeCode;

    subfields: string[];

    periods: string[];

    techniques: string[];

    materials: string[];

    places: string[];

    sort: SearchSortCode;

    view: SearchViewMode;
};

export type SearchOption<TCode extends string = string> = {
    code: TCode;
    label: string;
    description?: string;
};

export const SEARCH_QUERY_PARAM_KEYS = {
    query: "q",
    entityType: "tur",
    subfields: "alan",
    periods: "donem",
    techniques: "teknik",
    materials: "malzeme",
    places: "yer",
    sort: "sirala",
    view: "gorunum",
} as const;

export const SEARCH_ENTITY_TYPE_OPTIONS: SearchOption<SearchEntityTypeCode>[] =
    [
        {
            code: "all",
            label: "Tümü",
            description:
                "Eser, kişi, yer, kurum ve kültürel belgelerin tamamında ara.",
        },
        {
            code: "heritage_asset",
            label: "Eserler",
            description:
                "Taşınabilir kültürel miras eserlerini görüntüle.",
        },
        {
            code: "person",
            label: "Kişiler",
            description:
                "Sanatçı, usta, hattat, üretici ve ilişkili kişileri görüntüle.",
        },
        {
            code: "place",
            label: "Yerler",
            description:
                "Üretim, buluntu, koleksiyon ve ilişkili yerleri görüntüle.",
        },
        {
            code: "organization",
            label: "Kurumlar",
            description:
                "Müze, koleksiyon, kurum ve ilişkili kuruluşları görüntüle.",
        },
        {
            code: "cultural_document",
            label: "Belgeler",
            description:
                "Kaynak ve kültürel belge kayıtlarını görüntüle.",
        },
    ];

export const SEARCH_SORT_OPTIONS: SearchOption<SearchSortCode>[] =
    [
        {
            code: "relevance",
            label: "En ilgili",
        },
        {
            code: "title-asc",
            label: "Ada göre A–Z",
        },
        {
            code: "title-desc",
            label: "Ada göre Z–A",
        },
        {
            code: "newest",
            label: "En yeni tarih",
        },
        {
            code: "oldest",
            label: "En eski tarih",
        },
    ];

export const SEARCH_VIEW_OPTIONS: SearchOption<SearchViewMode>[] =
    [
        {
            code: "grid",
            label: "Kart görünümü",
        },
        {
            code: "list",
            label: "Liste görünümü",
        },
    ];

/*
 * Demo aşamasında aşağıdaki facet değerleri arayüzü
 * geliştirebilmek için kullanılıyor.
 *
 * Gerçek backend bağlantısında dönem / teknik / malzeme /
 * yer değerleri hard-code edilmeyecek.
 *
 * Bunlar:
 *
 *   GET /api/v1/search/facets
 *
 * benzeri bir endpoint üzerinden arama indeksinden gelecek.
 */

export const SEARCH_PERIOD_OPTIONS: SearchOption[] = [
    {
        code: "selcuklu",
        label: "Selçuklu",
    },
    {
        code: "osmanli",
        label: "Osmanlı",
    },
    {
        code: "erken-cumhuriyet",
        label: "Erken Cumhuriyet",
    },
    {
        code: "cumhuriyet",
        label: "Cumhuriyet",
    },
    {
        code: "geleneksel",
        label: "Geleneksel / Tarihi Belirsiz",
    },
];

export const SEARCH_TECHNIQUE_OPTIONS: SearchOption[] = [
    {
        code: "ebru",
        label: "Ebru",
    },
    {
        code: "hat",
        label: "Hat",
    },
    {
        code: "tezhip",
        label: "Tezhip",
    },
    {
        code: "minyatur",
        label: "Minyatür",
    },
    {
        code: "telkari",
        label: "Telkari",
    },
    {
        code: "kundekari",
        label: "Kündekâri",
    },
    {
        code: "sir-alti",
        label: "Sır Altı Bezeme",
    },
    {
        code: "el-dokumasi",
        label: "El Dokuması",
    },
];

export const SEARCH_MATERIAL_OPTIONS: SearchOption[] = [
    {
        code: "kagit",
        label: "Kâğıt",
    },
    {
        code: "ahsap",
        label: "Ahşap",
    },
    {
        code: "altin",
        label: "Altın",
    },
    {
        code: "gumus",
        label: "Gümüş",
    },
    {
        code: "bakir",
        label: "Bakır",
    },
    {
        code: "tas",
        label: "Taş",
    },
    {
        code: "seramik",
        label: "Seramik",
    },
    {
        code: "cam",
        label: "Cam",
    },
    {
        code: "yun",
        label: "Yün",
    },
    {
        code: "deri",
        label: "Deri",
    },
];

export const SEARCH_PLACE_OPTIONS: SearchOption[] = [
    {
        code: "istanbul",
        label: "İstanbul",
    },
    {
        code: "kutahya",
        label: "Kütahya",
    },
    {
        code: "iznik",
        label: "İznik",
    },
    {
        code: "erzurum",
        label: "Erzurum",
    },
    {
        code: "eskisehir",
        label: "Eskişehir",
    },
    {
        code: "konya",
        label: "Konya",
    },
    {
        code: "kayseri",
        label: "Kayseri",
    },
    {
        code: "amasya",
        label: "Amasya",
    },
];

export const DEFAULT_SEARCH_FILTER_STATE: SearchFilterState = {
    query: "",
    entityType: "all",
    subfields: [],
    periods: [],
    techniques: [],
    materials: [],
    places: [],
    sort: "relevance",
    view: "grid",
};

export const SEARCH_PAGE_SIZE = 24;

export const SEARCH_MIN_QUERY_LENGTH = 2;