import { AppNav } from "@/components/app-nav"; import { DiscussionPlan } from "@/components/discussion-plan"; import { requireCaseFlowRole } from "@/lib/insforge/server";
export default async function PlanPage(){await requireCaseFlowRole("faculty");return <><AppNav role="faculty"/><DiscussionPlan/></>}
