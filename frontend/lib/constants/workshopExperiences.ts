export type WorkshopExperience = {
    code: string;
    title: string;
    shortTitle: string;
    eyebrow: string;

    sceneType:
    | "ceramic_workshop"
    | "stone_workshop"
    | "glass_workshop"
    | "metal_workshop"
    | "jewelry_workshop"
    | "wood_workshop"
    | "textile_workshop"
    | "paper_art_workshop"
    | "calligraphy_room"
    | "daily_life_room";

    description: string;

    atmosphere: string;

    relatedSubfields: string[];

    relatedSubfieldTitles: string[];

    visual:
    | "ceramic"
    | "stone"
    | "glass"
    | "metal"
    | "jewelry"
    | "wood"
    | "textile"
    | "paper"
    | "calligraphy"
    | "daily-life";

    featured?: boolean;

    order: number;
};

export const WORKSHOP_EXPERIENCES: WorkshopExperience[] = [
    {
        code: "paper-arts-workshop",
        title: "Kâğıt Sanatları Atölyesi",
        shortTitle: "Kâğıt Atölyesi",
        eyebrow: "Mürekkep · Boya · Kâğıt",
        sceneType: "paper_art_workshop",

        description:
            "Ebru, tezhip, minyatür ve cilt sanatlarını aynı üretim atmosferi içinde keşfedin. Masalara, kâğıtlara ve sergilenen eserlere yaklaşarak kayıtlar arasında gezinin.",

        atmosphere:
            "Doğal kâğıt tonları, pigment kapları, ebru tekneleri, yazma eserler ve yumuşak atölye ışığı.",

        relatedSubfields: [
            "marbling",
            "illumination",
            "miniature",
            "bookbinding",
        ],

        relatedSubfieldTitles: [
            "Ebru Sanatı",
            "Tezhip",
            "Minyatür",
            "Ciltçilik",
        ],

        visual: "paper",

        featured: true,

        order: 1,
    },

    {
        code: "calligraphy-room",
        title: "Hat Sanatı Odası",
        shortTitle: "Hat Odası",
        eyebrow: "Kalem · Mürekkep · Levha",
        sceneType: "calligraphy_room",

        description:
            "Hat levhalarının duvarlarda sergilendiği sakin bir yazı odasına girin. Hattatları, yazı türlerini ve eserlerin dönemsel ilişkilerini sahne üzerinden inceleyin.",

        atmosphere:
            "Koyu ahşap, sıcak duvar ışıkları, kamış kalemler, mürekkep hokkaları ve çerçeveli hat levhaları.",

        relatedSubfields: [
            "calligraphy",
        ],

        relatedSubfieldTitles: [
            "Hat Sanatı",
        ],

        visual: "calligraphy",

        featured: true,

        order: 2,
    },

    {
        code: "jewelry-workshop",
        title: "Kuyum Atölyesi",
        shortTitle: "Kuyum Atölyesi",
        eyebrow: "Altın · Gümüş · Taş",
        sceneType: "jewelry_workshop",

        description:
            "Geleneksel kuyumculuk eserlerini çalışma tezgâhları, vitrinler ve üretim araçları arasında keşfedin. Takıların ustalarını, malzemelerini ve tekniklerini inceleyin.",

        atmosphere:
            "Koyu taş duvarlar, pirinç detaylar, kuyumcu tezgâhları, küçük spot ışıkları ve vitrinlerde mücevherler.",

        relatedSubfields: [
            "jewelry",
            "filigree",
        ],

        relatedSubfieldTitles: [
            "Kuyumculuk",
            "Telkari",
        ],

        visual: "jewelry",

        featured: true,

        order: 3,
    },

    {
        code: "metal-workshop",
        title: "Metal Ustaları Atölyesi",
        shortTitle: "Metal Atölyesi",
        eyebrow: "Ateş · Örs · Maden",
        sceneType: "metal_workshop",

        description:
            "Bakırdan demire, sikkelerden savat kakmaya uzanan metal işleme geleneğini üretim araçları ve eser örnekleri üzerinden keşfedin.",

        atmosphere:
            "Dövme örsleri, bakır kaplar, ocak ışığı, metal yüzeyler ve üretim izlerini taşıyan çalışma masaları.",

        relatedSubfields: [
            "blacksmith-farriery",
            "coins",
            "copperware-cauldron",
            "niello-inlay",
            "weapons-blades",
        ],

        relatedSubfieldTitles: [
            "Demircilik",
            "Sikkeler",
            "Bakırcılık",
            "Savat Kakma",
            "Silah ve Kılıç Yapımı",
        ],

        visual: "metal",

        order: 4,
    },

    {
        code: "ceramic-workshop",
        title: "Çini ve Seramik Atölyesi",
        shortTitle: "Seramik Atölyesi",
        eyebrow: "Toprak · Sır · Ateş",
        sceneType: "ceramic_workshop",

        description:
            "Çamurun şekillendirilmesinden sır ve fırınlama aşamasına kadar geleneksel seramik üretimini atölye ortamında keşfedin.",

        atmosphere:
            "Seramik tezgâhları, pigment kaseleri, desenli çiniler, fırın dokuları ve doğal toprak tonları.",

        relatedSubfields: [
            "tile-ceramic-craft",
            "pottery",
        ],

        relatedSubfieldTitles: [
            "Çini ve Seramik",
            "Çömlekçilik",
        ],

        visual: "ceramic",

        featured: true,

        order: 5,
    },

    {
        code: "glass-workshop",
        title: "Cam Atölyesi",
        shortTitle: "Cam Atölyesi",
        eyebrow: "Işık · Ateş · Cam",
        sceneType: "glass_workshop",

        description:
            "Üfleme camdan nazar boncuğuna ve vitraya uzanan üretim tekniklerini ışıkla yaşayan bir cam atölyesinde keşfedin.",

        atmosphere:
            "Parlak cam yüzeyler, sıcak fırın ışığı, renkli vitray yansımaları ve cam üfleme araçları.",

        relatedSubfields: [
            "blown-glass",
            "glass-beadwork",
            "stained-glass",
        ],

        relatedSubfieldTitles: [
            "Üfleme Cam",
            "Cam Boncukçuluk",
            "Vitray",
        ],

        visual: "glass",

        order: 6,
    },

    {
        code: "stone-workshop",
        title: "Taş Ustaları Atölyesi",
        shortTitle: "Taş Atölyesi",
        eyebrow: "Taş · Oyma · Biçim",
        sceneType: "stone_workshop",

        description:
            "Taş işçiliğini, oyma tekniklerini ve yarı değerli taşların üretim süreçlerini tarihî bir usta atölyesi atmosferinde inceleyin.",

        atmosphere:
            "Taş bloklar, oyma takımları, mermer yüzeyler, yarı değerli taş örnekleri ve keskin yan ışıklar.",

        relatedSubfields: [
            "stone-carving",
            "meerschaum-oltu-craft",
            "sculptures",
        ],

        relatedSubfieldTitles: [
            "Taş İşçiliği",
            "Lületaşı ve Oltu Taşı",
            "Heykeller",
        ],

        visual: "stone",

        order: 7,
    },

    {
        code: "wood-workshop",
        title: "Ahşap Ustaları Atölyesi",
        shortTitle: "Ahşap Atölyesi",
        eyebrow: "Ahşap · Oyma · Geçme",
        sceneType: "wood_workshop",

        description:
            "Kündekâri, oyma, kakma ve geleneksel ahşap üretim tekniklerini malzemenin dokusunu öne çıkaran bir marangoz atölyesinde keşfedin.",

        atmosphere:
            "Masif ahşap yüzeyler, geometrik geçme panoları, oyma takımları ve sıcak gün ışığı.",

        relatedSubfields: [
            "wood-carving-inlay",
            "kundekari",
            "basketry-mat-weaving",
            "walking-stick-spoon",
        ],

        relatedSubfieldTitles: [
            "Oyma ve Kakma",
            "Kündekâri",
            "Sepetçilik ve Hasır",
            "Baston ve Kaşık",
        ],

        visual: "wood",

        featured: true,

        order: 8,
    },

    {
        code: "textile-workshop",
        title: "Dokuma ve Tekstil Atölyesi",
        shortTitle: "Dokuma Atölyesi",
        eyebrow: "İplik · Dokuma · Motif",
        sceneType: "textile_workshop",

        description:
            "Kilimlerden geleneksel kıyafetlere, keçeden nakışa kadar tekstil kültürünü tezgâhlar ve dokuma yüzeyleri arasında keşfedin.",

        atmosphere:
            "Ahşap dokuma tezgâhları, asılı kilimler, doğal iplikler, kumaş katmanları ve yumuşak gün ışığı.",

        relatedSubfields: [
            "clothing",
            "traditional-weaving",
            "traditional-leatherwork",
            "feltmaking",
            "needle-lace-embroidery",
        ],

        relatedSubfieldTitles: [
            "Kıyafetler",
            "Geleneksel Dokumacılık",
            "Dericilik",
            "Keçecilik",
            "İğne Oyası ve Nakış",
        ],

        visual: "textile",

        featured: true,

        order: 9,
    },

    {
        code: "daily-life-room",
        title: "Geleneksel Yaşam Odası",
        shortTitle: "Yaşam Odası",
        eyebrow: "Ev · Üretim · Gündelik Hayat",
        sceneType: "daily_life_room",

        description:
            "Geçmiş toplumların günlük yaşamda kullandığı araçları, mutfak nesnelerini, üretim gereçlerini ve gündelik eşyaları bağlamlarıyla keşfedin.",

        atmosphere:
            "Geleneksel ev içi düzen, ahşap raflar, gündelik kullanım nesneleri ve doğal yaşam atmosferi.",

        relatedSubfields: [
            "daily-life-tools",
        ],

        relatedSubfieldTitles: [
            "Günlük Yaşam Araçları",
        ],

        visual: "daily-life",

        order: 10,
    },
];

export const FEATURED_WORKSHOP_EXPERIENCES =
    WORKSHOP_EXPERIENCES
        .filter((experience) => experience.featured)
        .sort((a, b) => a.order - b.order);

export const WORKSHOP_EXPERIENCE_COUNT =
    WORKSHOP_EXPERIENCES.length;