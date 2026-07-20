import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Progress } from "@/components/progress";
import { caseStudy } from "@/lib/data";
import { requireCaseFlowRole } from "@/lib/insforge/server";
import { loadStudentPilotSettings } from "@/lib/insforge/pilot";
import { ArrowRight, CalendarDays, BookMarked } from "lucide-react";
export default async function Student() {
  const [session, pilotSettings] = await Promise.all([
    requireCaseFlowRole("student"),
    loadStudentPilotSettings(),
  ]);
  const firstName = session?.displayName.split(" ")[0] || "Maya";
  return (
    <>
      <AppNav role="student" />
      <main className="shell py-10 sm:py-16 fade-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Student workspace</div>
            <h1 className="serif mt-2 text-4xl sm:text-5xl">
              Good morning, {firstName}.
            </h1>
            <p className="mt-3 text-[#68727b]">
              One case needs your point of view before Tuesday.
            </p>
          </div>
          <div className="text-sm text-[#68727b]">Week 6 of 10</div>
        </div>
        <section className="mt-12 paper overflow-hidden rounded-2xl">
          <div className="grid lg:grid-cols-[1.45fr_.55fr]">
            <div className="p-6 sm:p-10">
              <div className="flex items-center gap-2 text-sm font-bold text-[#8a6832]">
                <BookMarked size={16} />
                Upcoming case
              </div>
              <h2 className="serif mt-5 max-w-2xl text-3xl sm:text-4xl leading-tight">
                {caseStudy.title}
              </h2>
              <p className="mt-3 text-sm font-bold">{caseStudy.course}</p>
              <div className="mt-8">
                <Progress step={1} />
              </div>
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-5">
                <Link
                  href={`/student/cases/${caseStudy.id}`}
                  className="btn-primary"
                >
                  Continue preparation <ArrowRight size={16} />
                </Link>
                <div className="flex items-center gap-2 text-sm text-[#69737b]">
                  <CalendarDays size={16} />
                  Due {caseStudy.due}
                </div>
              </div>
            </div>
            <aside className="border-t lg:border-t-0 lg:border-l rule bg-[#f1ede4] p-6 sm:p-8">
              <div className="eyebrow">Learning objectives</div>
              <ol className="mt-5 space-y-5">
                {caseStudy.objectives.map((o, i) => (
                  <li
                    key={o}
                    className="grid grid-cols-[24px_1fr] gap-2 text-sm leading-6"
                  >
                    <span className="serif text-[#a27b3c]">0{i + 1}</span>
                    {o}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>
        {pilotSettings.rubricReleasedAt && (
          <section className="mt-10 paper rounded-2xl p-6 sm:p-8">
            <div className="eyebrow">Faculty-released reasoning rubric</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {pilotSettings.rubric.map((item) => (
                <div key={item.title} className="border-l rule pl-4">
                  <div className="text-sm font-bold">
                    {item.title} · {item.weight}%
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#68727b]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            {pilotSettings.feedback?.releasedAt && (
              <div className="mt-7 rounded-xl bg-[#f1ede4] p-5">
                <div className="text-sm font-bold">
                  {pilotSettings.feedback.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#506271]">
                  {pilotSettings.feedback.body}
                </p>
              </div>
            )}
          </section>
        )}
        <section className="mt-10 border-t rule pt-8">
          <div className="eyebrow">Preparation rhythm</div>
          <div className="mt-5 grid gap-5 sm:grid-cols-4">
            {[
              "Initial view",
              "Socratic review",
              "Decision",
              "Preparation brief",
            ].map((x, i) => (
              <div key={x} className="flex items-center gap-3">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#10283f] text-white" : "border rule"}`}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-bold">{x}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
