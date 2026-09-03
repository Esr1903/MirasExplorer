import Link from "next/link";
import type { ReactNode } from "react";

export function ArchiveRoute({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <div className="archive-route"><section className="archive-route__hero"><div className="miras-container"><p className="miras-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div></section><section className="miras-section"><div className="miras-container">{children}</div></section></div>;
}

export function RouteNotFound({ label }: { label: string }) {
  return <ArchiveRoute eyebrow="MirasExplorer" title="Kayıt bulunamadı" intro={`${label} için yayınlanmış bir sayfa bulunamadı.`}><Link className="home-primary-action" href="/ara">Arşivde ara</Link></ArchiveRoute>;
}
