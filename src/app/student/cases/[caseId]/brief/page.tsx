import { AppNav } from "@/components/app-nav"; import { PreparationBrief } from "@/components/preparation-brief"; import { loadStudentCaseSources } from "@/lib/insforge/case-materials";
export default async function BriefPage(){const sources=await loadStudentCaseSources();return <><AppNav role="student"/><PreparationBrief sources={sources}/></>}
