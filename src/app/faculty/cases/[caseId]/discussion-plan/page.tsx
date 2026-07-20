import { AppNav } from "@/components/app-nav";
import { CohortSuppressedState } from "@/components/cohort-suppressed-state";
import { DiscussionPlan } from "@/components/discussion-plan";
import { loadFacultyCohortSummary } from "@/lib/insforge/faculty";

export default async function PlanPage() {
  const summary = await loadFacultyCohortSummary();
  if (summary.suppressed) {
    return (
      <>
        <AppNav role="faculty" />
        <main className="shell py-10 sm:py-14">
          <div className="eyebrow">Discussion plan · anonymity protected</div>
          <h1 className="serif mt-3 text-4xl">Discussion plan</h1>
          <CohortSuppressedState minimumCohortSize={summary.minimumCohortSize} />
        </main>
      </>
    );
  }
  return <><AppNav role="faculty" /><DiscussionPlan responses={summary.representativeArguments} /></>;
}
