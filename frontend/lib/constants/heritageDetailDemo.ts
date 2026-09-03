export type HeritageDetailMetadata = {
    label: string;
    value: string | null;
};

export type HeritageDetailRelation = {
    id: string;
    type:
    | "person"
    | "place"
    | "organization"
    | "heritage_asset"
    | "document";

    title: string;

    relationLabel: string;

    href: string;
};

export type HeritageDetailMedia = {
    id: string;

    src: string;

    alt: string;

    caption?: string | null;

    type:
    | "image"
    | "document";
};

export type HeritageDetailRecord = {
    id: string;

    title: string;

    shortTitle?: string | null;

    subfieldCode: string;

    subfieldTitle: string;

    recordType: "heritage_asset";

    summary: string | null;

    description: string | null;

    inventoryNumber?: string | null;

    period?: string | null;

    dating?: string | null;

    creator?: string | null;

    place?: string | null;

    collection?: string | null;

    technique?: string | null;

    material?: string | null;

    dimensions?: string | null;

    condition?: string | null;

    provenance?: string | null;

    bibliography?: string | null;

    metadata: HeritageDetailMetadata[];

    keywords: string[];

    media: HeritageDetailMedia[];

    relations: HeritageDetailRelation[];
};

export const HERITAGE_DETAIL_DEMO_RECORDS:
    HeritageDetailRecord[] = [
        {
            id: "demo-ebru-001",

            title: "Battal Ebru Örneği",

            shortTitle: "Battal Ebru",

            subfieldCode: "marbling",

            subfieldTitle: "Ebru Sanatı",

            recordType: "heritage_asset",

            summary:
                "Geleneksel battal ebru tekniğini temsil eden örnek kültürel miras kaydı.",

            description:
                "Yoğunlaştırılmış su yüzeyine serpilen boyaların müdahale edilmeden doğal biçimde yayılmasıyla oluşturulan battal ebru, geleneksel ebru sanatının temel uygulamalarından biridir. Bu demo kayıt, gerçek tez ve koleksiyon verileri sisteme bağlanmadan önce eser detay sayfasının bilgi mimarisini göstermek amacıyla kullanılmaktadır.",

            inventoryNumber: null,

            period: "Osmanlı / Geleneksel",

            dating: null,

            creator: null,

            place: "Türkiye",

            collection: null,

            technique: "Battal Ebru",

            material:
                "Kâğıt, boya ve yoğunlaştırılmış su",

            dimensions: null,

            condition: null,

            provenance: null,

            bibliography: null,

            metadata: [
                {
                    label: "Kültürel miras alanı",
                    value: "Ebru Sanatı",
                },
                {
                    label: "Dönem",
                    value: "Osmanlı / Geleneksel",
                },
                {
                    label: "Teknik",
                    value: "Battal Ebru",
                },
                {
                    label: "Malzeme",
                    value:
                        "Kâğıt, boya ve yoğunlaştırılmış su",
                },
                {
                    label: "Yer",
                    value: "Türkiye",
                },
            ],

            keywords: [
                "Ebru",
                "Battal Ebru",
                "Kâğıt Sanatları",
                "Geleneksel Sanatlar",
            ],

            media: [
                {
                    id: "demo-ebru-image-001",

                    src: "/images/heritage/ebru-battal-demo.svg",

                    alt: "Battal ebru sanatını temsil eden örnek görsel",

                    caption:
                        "Battal ebru için kullanılan demo görsel.",

                    type: "image",
                },
            ],

            relations: [
                {
                    id: "relation-paper-workshop",

                    type: "heritage_asset",

                    title:
                        "Kâğıt Sanatları Atölyesi",

                    relationLabel:
                        "İlişkili deneyim",

                    href: "/tur/paper-arts-workshop",
                },
            ],
        },

        {
            id: "demo-hat-001",

            title: "Hat Levhası",

            shortTitle: "Hat Levhası",

            subfieldCode: "calligraphy",

            subfieldTitle: "Hat Sanatı",

            recordType: "heritage_asset",

            summary:
                "Klasik hat geleneğinin kompozisyon ve yazı estetiğini temsil eden demo eser.",

            description:
                "Bu kayıt, geleneksel hat sanatı eserlerinin MirasExplorer içinde nasıl sunulacağını göstermek amacıyla hazırlanmış demo içeriktir. Gerçek veri bağlantısında sanatçı, yazı türü, tarih, koleksiyon, kaynak ve diğer ilişkiler veri tabanındaki gerçek kayıtlarla doldurulacaktır.",

            inventoryNumber: null,

            period: "Osmanlı",

            dating: null,

            creator: null,

            place: null,

            collection: null,

            technique: "Hat",

            material:
                "Kâğıt ve mürekkep",

            dimensions: null,

            condition: null,

            provenance: null,

            bibliography: null,

            metadata: [
                {
                    label: "Kültürel miras alanı",
                    value: "Hat Sanatı",
                },
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
                    value:
                        "Kâğıt ve mürekkep",
                },
            ],

            keywords: [
                "Hat",
                "Hattat",
                "Mürekkep",
                "Yazı Sanatları",
            ],

            media: [
                {
                    id: "demo-hat-image-001",

                    src: "/images/heritage/hat-levhasi-demo.svg",

                    alt: "Hat sanatını temsil eden örnek levha",

                    caption:
                        "Hat sanatı için kullanılan demo görsel.",

                    type: "image",
                },
            ],

            relations: [
                {
                    id: "relation-calligraphy-room",

                    type: "heritage_asset",

                    title:
                        "Hat Sanatı Odası",

                    relationLabel:
                        "İlişkili deneyim",

                    href: "/tur/calligraphy-room",
                },
                {
                    id: "demo-person-001",

                    type: "person",

                    title:
                        "Örnek Hattat Kaydı",

                    relationLabel:
                        "İlişkili kişi",

                    href: "/kisi/demo-person-001",
                },
            ],
        },

        {
            id: "demo-kuyum-001",

            title:
                "Geleneksel Mücevher Örneği",

            shortTitle:
                "Mücevher Örneği",

            subfieldCode: "jewelry",

            subfieldTitle:
                "Kuyumculuk",

            recordType: "heritage_asset",

            summary:
                "Geleneksel kuyumculuk tekniklerini temsil eden örnek kültürel miras kaydı.",

            description:
                "Metal işçiliği ve süsleme teknikleriyle oluşturulan geleneksel mücevherlerin MirasExplorer detay görünümündeki temsili için hazırlanmış demo kayıttır.",

            inventoryNumber: null,

            period: "Osmanlı",

            dating: null,

            creator: null,

            place: null,

            collection: null,

            technique: "Kuyumculuk",

            material: "Altın",

            dimensions: null,

            condition: null,

            provenance: null,

            bibliography: null,

            metadata: [
                {
                    label: "Kültürel miras alanı",
                    value: "Kuyumculuk",
                },
                {
                    label: "Dönem",
                    value: "Osmanlı",
                },
                {
                    label: "Teknik",
                    value: "Kuyumculuk",
                },
                {
                    label: "Malzeme",
                    value: "Altın",
                },
            ],

            keywords: [
                "Kuyumculuk",
                "Altın",
                "Metal İşçiliği",
                "Mücevher",
            ],

            media: [
                {
                    id: "demo-kuyum-image-001",

                    src: "/images/heritage/kuyumculuk-demo.svg",

                    alt: "Geleneksel kuyumculuk eserini temsil eden örnek görsel",

                    caption:
                        "Kuyumculuk için kullanılan demo görsel.",

                    type: "image",
                },
            ],

            relations: [
                {
                    id: "relation-jewelry-workshop",

                    type: "heritage_asset",

                    title:
                        "Kuyum Atölyesi",

                    relationLabel:
                        "İlişkili deneyim",

                    href: "/tur/jewelry-workshop",
                },
            ],
        },
    ];

export function getHeritageDetailDemoRecord(
    id: string,
) {
    return (
        HERITAGE_DETAIL_DEMO_RECORDS.find(
            (record) =>
                record.id === id,
        ) ?? null
    );
}