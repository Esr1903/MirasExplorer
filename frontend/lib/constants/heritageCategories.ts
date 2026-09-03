export type HeritageSubfield = {
    code: string;
    title: string;
    shortTitle?: string;
    description: string;
    scene:
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
    featured?: boolean;
};

export type HeritageCategory = {
    code: string;
    title: string;
    shortTitle: string;
    description: string;
    indexLabel: string;
    subfields: HeritageSubfield[];
};

export const MOVABLE_HERITAGE_CATEGORIES: HeritageCategory[] = [
    {
        code: "stone-earth-glass-crafts",
        title: "Taş, Toprak ve Cam Odaklı Zanaatlar",
        shortTitle: "Taş, Toprak & Cam",
        indexLabel: "01",
        description:
            "Toprak, taş ve camın ateş, biçimlendirme, oyma ve bezeme teknikleriyle kültürel eserlere dönüştüğü geleneksel üretim alanları.",
        subfields: [
            {
                code: "tile-ceramic-craft",
                title: "Çinicilik ve Seramik Zanaatı",
                shortTitle: "Çini ve Seramik",
                description:
                    "Çamurun şekillendirilmesi, astarlanması, boyanması, sırlanması ve pişirilmesiyle üretilen geleneksel seramik ve çini eserleri.",
                scene: "ceramic_workshop",
                featured: true,
            },
            {
                code: "pottery",
                title: "Çömlekçilik (Bardakçılık)",
                shortTitle: "Çömlekçilik",
                description:
                    "Ham toprağın tezgâhta veya kalıpta el yordamıyla kap, mutfak eşyası ve saklama nesnelerine dönüştürülmesi.",
                scene: "ceramic_workshop",
            },
            {
                code: "stone-carving",
                title: "Taş İşçiliği ve Oymacılığı",
                shortTitle: "Taş İşçiliği",
                description:
                    "Mermer, kalker ve yerel taşların çekiç, murç ve kalem gibi araçlarla yontularak işlenmesi.",
                scene: "stone_workshop",
                featured: true,
            },
            {
                code: "meerschaum-oltu-craft",
                title: "Lületaşı ve Oltu Taşı Zanaatı",
                shortTitle: "Lületaşı & Oltu Taşı",
                description:
                    "Yarı değerli taşların el aletleriyle işlenerek süs eşyası, takı ve kullanım nesnesine dönüştürülmesi.",
                scene: "stone_workshop",
            },
            {
                code: "blown-glass",
                title: "Üfleme Cam (Çeşm-i Bülbül)",
                shortTitle: "Üfleme Cam",
                description:
                    "Pota içinde eritilmiş camın üfleme çubuklarıyla biçimlendirilerek geleneksel cam eserlerine dönüştürülmesi.",
                scene: "glass_workshop",
                featured: true,
            },
            {
                code: "glass-beadwork",
                title: "Cam Boncukçuluk (Nazar Boncuğu)",
                shortTitle: "Cam Boncukçuluk",
                description:
                    "Atık veya ham camın ocakta eritilip el aletleriyle boncuk ve nazarlık biçiminde işlenmesi.",
                scene: "glass_workshop",
            },
            {
                code: "stained-glass",
                title: "Vitray",
                description:
                    "Renkli cam parçalarının kurşun çıtalarla birleştirilerek pencere ve dekoratif yüzeylere uygulanması.",
                scene: "glass_workshop",
            },
            {
                code: "sculptures",
                title: "Heykeller",
                description:
                    "Taş, toprak, metal veya farklı malzemeler kullanılarak biçimlendirilmiş üç boyutlu kültürel eserler.",
                scene: "stone_workshop",
            },
        ],
    },

    {
        code: "metal-mining-crafts",
        title: "Metal ve Maden Odaklı Zanaatlar",
        shortTitle: "Metal & Maden",
        indexLabel: "02",
        description:
            "Altın, gümüş, bakır, demir ve diğer madenlerin dövme, kakma, örme ve bezeme teknikleriyle işlendiği üretim gelenekleri.",
        subfields: [
            {
                code: "jewelry",
                title: "Kuyumculuk, Mücevher ve Takı Zanaatı",
                shortTitle: "Kuyumculuk",
                description:
                    "Altın ve gümüşün el işçiliğiyle işlenmesi, süslenmesi ve değerli taşlarla birleştirilmesi.",
                scene: "jewelry_workshop",
                featured: true,
            },
            {
                code: "blacksmith-farriery",
                title: "Demircilik ve Nalbantlık",
                shortTitle: "Demircilik",
                description:
                    "Demirin ocakta kızdırılıp örs üzerinde çekiçle dövülerek biçimlendirilmesi.",
                scene: "metal_workshop",
            },
            {
                code: "coins",
                title: "Sikkeler",
                description:
                    "Tarih boyunca ekonomik, siyasi ve kültürel bilgi taşıyan metal para ve sikke örnekleri.",
                scene: "metal_workshop",
                featured: true,
            },
            {
                code: "copperware-cauldron",
                title: "Bakırcılık ve Kazancılık",
                shortTitle: "Bakırcılık",
                description:
                    "Bakır levhaların örs üzerinde dövülerek kullanım eşyalarına dönüştürülmesi ve kalaylanması geleneği.",
                scene: "metal_workshop",
            },
            {
                code: "filigree",
                title: "Telkari",
                description:
                    "Gümüş veya altın ince tellerin bükülüp örülerek dantel benzeri bezemelere dönüştürüldüğü teknik.",
                scene: "jewelry_workshop",
                featured: true,
            },
            {
                code: "niello-inlay",
                title: "Savat Kakma",
                description:
                    "Gümüş yüzeylere koyu renkli alaşım kakılarak desen ve bezeme oluşturulan metal işleme tekniği.",
                scene: "metal_workshop",
            },
            {
                code: "weapons-blades",
                title: "Silahlar ve Bıçak/Kılıç Yapımı",
                shortTitle: "Silah & Kılıç Yapımı",
                description:
                    "Çeliğin su verilerek kesici araçlara dönüştürülmesi ve saplarının geleneksel malzemelerle işlenmesi.",
                scene: "metal_workshop",
            },
        ],
    },

    {
        code: "wood-plant-fiber-crafts",
        title: "Ahşap, Ağaç ve Bitkisel Lif Odaklı Zanaatlar",
        shortTitle: "Ahşap & Bitkisel Lif",
        indexLabel: "03",
        description:
            "Ahşap ve bitkisel liflerin oyma, geçme, örme, kakma ve tornalama teknikleriyle işlendiği geleneksel zanaatlar.",
        subfields: [
            {
                code: "wood-carving-inlay",
                title: "Oymaçılık ve Kakmacılık",
                shortTitle: "Oyma & Kakma",
                description:
                    "Ahşap yüzeylerin keskiyle oyulması veya sedef, fildişi ve benzeri malzemelerin yüzeye gömülmesi.",
                scene: "wood_workshop",
                featured: true,
            },
            {
                code: "kundekari",
                title: "Kündekâri",
                description:
                    "Çivi ve tutkal kullanılmadan geometrik ahşap parçaların birbirine geçirilmesiyle oluşturulan geleneksel teknik.",
                scene: "wood_workshop",
                featured: true,
            },
            {
                code: "basketry-mat-weaving",
                title: "Sepetçilik ve Hasır Örücülüğü",
                shortTitle: "Sepetçilik & Hasır",
                description:
                    "Söğüt dalı, saz, kamış ve benzeri bitkisel malzemelerin örülerek günlük kullanım nesnelerine dönüştürülmesi.",
                scene: "wood_workshop",
            },
            {
                code: "walking-stick-spoon",
                title: "Bastonculuk ve Kaşıkçılık",
                shortTitle: "Baston & Kaşık",
                description:
                    "Sert ağaçların torna, bıçak ve el aletleriyle yontularak baston, kaşık ve benzeri eşyalara dönüştürülmesi.",
                scene: "wood_workshop",
            },
        ],
    },

    {
        code: "textile-leather-fiber-crafts",
        title: "Tekstil, Deri ve Lif Odaklı Zanaatlar",
        shortTitle: "Tekstil, Deri & Lif",
        indexLabel: "04",
        description:
            "Dokuma, deri işleme, keçeleştirme, örgü ve nakış teknikleriyle üretilen giyim, dokuma ve süsleme gelenekleri.",
        subfields: [
            {
                code: "clothing",
                title: "Kıyafetler",
                description:
                    "Tarihî dönemlere, topluluklara ve kullanım bağlamlarına ait geleneksel giyim ve tamamlayıcı kıyafet unsurları.",
                scene: "textile_workshop",
                featured: true,
            },
            {
                code: "traditional-weaving",
                title: "Geleneksel Dokumacılık",
                shortTitle: "Dokumacılık",
                description:
                    "Yün, ipek, pamuk ve keten ipliklerinin el tezgâhlarında kumaş, halı, kilim ve benzeri dokumalara dönüştürülmesi.",
                scene: "textile_workshop",
                featured: true,
            },
            {
                code: "traditional-leatherwork",
                title: "Geleneksel Dericilik (Debbağlık)",
                shortTitle: "Dericilik",
                description:
                    "Ham derinin geleneksel yöntemlerle işlenip giyim, ayakkabı ve saraciye ürünlerine dönüştürülmesi.",
                scene: "textile_workshop",
            },
            {
                code: "feltmaking",
                title: "Keçecilik",
                description:
                    "Yün liflerinin sıcak su, sabun ve basınç yardımıyla birbirine kenetlenerek keçe haline getirilmesi.",
                scene: "textile_workshop",
            },
            {
                code: "needle-lace-embroidery",
                title: "İğne Oyası ve Nakış Zanaatı",
                shortTitle: "İğne Oyası & Nakış",
                description:
                    "İpek veya pamuk ipliklerinin iğne ve tığ yardımıyla örülerek süsleme ve bezeme öğelerine dönüştürülmesi.",
                scene: "textile_workshop",
                featured: true,
            },
        ],
    },

    {
        code: "paper-book-writing-crafts",
        title: "Kağıt, Kitap ve Yazı Odaklı Zanaatlar",
        shortTitle: "Kağıt, Kitap & Yazı",
        indexLabel: "05",
        description:
            "Yazı, kitap ve kâğıt kültürü çevresinde gelişen ebru, hat, tezhip, minyatür ve cilt sanatlarının ortak dünyası.",
        subfields: [
            {
                code: "marbling",
                title: "Ebru Sanatı (Kitre Sanatı)",
                shortTitle: "Ebru Sanatı",
                description:
                    "Yoğunlaştırılmış su üzerine doğal boyaların damlatılıp şekillendirilmesi ve desenin kâğıda aktarılması.",
                scene: "paper_art_workshop",
                featured: true,
            },
            {
                code: "calligraphy",
                title: "Hat Sanatı (Kaligrafi)",
                shortTitle: "Hat Sanatı",
                description:
                    "Kamış kalem ve özel mürekkep kullanılarak yazıya estetik, ritmik ve geometrik ölçülerle biçim verilmesi.",
                scene: "calligraphy_room",
                featured: true,
            },
            {
                code: "illumination",
                title: "Tezhip",
                description:
                    "El yazması kitapların ve hat levhalarının altın, boya ve ince motiflerle süslendiği geleneksel bezeme sanatı.",
                scene: "paper_art_workshop",
                featured: true,
            },
            {
                code: "miniature",
                title: "Minyatür",
                description:
                    "Tarihî olay ve hikâyelerin perspektifsiz, ayrıntılı ve ince işçilikli resimlerle kâğıda aktarılması.",
                scene: "paper_art_workshop",
                featured: true,
            },
            {
                code: "bookbinding",
                title: "Ciltçilik (Mücellitlik)",
                shortTitle: "Ciltçilik",
                description:
                    "Yazma eserlerin deri, mukavva ve bezeme teknikleri kullanılarak kitap formunda birleştirilmesi.",
                scene: "paper_art_workshop",
            },
        ],
    },

    {
        code: "daily-life-tools",
        title: "Günlük Yaşam Araçları",
        shortTitle: "Günlük Yaşam",
        indexLabel: "06",
        description:
            "Geçmiş toplumların beslenme, barınma, tarım, hayvancılık, üretim ve gündelik ihtiyaçlarını karşılayan taşınabilir nesneler.",
        subfields: [
            {
                code: "daily-life-tools",
                title: "Günlük Yaşam Araçları",
                description:
                    "Gündelik yaşamda kullanılan ev, mutfak, tarım, hayvancılık, üretim, taşıma ve benzeri kullanım nesneleri.",
                scene: "daily_life_room",
                featured: true,
            },
        ],
    },
];

export const MOVABLE_HERITAGE_SUBFIELDS =
    MOVABLE_HERITAGE_CATEGORIES.flatMap(
        (category) => category.subfields,
    );

export const MOVABLE_HERITAGE_CATEGORY_COUNT =
    MOVABLE_HERITAGE_CATEGORIES.length;

export const MOVABLE_HERITAGE_SUBFIELD_COUNT =
    MOVABLE_HERITAGE_SUBFIELDS.length;