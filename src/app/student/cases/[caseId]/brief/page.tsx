import { AppNav } from "@/components/app-nav"; import { PreparationBrief } from "@/components/preparation-brief"; import { requireCaseFlowRole } from "@/lib/insforge/server";
export default async function BriefPage(){await requireCaseFlowRole("student");return <><AppNav role="student"/><PreparationBrief/></>}
