import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { AssignmentSetup } from "@/components/assignment-setup";
import { CohortAISummary } from "@/components/cohort-ai-summary";
import { CohortSuppressedState } from "@/components/cohort-suppressed-state";
import { caseStudy } from "@/lib/data";
import { getRepresentativeEvidenceCounts } from "@/lib/faculty-analytics";
import { loadFacultyCohortSummary } from "@/lib/insforge/faculty";

export default async function Insight() {
  const summary = await loadFacultyCohortSummary();
  if (summary.suppressed) {
    return (
      <>
        <AppNav role="faculty" />
        <main className="shell py-10 sm:py-14">
          <div className="eyebrow">Cohort insight · anonymity protected</div>
          <h1 className="serif mt-3 text-4xl leading-tight">Where the room is ready—and where it is brittle.</h1>
          <CohortSuppressedState minimumCohortSize={summary.minimumCohortSize} />
        </main>
      </>
    );
  }
  const total = summary.completed;
  const sourceTitle = Object.fromEntries(caseStudy.sources.map((source) => [source.id, source.title]));
  const evidence = Object.entries(getRepresentativeEvidenceCounts(summary)).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <AppNav role="faculty" />
      <main className="shell py-10 sm:py-14">
        <div className="max-w-3xl">
          <div className="eyebrow">Cohort insight · anonymous · fictional demo data</div>
          <h1 className="serif mt-3 text-4xl leading-tight">Where the room is ready—and where it is brittle.</h1>
          <p className="mt-3 text-[#68727b]">
            Derived from {total} synthetic submissions for the fictional Hikari Foods case. No student identities, private responses, or preparation briefs are available to this view.
          </p>
        </div>

        {total === 0 ? (
          <section className="paper mt-12 rounded-2xl p-8 text-center">
            <Quote className="mx-auto text-[#a27b3c]" />
            <h2 className="serif mt-4 text-3xl">No completed cohort responses yet.</h2>
            <p className="mt-3 text-sm text-[#68727b]">Position and anonymous argument patterns will appear here after submission.</p>
          </section>
        ) : (
          <>
            <section className="mt-12 grid gap-10 lg:grid-cols-2">
              <div className="paper rounded-2xl p-6 sm:p-8">
                <div className="eyebrow">Position distribution</div>
                <div className="mt-8 space-y-6">
                  {Object.entries(summary.positions).map(([label, count]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm font-bold">
                        <span>{label}</span><span>{count} · {Math.round(count / total * 100)}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#e3ded4]">
                        <div className="h-full rounded-full bg-[#10283f]" style={{ width: `${count / total * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="paper rounded-2xl p-6 sm:p-8">
                <div className="eyebrow">Evidence in representative sample</div>
                <p className="mt-2 text-xs leading-5 text-[#68727b]">Counts cover only the anonymous arguments returned by the aggregate, not every submission.</p>
                <div className="mt-7 space-y-4">
                  {evidence.length ? evidence.map(([sourceId, count]) => (
                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b rule pb-3 text-sm" key={sourceId}>
                      <span><b className="text-[#9a7336]">[{sourceId}]</b> {sourceTitle[sourceId]}</span>
                      <span className="font-bold">{count} cites</span>
                    </div>
                  )) : <p className="text-sm text-[#68727b]">No cited evidence is available in the sample.</p>}
                </div>
              </div>
            </section>

            <section className="mt-12">
              <div className="eyebrow">Reasoning patterns to test</div>
              <CohortAISummary responses={summary.representativeArguments} />
            </section>

            <section className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
              <div>
                <div className="eyebrow">Anonymous representative arguments</div>
                <div className="mt-5 space-y-4">
                  {summary.representativeArguments.map((argument) => (
                    <blockquote key={argument.anonymousKey} className="border-l-2 border-[#b48a43] pl-5 text-sm leading-7">
                      <p>“{argument.rationale}”</p>
                      <footer className="mt-2 text-xs font-bold text-[#68727b]">
                        Anonymous {argument.anonymousKey} · {argument.position} · {argument.evidence.map((id) => `[${id}]`).join(" ")}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>
              <aside className="rounded-2xl bg-[#10283f] p-7 text-white">
                <div className="eyebrow !text-[#d6b77e]">Turn insight into teaching</div>
                <h2 className="serif mt-4 text-3xl">Build the room around productive disagreement.</h2>
                <p className="mt-3 text-sm leading-6 text-[#cfdae1]">Generate an editable 60-minute sequence grounded in these anonymous patterns.</p>
                <Link href={`/faculty/cases/${caseStudy.id}/discussion-plan`} className="mt-7 inline-flex items-center gap-2 font-bold text-[#e0bd7d]">
                  Create discussion plan <ArrowRight size={16} />
                </Link>
              </aside>
            </section>
          </>
        )}
        <AssignmentSetup />
      </main>
    </>
  );
}
