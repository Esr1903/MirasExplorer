import { notFound } from "next/navigation";
import { ArchiveRoute } from "@/components/public/ArchiveRoute";
import { WORKSHOP_EXPERIENCES } from "@/lib/constants/workshopExperiences";
import { HeritageWorld } from "@/components/experience/HeritageWorld";
export default async function TourPage({params}:{params:Promise<{code:string}>}) { const {code}=await params; const tour=WORKSHOP_EXPERIENCES.find(x=>x.code===code); if(!tour) notFound(); return <ArchiveRoute eyebrow={tour.eyebrow} title={tour.title} intro={tour.description}><HeritageWorld tour={tour}/></ArchiveRoute>; }
