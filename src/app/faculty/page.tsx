import Link from "next/link";
import { ArrowRight, Clock3, Users } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { CohortSuppressedState } from "@/components/cohort-suppressed-state";
import { Stat } from "@/components/stat";
import { caseStudy } from "@/lib/data";
import { getRepresentativeEvidenceCounts } from "@/lib/faculty-analytics";
import { loadFacultyCohortSummary } from "@/lib/insforge/faculty";

export default async function Faculty() {
  const summary = await loadFacultyCohortSummary();
  if (summary.suppressed) {
    return (
      <>
        <AppNav role="faculty" />
        <main className="shell py-10 sm:py-16 fade-up">
          <div className="eyebrow">Faculty workspace · fictional demo cohort</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Global Strategy</h1>
          <p className="mt-3 text-[#68727b]">Cohort 2026 · Section B · privacy-protected analytics</p>
          <CohortSuppressedState minimumCohortSize={summary.minimumCohortSize} />
        </main>
      </>
    );
  }
  const total = summary.completed;
  const largestPosition = Object.entries(summary.positions).sort((a, b) => b[1] - a[1])[0];
  const sampleEvidence = getRepresentativeEvidenceCounts(summary);
  const leastSeenSource = caseStudy.sources
    .map((source) => [source.id, sampleEvidence[source.id] ?? 0] as const)
    .sort((a, b) => a[1] - b[1])[0];

  return (
    <>
      <AppNav role="faculty" />
      <main className="shell py-10 sm:py-16 fade-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Faculty workspace · fictional demo cohort</div>
            <h1 className="serif mt-2 text-4xl sm:text-5xl">Global Strategy</h1>
            <p className="mt-3 text-[#68727b]">Cohort 2026 · Section B · synthetic responses only</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#69737b]">
            <Clock3 size={16} />Updated from {summary.completed} synthetic responses
          </div>
        </div>

        <section className="mt-12 border-y rule py-8 grid grid-cols-2 gap-y-8 md:grid-cols-3">
          <Stat value={summary.completed} label="Completed" detail="Fictional submissions" />
          <Stat value={`${summary.averageConfidence}%`} label="Avg. confidence" detail="Across completed work" />
          <Stat
            value={total ? largestPosition[1] : 0}
            label={total ? `Favor ${largestPosition[0].toLowerCase()}` : "Largest position"}
            detail={total ? "Largest position" : "No responses yet"}
          />
        </section>

        {total === 0 ? (
          <section className="paper mt-12 rounded-2xl p-8 text-center">
            <Users className="mx-auto text-[#a27b3c]" />
            <h2 className="serif mt-4 text-3xl">The cohort is ready for its first response.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#68727b]">
              Aggregate insight will appear after fictional submissions are completed. No individual student work is exposed here.
            </p>
          </section>
        ) : (
          <section className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <div className="eyebrow">Next discussion</div>
              <h2 className="serif mt-3 text-3xl">{caseStudy.title}</h2>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#ddd7ca] flex">
                <span className="bg-[#10283f]" style={{ width: `${summary.positions["Joint venture"] / total * 100}%` }} />
                <span className="bg-[#b48a43]" style={{ width: `${summary.positions.Acquisition / total * 100}%` }} />
                <span className="bg-[#8f9b8c] flex-1" />
              </div>
              <div className="mt-4 flex flex-wrap gap-5 text-xs font-bold">
                <Key color="#10283f" label={`Joint venture ${summary.positions["Joint venture"]}`} />
                <Key color="#b48a43" label={`Acquisition ${summary.positions.Acquisition}`} />
                <Key color="#8f9b8c" label={`Organic ${summary.positions["Organic entry"]}`} />
              </div>
              <Link href={`/faculty/cases/${caseStudy.id}`} className="btn-primary mt-8">
                Open cohort insight <ArrowRight size={16} />
              </Link>
            </div>
            <aside className="border-l rule pl-7">
              <div className="flex gap-3">
                <Users className="text-[#a27b3c]" />
                <div>
                  <div className="font-bold">Discussion opportunity</div>
                  <p className="mt-2 text-sm leading-6 text-[#68727b]">
                    The largest fictional cohort position is {largestPosition[0].toLowerCase()} ({largestPosition[1]} of {total}).
                    Use the anonymous arguments to surface the strongest disagreement.
                  </p>
                </div>
              </div>
              <div className="mt-7 border-t rule pt-6">
                <div className="font-bold text-sm">Least visible in the representative sample</div>
                <p className="mt-2 text-sm text-[#68727b]">
                  [{leastSeenSource[0]}] appears {leastSeenSource[1]} time{leastSeenSource[1] === 1 ? "" : "s"} in the anonymous sample.
                </p>
              </div>
            </aside>
          </section>
        )}
      </main>
    </>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-2"><i className="size-2 rounded-full" style={{ background: color }} />{label}</span>;
}
