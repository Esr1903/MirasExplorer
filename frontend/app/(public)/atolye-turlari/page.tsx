import Link from "next/link";
import { ArchiveRoute } from "@/components/public/ArchiveRoute";
import { WORKSHOP_EXPERIENCES } from "@/lib/constants/workshopExperiences";
export default function WorkshopsPage() { return <ArchiveRoute eyebrow="Etkileşimli keşif" title="Atölye turları" intro="Eserleri üretildikleri ortamın malzemeleri, araçları ve hikâyeleri arasında keşfedin."><div className="category-route-grid">{WORKSHOP_EXPERIENCES.map(tour=><Link key={tour.code} href={`/tur/${tour.code}`} className="category-route-card"><span>{tour.eyebrow}</span><h2>{tour.title}</h2><p>{tour.description}</p><small>Sahne turunu aç</small></Link>)}</div></ArchiveRoute>; }
