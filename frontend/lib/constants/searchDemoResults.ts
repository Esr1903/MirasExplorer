import type { SearchResultCardItem } from "@/components/search/SearchResultCard";

export const SEARCH_DEMO_RESULTS: SearchResultCardItem[] = [
    {
        id: "demo-ebru-001",
        entityType: "heritage_asset",

        title: "Battal Ebru Örneği",
        subtitle: "Geleneksel ebru kompozisyonu",

        description:
            "Yoğunlaştırılmış su yüzeyine serpilen boyaların doğal yayılımıyla oluşturulan geleneksel ebru kompozisyonunu temsil eden örnek kayıt.",

        href: "/eser/demo-ebru-001",

        image: {
            src: "/images/heritage/ebru-battal-demo.svg",
            alt: "Battal ebru sanatını temsil eden örnek görsel",
        },

        eyebrow: "Ebru Sanatı",

        metadata: [
            {
                label: "Dönem",
                value: "Osmanlı / Geleneksel",
            },
            {
                label: "Teknik",
                value: "Battal Ebru",
            },
            {
                label: "Konum",
                value: "Türkiye",
            },
        ],

        badges: [
            "Ebru",
            "Kâğıt",
            "Geleneksel",
        ],
    },

    {
        id: "demo-hat-001",
        entityType: "heritage_asset",

        title: "Hat Levhası",
        subtitle: "Klasik yazı geleneğinden örnek",

        description:
            "Klasik hat geleneğinin ölçü, ritim ve kompozisyon anlayışını temsil eden örnek yazı eseri.",

        href: "/eser/demo-hat-001",

        image: {
            src: "/images/heritage/hat-levhasi-demo.svg",
            alt: "Hat sanatını temsil eden örnek levha",
        },

        eyebrow: "Hat Sanatı",

        metadata: [
            {
                label: "Dönem",
                value: "Osmanlı",
            },
            {
                label: "Teknik",
                value: "Hat",
            },
            {
                label: "Malzeme",
                value: "Kâğıt ve Mürekkep",
            },
        ],

        badges: [
            "Hat",
            "Yazı Sanatları",
        ],
    },

    {
        id: "demo-kuyum-001",
        entityType: "heritage_asset",

        title: "Geleneksel Mücevher Örneği",
        subtitle: "Osmanlı kuyumculuk geleneği",

        description:
            "Geleneksel metal işçiliği, taş yerleştirme ve kuyumculuk tekniklerini temsil eden örnek eser kaydı.",

        href: "/eser/demo-kuyum-001",

        image: {
            src: "/images/heritage/kuyumculuk-demo.svg",
            alt: "Geleneksel kuyumculuk eserini temsil eden örnek görsel",
        },

        eyebrow: "Kuyumculuk",

        metadata: [
            {
                label: "Dönem",
                value: "Osmanlı",
            },
            {
                label: "Malzeme",
                value: "Altın",
            },
            {
                label: "Teknik",
                value: "Kuyumculuk",
            },
        ],

        badges: [
            "Kuyumculuk",
            "Metal",
            "Altın",
        ],
    },

    {
        id: "demo-cini-001",
        entityType: "heritage_asset",

        title: "Desenli Çini Eseri",
        subtitle: "Geleneksel sır altı bezeme",

        description:
            "Geleneksel çini üretiminin desen, sır ve pişirme özelliklerini temsil eden örnek seramik eser kaydı.",

        href: "/eser/demo-cini-001",

        image: {
            src: "/images/heritage/cini-demo.svg",
            alt: "Geleneksel çini sanatını temsil eden örnek eser",
        },

        eyebrow: "Çini ve Seramik",

        metadata: [
            {
                label: "Teknik",
                value: "Sır Altı Bezeme",
            },
            {
                label: "Malzeme",
                value: "Seramik",
            },
            {
                label: "Yer",
                value: "İznik",
            },
        ],

        badges: [
            "Çini",
            "Seramik",
            "Sır Altı",
        ],
    },

    {
        id: "demo-kilim-001",
        entityType: "heritage_asset",

        title: "Geleneksel Kilim Dokuması",
        subtitle: "Anadolu dokuma geleneği",

        description:
            "Geometrik motifler ve el tezgâhı üretim anlayışıyla geleneksel Anadolu dokumacılığını temsil eden demo eser.",

        href: "/eser/demo-dokuma-001",

        image: {
            src: "/images/heritage/kilim-demo.svg",
            alt: "Geleneksel Anadolu kilimini temsil eden örnek görsel",
        },

        eyebrow: "Geleneksel Dokumacılık",

        metadata: [
            {
                label: "Teknik",
                value: "El Dokuması",
            },
            {
                label: "Malzeme",
                value: "Yün",
            },
            {
                label: "Yer",
                value: "Anadolu",
            },
        ],

        badges: [
            "Dokuma",
            "Kilim",
            "Yün",
        ],
    },

    {
        id: "demo-kundekari-001",
        entityType: "heritage_asset",

        title: "Kündekâri Ahşap Pano",
        subtitle: "Geometrik ahşap geçme tekniği",

        description:
            "Geometrik ahşap parçaların çivi ve yapıştırıcı kullanılmadan bir araya getirildiği geleneksel kündekâri tekniğini temsil eden örnek kayıt.",

        href: "/eser/demo-kundekari-001",

        image: {
            src: "/images/heritage/kundekari-demo.svg",
            alt: "Kündekâri ahşap işçiliğini temsil eden örnek pano",
        },

        eyebrow: "Kündekâri",

        metadata: [
            {
                label: "Dönem",
                value: "Selçuklu / Osmanlı",
            },
            {
                label: "Malzeme",
                value: "Ahşap",
            },
            {
                label: "Teknik",
                value: "Geçme",
            },
        ],

        badges: [
            "Kündekâri",
            "Ahşap",
        ],
    },

    {
        id: "demo-person-001",
        entityType: "person",

        title: "Örnek Hattat Kaydı",
        subtitle: "Sanatçı / Üretici kaydı",

        description:
            "Hat sanatı eserleriyle ilişkili kişi kayıtlarının arama sonuçlarında nasıl gösterileceğini temsil eden demo kişi kaydı.",

        href: "/kisi/demo-person-001",

        eyebrow: "Kişi",

        metadata: [
            {
                label: "Uzmanlık",
                value: "Hat Sanatı",
            },
            {
                label: "İlişkili Eser",
                value: "Hat Levhası",
            },
        ],

        badges: [
            "Hattat",
            "Sanatçı",
        ],
    },

    {
        id: "demo-place-001",
        entityType: "place",

        title: "İznik",
        subtitle: "Üretim ve kültürel miras merkezi",

        description:
            "Çini ve seramik üretimiyle ilişkilendirilen yer kayıtlarının arama sisteminde nasıl gösterileceğini temsil eden demo kayıt.",

        href: "/yer/demo-place-001",

        eyebrow: "Yer",

        metadata: [
            {
                label: "İl",
                value: "Bursa",
            },
            {
                label: "İlişkili Alan",
                value: "Çini ve Seramik",
            },
        ],

        badges: [
            "İznik",
            "Çini",
            "Üretim Merkezi",
        ],
    },

    {
        id: "demo-organization-001",
        entityType: "organization",

        title: "Örnek Müze Koleksiyonu",
        subtitle: "Kurum / koleksiyon kaydı",

        description:
            "Taşınabilir kültürel miras eserlerini barındıran kurum ve koleksiyon kayıtlarının arama sonucundaki demo gösterimi.",

        href: "/kurum/demo-organization-001",

        eyebrow: "Kurum",

        metadata: [
            {
                label: "Tür",
                value: "Müze",
            },
            {
                label: "Konum",
                value: "İstanbul",
            },
        ],

        badges: [
            "Müze",
            "Koleksiyon",
        ],
    },

    {
        id: "demo-document-001",
        entityType: "cultural_document",

        title: "Geleneksel Sanatlar Kaynak Belgesi",
        subtitle: "Kültürel belge / kaynak",

        description:
            "Eser, kişi, teknik ve yer kayıtlarına kanıt veya kaynak sağlayan kültürel belgelerin demo arama sonucu.",

        href: "/belge/demo-document-001",

        eyebrow: "Belge",

        metadata: [
            {
                label: "Belge Türü",
                value: "Kaynak",
            },
            {
                label: "Konu",
                value: "Geleneksel Sanatlar",
            },
        ],

        badges: [
            "Kaynak",
            "Belge",
        ],
    },
];

export const SEARCH_DEMO_RESULT_COUNT =
    SEARCH_DEMO_RESULTS.length;