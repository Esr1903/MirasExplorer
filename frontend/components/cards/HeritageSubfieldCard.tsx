import Link from "next/link";
import type { HeritageSubfield } from "@/lib/constants/heritageCategories";

type HeritageSubfieldCardProps = {
    subfield: HeritageSubfield;
    index: number;
};

const sceneLabels: Record<
    HeritageSubfield["scene"],
    string
> = {
    ceramic_workshop: "Seramik Atölyesi",
    stone_workshop: "Taş Atölyesi",
    glass_workshop: "Cam Atölyesi",
    metal_workshop: "Metal Atölyesi",
    jewelry_workshop: "Kuyum Atölyesi",
    wood_workshop: "Ahşap Atölyesi",
    textile_workshop: "Dokuma Atölyesi",
    paper_art_workshop: "Kâğıt Sanatları Atölyesi",
    calligraphy_room: "Hat Odası",
    daily_life_room: "Günlük Yaşam Odası",
};

export function HeritageSubfieldCard({
    subfield,
    index,
}: HeritageSubfieldCardProps) {
    const itemNumber = String(index + 1).padStart(
        2,
        "0",
    );

    return (
        <article className="heritage-subfield-card">
            <div className="heritage-subfield-card__top">
                <span
                    className="heritage-subfield-card__index"
                    aria-hidden="true"
                >
                    {itemNumber}
                </span>

                {subfield.featured ? (
                    <span className="heritage-subfield-card__featured">
                        Öne çıkan
                    </span>
                ) : null}
            </div>

            <div className="heritage-subfield-card__content">
                <p className="heritage-subfield-card__scene">
                    {sceneLabels[subfield.scene]}
                </p>

                <h3 className="heritage-subfield-card__title">
                    <Link href={`/alt-alan/${subfield.code}`}>
                        {subfield.shortTitle ??
                            subfield.title}
                    </Link>
                </h3>

                <p className="heritage-subfield-card__description">
                    {subfield.description}
                </p>
            </div>

            <div className="heritage-subfield-card__footer">
                <Link
                    href={`/alt-alan/${subfield.code}`}
                    className="heritage-subfield-card__explore"
                    aria-label={`${subfield.title} alanını keşfet`}
                >
                    <span>Keşfet</span>

                    <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
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
                </Link>
            </div>

            <span
                className="heritage-subfield-card__accent"
                aria-hidden="true"
            />
        </article>
    );
}