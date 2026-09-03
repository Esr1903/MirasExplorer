import Link from "next/link";

export type SearchResultCardItem = {
    id: string;
    entityType:
    | "heritage_asset"
    | "person"
    | "place"
    | "organization"
    | "cultural_document";

    title: string;
    subtitle?: string;

    description?: string;

    href: string;

    image?: {
        src: string;
        alt: string;
    };

    eyebrow?: string;

    metadata?: {
        label: string;
        value: string;
    }[];

    badges?: string[];
};

type SearchResultCardProps = {
    item: SearchResultCardItem;
};

const entityTypeLabels: Record<
    SearchResultCardItem["entityType"],
    string
> = {
    heritage_asset: "Eser",
    person: "Kişi",
    place: "Yer",
    organization: "Kurum",
    cultural_document: "Belge",
};

export function SearchResultCard({
    item,
}: SearchResultCardProps) {
    return (
        <article className="search-result-card">
            {item.image ? (
                <Link
                    href={item.href}
                    className="search-result-card__media"
                    aria-label={`${item.title} kaydını aç`}
                >
                    <img
                        src={item.image.src}
                        alt={item.image.alt}
                        className="search-result-card__image"
                    />

                    <span className="search-result-card__entity-type">
                        {entityTypeLabels[item.entityType]}
                    </span>
                </Link>
            ) : (
                <Link
                    href={item.href}
                    className="search-result-card__media search-result-card__media--empty"
                    aria-label={`${item.title} kaydını aç`}
                >
                    <span className="search-result-card__entity-type">
                        {entityTypeLabels[item.entityType]}
                    </span>

                    <span
                        className="search-result-card__placeholder"
                        aria-hidden="true"
                    >
                        {item.title
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()}
                    </span>
                </Link>
            )}

            <div className="search-result-card__content">
                {item.eyebrow ? (
                    <p className="search-result-card__eyebrow">
                        {item.eyebrow}
                    </p>
                ) : null}

                <h3 className="search-result-card__title">
                    <Link href={item.href}>
                        {item.title}
                    </Link>
                </h3>

                {item.subtitle ? (
                    <p className="search-result-card__subtitle">
                        {item.subtitle}
                    </p>
                ) : null}

                {item.description ? (
                    <p className="search-result-card__description">
                        {item.description}
                    </p>
                ) : null}

                {item.metadata && item.metadata.length > 0 ? (
                    <dl className="search-result-card__metadata">
                        {item.metadata.slice(0, 3).map((entry) => (
                            <div key={`${entry.label}-${entry.value}`}>
                                <dt>{entry.label}</dt>
                                <dd>{entry.value}</dd>
                            </div>
                        ))}
                    </dl>
                ) : null}

                {item.badges && item.badges.length > 0 ? (
                    <div className="search-result-card__badges">
                        {item.badges.slice(0, 4).map((badge) => (
                            <span key={badge}>
                                {badge}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="search-result-card__footer">
                    <Link
                        href={item.href}
                        className="search-result-card__open"
                    >
                        Kaydı incele

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