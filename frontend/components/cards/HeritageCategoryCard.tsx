import Link from "next/link";
import type { HeritageCategory } from "@/lib/constants/heritageCategories";

type HeritageCategoryCardProps = {
    category: HeritageCategory;
};

export function HeritageCategoryCard({
    category,
}: HeritageCategoryCardProps) {
    return (
        <article className="heritage-category-card">
            <div className="heritage-category-card__header">
                <span
                    className="heritage-category-card__index"
                    aria-hidden="true"
                >
                    {category.indexLabel}
                </span>

                <span className="heritage-category-card__count">
                    {category.subfields.length} alt alan
                </span>
            </div>

            <div className="heritage-category-card__body">
                <h3 className="heritage-category-card__title">
                    {category.title}
                </h3>

                <p className="heritage-category-card__description">
                    {category.description}
                </p>
            </div>

            <div
                className="heritage-category-card__subfields"
                aria-label={`${category.shortTitle} alt alanları`}
            >
                {category.subfields.map((subfield) => (
                    <Link
                        key={subfield.code}
                        href={`/alt-alan/${subfield.code}`}
                        className="heritage-category-card__subfield"
                    >
                        <span>
                            {subfield.shortTitle ?? subfield.title}
                        </span>

                        <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
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
                ))}
            </div>

            <div className="heritage-category-card__footer">
                <Link
                    href={`/alan/${category.code}`}
                    className="heritage-category-card__explore"
                >
                    <span>Tüm alanı keşfet</span>

                    <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
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
                className="heritage-category-card__glow"
                aria-hidden="true"
            />
        </article>
    );
}