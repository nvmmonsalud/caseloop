import { AppNav } from "@/components/app-nav"; import { CaseWorkspace } from "@/components/case-workspace"; import { loadStudentCaseSources } from "@/lib/insforge/case-materials";
export default async function CasePage(){const sources=await loadStudentCaseSources();return <><AppNav role="student"/><CaseWorkspace sources={sources}/></>}
