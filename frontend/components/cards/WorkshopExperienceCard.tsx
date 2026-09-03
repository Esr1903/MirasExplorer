import Link from "next/link";
import type { WorkshopExperience } from "@/lib/constants/workshopExperiences";

type WorkshopExperienceCardProps = {
    experience: WorkshopExperience;
    index: number;
};

export function WorkshopExperienceCard({
    experience,
    index,
}: WorkshopExperienceCardProps) {
    const itemNumber = String(index + 1).padStart(2, "0");

    return (
        <article
            className={`workshop-experience-card workshop-experience-card--${experience.visual}`}
        >
            <div className="workshop-experience-card__visual">
                <span
                    className="workshop-experience-card__number"
                    aria-hidden="true"
                >
                    {itemNumber}
                </span>

                {experience.featured ? (
                    <span className="workshop-experience-card__featured">
                        Öne çıkan deneyim
                    </span>
                ) : null}

                <div
                    className="workshop-experience-card__scene"
                    aria-hidden="true"
                >
                    <span className="workshop-experience-card__scene-backdrop" />
                    <span className="workshop-experience-card__scene-floor" />

                    <span className="workshop-experience-card__scene-object workshop-experience-card__scene-object--one" />
                    <span className="workshop-experience-card__scene-object workshop-experience-card__scene-object--two" />
                    <span className="workshop-experience-card__scene-object workshop-experience-card__scene-object--three" />

                    <span className="workshop-experience-card__scene-light workshop-experience-card__scene-light--one" />
                    <span className="workshop-experience-card__scene-light workshop-experience-card__scene-light--two" />
                </div>

                <div className="workshop-experience-card__visual-footer">
                    <span>
                        {experience.shortTitle}
                    </span>

                    <Link
                        href={`/tur/${experience.code}`}
                        className="workshop-experience-card__enter"
                        aria-label={`${experience.title} deneyimine gir`}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            aria-hidden="true"
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
                    </Link>
                </div>
            </div>

            <div className="workshop-experience-card__content">
                <p className="workshop-experience-card__eyebrow">
                    {experience.eyebrow}
                </p>

                <h3 className="workshop-experience-card__title">
                    <Link href={`/tur/${experience.code}`}>
                        {experience.title}
                    </Link>
                </h3>

                <p className="workshop-experience-card__description">
                    {experience.description}
                </p>

                <div className="workshop-experience-card__subfields">
                    {experience.relatedSubfieldTitles.map((title) => (
                        <span key={title}>
                            {title}
                        </span>
                    ))}
                </div>

                <div className="workshop-experience-card__footer">
                    <p>
                        {experience.atmosphere}
                    </p>

                    <Link
                        href={`/tur/${experience.code}`}
                        className="workshop-experience-card__cta"
                    >
                        Deneyime gir

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