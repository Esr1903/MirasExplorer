export type FeaturedHeritageItem = {
    id: string;
    slug: string;

    title: string;
    subtitle?: string;

    categoryCode: string;
    categoryTitle: string;

    subfieldCode: string;
    subfieldTitle: string;

    maker?: {
        id?: string;
        name: string;
        role: string;
    };

    period?: string;
    dateLabel?: string;

    location?: {
        name: string;
        city?: string;
        country?: string;
    };

    collection?: string;

    material?: string[];
    technique?: string[];

    description: string;

    image: {
        src: string;
        alt: string;
        objectPosition?: string;
    };

    badges?: string[];

    featuredPriority: number;
};

export const FEATURED_HERITAGE_ITEMS: FeaturedHeritageItem[] = [
    {
        id: "demo-ebru-001",
        slug: "geleneksel-battal-ebru-ornek-1",

        title: "Battal Ebru Örneği",
        subtitle: "Geleneksel ebru kompozisyonu",

        categoryCode: "paper-book-writing-crafts",
        categoryTitle: "Kağıt, Kitap ve Yazı",

        subfieldCode: "marbling",
        subfieldTitle: "Ebru Sanatı",

        maker: {
            name: "Sanatçı bilgisi arşiv kaydından gelecek",
            role: "Ebru Sanatçısı",
        },

        period: "Osmanlı / Geleneksel",
        dateLabel: "Tarih bilgisi kayıtla eşleşecek",

        location: {
            name: "Koleksiyon bilgisi",
            country: "Türkiye",
        },

        material: [
            "Kağıt",
            "Doğal boya",
        ],

        technique: [
            "Battal ebru",
            "Kitreli su üzerine boya uygulaması",
        ],

        description:
            "Yoğunlaştırılmış su yüzeyine serpilen boyaların doğal yayılımıyla oluşturulan geleneksel ebru kompozisyonunu temsil eden örnek kayıt.",

        image: {
            src: "/images/heritage/ebru-battal-demo.svg",
            alt: "Battal ebru sanatını temsil eden örnek görsel",
        },

        badges: [
            "Ebru",
            "Kağıt Sanatları",
        ],

        featuredPriority: 1,
    },

    {
        id: "demo-hat-001",
        slug: "hat-levhasi-ornek-1",

        title: "Hat Levhası",
        subtitle: "Klasik yazı geleneğinden bir örnek",

        categoryCode: "paper-book-writing-crafts",
        categoryTitle: "Kağıt, Kitap ve Yazı",

        subfieldCode: "calligraphy",
        subfieldTitle: "Hat Sanatı",

        maker: {
            name: "Hattat bilgisi arşiv kaydından gelecek",
            role: "Hattat",
        },

        period: "Osmanlı",
        dateLabel: "Dönem bilgisi kayıtla eşleşecek",

        location: {
            name: "Koleksiyon bilgisi",
            country: "Türkiye",
        },

        material: [
            "Kağıt",
            "Mürekkep",
        ],

        technique: [
            "Hat",
            "Kamış kalem",
        ],

        description:
            "Klasik hat geleneğinin ölçü, ritim ve kompozisyon anlayışını temsil eden bir yazı eseri için hazırlanmış demo kayıt.",

        image: {
            src: "/images/heritage/hat-levhasi-demo.svg",
            alt: "Hat sanatını temsil eden örnek levha",
        },

        badges: [
            "Hat",
            "Yazı Sanatları",
        ],

        featuredPriority: 2,
    },

    {
        id: "demo-kuyum-001",
        slug: "osmanli-kuyumculuk-kolye-ornek-1",

        title: "Geleneksel Mücevher Örneği",
        subtitle: "Osmanlı kuyumculuk geleneği",

        categoryCode: "metal-mining-crafts",
        categoryTitle: "Metal ve Maden",

        subfieldCode: "jewelry",
        subfieldTitle: "Kuyumculuk",

        maker: {
            name: "Usta bilgisi arşiv kaydından gelecek",
            role: "Kuyum Ustası",
        },

        period: "Osmanlı",
        dateLabel: "Tarih bilgisi kayıtla eşleşecek",

        location: {
            name: "Koleksiyon bilgisi",
            country: "Türkiye",
        },

        material: [
            "Altın",
            "Değerli taş",
        ],

        technique: [
            "Kuyumculuk",
            "Taş yerleştirme",
        ],

        description:
            "Osmanlı dönemi kuyumculuk geleneğinin metal işçiliği ve bezeme anlayışını temsil etmek üzere hazırlanmış örnek eser kaydı.",

        image: {
            src: "/images/heritage/kuyumculuk-demo.svg",
            alt: "Geleneksel kuyumculuk eserini temsil eden örnek görsel",
        },

        badges: [
            "Kuyumculuk",
            "Metal",
        ],

        featuredPriority: 3,
    },

    {
        id: "demo-cini-001",
        slug: "geleneksel-cini-tabak-ornek-1",

        title: "Desenli Çini Eseri",
        subtitle: "Geleneksel sır altı bezeme",

        categoryCode: "stone-earth-glass-crafts",
        categoryTitle: "Taş, Toprak ve Cam",

        subfieldCode: "tile-ceramic-craft",
        subfieldTitle: "Çini ve Seramik",

        maker: {
            name: "Usta bilgisi arşiv kaydından gelecek",
            role: "Çini Ustası",
        },

        period: "Osmanlı / Geleneksel",
        dateLabel: "Tarih bilgisi kayıtla eşleşecek",

        location: {
            name: "Koleksiyon bilgisi",
            country: "Türkiye",
        },

        material: [
            "Seramik",
            "Sır",
        ],

        technique: [
            "Sır altı bezeme",
            "Fırınlama",
        ],

        description:
            "Geleneksel çini üretiminin desen, sır ve pişirme özelliklerini temsil eden örnek seramik eser kaydı.",

        image: {
            src: "/images/heritage/cini-demo.svg",
            alt: "Geleneksel çini sanatını temsil eden örnek eser",
        },

        badges: [
            "Çini",
            "Seramik",
        ],

        featuredPriority: 4,
    },

    {
        id: "demo-dokuma-001",
        slug: "geleneksel-kilim-ornek-1",

        title: "Geleneksel Kilim Dokuması",
        subtitle: "Anadolu dokuma geleneği",

        categoryCode: "textile-leather-fiber-crafts",
        categoryTitle: "Tekstil, Deri ve Lif",

        subfieldCode: "traditional-weaving",
        subfieldTitle: "Geleneksel Dokumacılık",

        maker: {
            name: "Dokuyucu bilgisi arşiv kaydından gelecek",
            role: "Dokuma Ustası",
        },

        period: "Geleneksel",
        dateLabel: "Dönem bilgisi kayıtla eşleşecek",

        location: {
            name: "Anadolu",
            country: "Türkiye",
        },

        material: [
            "Yün",
            "Doğal boya",
        ],

        technique: [
            "El dokuması",
            "Kilim tekniği",
        ],

        description:
            "Anadolu'nun geleneksel dokuma kültüründe kullanılan geometrik motif ve el tezgahı üretim anlayışını temsil eden demo eser.",

        image: {
            src: "/images/heritage/kilim-demo.svg",
            alt: "Geleneksel Anadolu kilimini temsil eden örnek görsel",
        },

        badges: [
            "Dokuma",
            "Tekstil",
        ],

        featuredPriority: 5,
    },

    {
        id: "demo-kundekari-001",
        slug: "kundekari-ahsap-pano-ornek-1",

        title: "Kündekâri Ahşap Pano",
        subtitle: "Geometrik ahşap geçme tekniği",

        categoryCode: "wood-plant-fiber-crafts",
        categoryTitle: "Ahşap ve Bitkisel Lif",

        subfieldCode: "kundekari",
        subfieldTitle: "Kündekâri",

        maker: {
            name: "Usta bilgisi arşiv kaydından gelecek",
            role: "Ahşap Ustası",
        },

        period: "Selçuklu / Osmanlı Geleneği",
        dateLabel: "Dönem bilgisi kayıtla eşleşecek",

        location: {
            name: "Koleksiyon bilgisi",
            country: "Türkiye",
        },

        material: [
            "Ahşap",
        ],

        technique: [
            "Kündekâri",
            "Geçme",
        ],

        description:
            "Çivi ve yapıştırıcı kullanılmadan geometrik ahşap parçaların bir araya getirilmesiyle oluşan geleneksel kündekâri tekniğini temsil eden örnek kayıt.",

        image: {
            src: "/images/heritage/kundekari-demo.svg",
            alt: "Kündekari ahşap işçiliğini temsil eden örnek pano",
        },

        badges: [
            "Kündekâri",
            "Ahşap",
        ],

        featuredPriority: 6,
    },
];

export const FEATURED_HERITAGE_ITEM_COUNT =
    FEATURED_HERITAGE_ITEMS.length;