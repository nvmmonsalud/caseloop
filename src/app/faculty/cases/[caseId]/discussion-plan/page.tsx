import { AppNav } from "@/components/app-nav"; import { DiscussionPlan } from "@/components/discussion-plan"; import { loadFacultyCohortSummary } from "@/lib/insforge/faculty";
export default async function PlanPage(){const summary=await loadFacultyCohortSummary();return <><AppNav role="faculty"/><DiscussionPlan responses={summary.representativeArguments}/></>}
