import { AppNav } from "@/components/app-nav"; import { CaseWorkspace } from "@/components/case-workspace"; import { requireCaseFlowRole } from "@/lib/insforge/server";
export default async function CasePage(){await requireCaseFlowRole("student");return <><AppNav role="student"/><CaseWorkspace/></>}
