import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveRoute } from "@/components/public/ArchiveRoute";
import { MOVABLE_HERITAGE_CATEGORIES } from "@/lib/constants/heritageCategories";
export default async function AreaPage({ params }: { params: Promise<{code:string}> }) { const {code}=await params; const category=MOVABLE_HERITAGE_CATEGORIES.find(x=>x.code===code); if(!category) notFound(); return <ArchiveRoute eyebrow={`Alan ${category.indexLabel}`} title={category.title} intro={category.description}><div className="category-route-grid">{category.subfields.map(field=><Link key={field.code} href={`/alt-alan/${field.code}`} className="category-route-card"><h2>{field.shortTitle??field.title}</h2><p>{field.description}</p></Link>)}</div></ArchiveRoute>; }
