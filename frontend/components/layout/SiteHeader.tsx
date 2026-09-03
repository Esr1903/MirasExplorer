import Link from "next/link";

export function SiteHeader() {
    return (
        <header className="site-header">
            <div className="miras-container site-header__inner">
                <Link
                    href="/"
                    className="site-brand"
                    aria-label="MirasExplorer ana sayfa"
                >
                    <span className="site-brand__mark" aria-hidden="true">
                        M
                    </span>

                    <span className="site-brand__text">
                        <strong>MirasExplorer</strong>
                        <small>Taşınabilir Kültürel Miras</small>
                    </span>
                </Link>

                <nav
                    className="site-navigation"
                    aria-label="Ana navigasyon"
                >
                    <Link href="/kesfet">Keşfet</Link>
                    <Link href="/kategoriler">
                        Kategoriler
                    </Link>
                    <Link href="/miras-yolculugu">Miras Yolculuğu</Link>
                    <Link href="/harita">Harita</Link>
                </nav>

                <div className="site-header__actions">
                    <Link
                        href="/ara"
                        className="site-search-button"
                        aria-label="Kültürel miras koleksiyonunda ara"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            aria-hidden="true"
                        >
                            <path
                                d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>

                        <span>Ara</span>
                    </Link>

                    <Link
                        href="/giris"
                        className="site-editor-link"
                    >
                        Editör Girişi
                    </Link>
                </div>
            </div>
        </header>
    );
}
