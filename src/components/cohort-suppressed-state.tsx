import { ShieldCheck } from "lucide-react";

export function CohortSuppressedState({ minimumCohortSize }: { minimumCohortSize: number }) {
  return (
    <section className="paper mt-12 rounded-2xl p-8 text-center" data-testid="cohort-suppressed">
      <ShieldCheck className="mx-auto text-[#a27b3c]" aria-hidden="true" />
      <div className="eyebrow mt-4">Anonymity protection active</div>
      <h2 className="serif mt-3 text-3xl">Cohort insight is not available yet.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#68727b]">
        CaseFlow releases aggregate patterns only after at least {minimumCohortSize} completed responses.
        The current small-cohort count and all individual work remain hidden.
      </p>
    </section>
  );
}
