import Image from "next/image";
import Link from "next/link";
import type { FeaturedHeritageItem } from "@/lib/constants/featuredHeritageItems";

type HeritageItemCardProps = {
    item: FeaturedHeritageItem;
};

export function HeritageItemCard({
    item,
}: HeritageItemCardProps) {
    const metadata = [
        item.maker?.name,
        item.period,
        item.location?.name,
    ].filter(Boolean);

    return (
        <article className="heritage-item-card">
            <Link
                href={`/eser/${item.id}`}
                className="heritage-item-card__media"
                aria-label={`${item.title} eserini aç`}
            >
                <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="
            (max-width: 640px) 100vw,
            (max-width: 1024px) 50vw,
            33vw
          "
                    className="heritage-item-card__image"
                    style={{
                        objectPosition:
                            item.image.objectPosition ?? "center",
                    }}
                />

                <div
                    className="heritage-item-card__media-overlay"
                    aria-hidden="true"
                />

                <span className="heritage-item-card__category">
                    {item.subfieldTitle}
                </span>

                <span
                    className="heritage-item-card__open"
                    aria-hidden="true"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                    >
                        <path
                            d="M7 17 17 7M9 7h8v8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </Link>

            <div className="heritage-item-card__content">
                <div className="heritage-item-card__heading">
                    <div>
                        {item.subtitle ? (
                            <p className="heritage-item-card__subtitle">
                                {item.subtitle}
                            </p>
                        ) : null}

                        <h3 className="heritage-item-card__title">
                            <Link href={`/eser/${item.id}`}>
                                {item.title}
                            </Link>
                        </h3>
                    </div>

                    <span
                        className="heritage-item-card__priority"
                        aria-label={`Öne çıkan eser sırası ${item.featuredPriority}`}
                    >
                        {String(item.featuredPriority).padStart(
                            2,
                            "0",
                        )}
                    </span>
                </div>

                <p className="heritage-item-card__description">
                    {item.description}
                </p>

                {metadata.length > 0 ? (
                    <dl className="heritage-item-card__metadata">
                        {item.maker ? (
                            <div>
                                <dt>{item.maker.role}</dt>
                                <dd>{item.maker.name}</dd>
                            </div>
                        ) : null}

                        {item.period ? (
                            <div>
                                <dt>Dönem</dt>
                                <dd>{item.period}</dd>
                            </div>
                        ) : null}

                        {item.location ? (
                            <div>
                                <dt>Konum</dt>
                                <dd>
                                    {item.location.name}
                                    {item.location.city
                                        ? `, ${item.location.city}`
                                        : ""}
                                </dd>
                            </div>
                        ) : null}
                    </dl>
                ) : null}

                {item.badges && item.badges.length > 0 ? (
                    <div className="heritage-item-card__badges">
                        {item.badges.map((badge) => (
                            <span key={badge}>
                                {badge}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="heritage-item-card__footer">
                    <Link
                        href={`/alt-alan/${item.subfieldCode}`}
                        className="heritage-item-card__subfield-link"
                    >
                        {item.subfieldTitle}
                    </Link>

                    <Link
                        href={`/eser/${item.id}`}
                        className="heritage-item-card__detail-link"
                    >
                        Eseri incele

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
            </div>
        </article>
    );
}