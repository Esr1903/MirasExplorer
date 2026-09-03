"use client";
import Link from "next/link";
import { useState } from "react";
import { WORKSHOP_EXPERIENCES, type WorkshopExperience } from "@/lib/constants/workshopExperiences";

const portals = WORKSHOP_EXPERIENCES.filter((item) => item.featured).slice(0, 6);

export function HeritageWorld({ tour }: { tour?: WorkshopExperience }) {
  const [selected, setSelected] = useState<WorkshopExperience | null>(tour ?? null);
  const active = selected ?? tour;
  if (active) return <WorkshopScene tour={active} />;
  return <section className="heritage-world heritage-world--courtyard" aria-label="Miras Avlusu"><div className="heritage-world__sky"/><div className="heritage-world__sun"/><div className="heritage-world__arches"/><div className="heritage-world__ground"/><div className="heritage-world__intro"><p className="miras-eyebrow">Miras Yolculuğu</p><h1>Tarihî Miras Avlusu</h1><p>Bir kapı seçin; üretim gelenekleri, atölyeler ve arşiv kayıtları arasında kendi yolunuzu kurun.</p></div><div className="heritage-world__portals" aria-label="Atölye kapıları">{portals.map((item, index) => <button key={item.code} className={`heritage-portal heritage-portal--${item.visual}`} onClick={() => setSelected(item)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.shortTitle}</strong><small>{item.eyebrow}</small></button>)}</div></section>;
}

export function WorkshopScene({ tour }: { tour: WorkshopExperience }) {
  const [drawer, setDrawer] = useState(false);
  return <section className={`heritage-world heritage-world--workshop heritage-world--${tour.visual}`} aria-label={`${tour.title} sahnesi`}><div className="heritage-world__sky"/><div className="heritage-world__arches"/><div className="scene-window"/><div className="scene-table"/><div className="scene-shelf scene-shelf--one"/><div className="scene-shelf scene-shelf--two"/><div className="heritage-world__intro"><p className="miras-eyebrow">{tour.eyebrow}</p><h1>{tour.title}</h1><p>{tour.atmosphere}</p><button className="home-primary-action" onClick={() => setDrawer(true)}>Koleksiyonu aç</button></div><div className="scene-hotspots" aria-label="Sahne keşif noktaları">{tour.relatedSubfieldTitles.slice(0, 12).map((label, index) => <button key={label} style={{ left: `${14 + (index % 4) * 23}%`, top: `${30 + Math.floor(index / 4) * 22}%` }} onClick={() => setDrawer(true)} aria-label={`${label} koleksiyonunu aç`}><span>{label}</span></button>)}</div>{drawer ? <aside className="scene-drawer" aria-label="Koleksiyon çekmecesi"><button onClick={() => setDrawer(false)} aria-label="Koleksiyonu kapat">×</button><p className="miras-eyebrow">Koleksiyon çekmecesi</p><h2>{tour.shortTitle}</h2><p>Yayınlanmış eserler, sayfalı arşiv sorgusuyla burada listelenir. Sahnede en fazla on iki keşif noktası gösterilir.</p><Link href={`/ara?subfield=${encodeURIComponent(tour.relatedSubfields[0] ?? "")}`} className="home-primary-action">Eserleri arşivde ara</Link></aside> : null}</section>;
}
