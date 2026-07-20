"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { caseStudy, demoBrief, type CaseSource } from "@/lib/data";
import {
  ATTEMPT_STORAGE_KEY,
  readStoredAttempt,
  type AttemptDraft,
} from "@/lib/attempt";
import { postAI } from "@/lib/ai/client";
import { briefSchema, reflectionSchema } from "@/lib/ai/schemas";
import { isInsForgePersistenceEnabled } from "@/lib/insforge/config";
import {
  loadPersistedAttempt,
  savePersistedBrief,
  savePersistedReflection,
} from "@/lib/insforge/persistence";
import { CheckCircle2, Download, RotateCcw, Sparkles } from "lucide-react";
import type { z } from "zod";
type Brief = z.infer<typeof briefSchema>;
type Comparison = z.infer<typeof reflectionSchema>;
const initialBrief: Brief = briefSchema.parse({
  recommendation: demoBrief.recommendation,
  evidence: demoBrief.evidence,
  assumptions: demoBrief.assumptions,
  tradeoffs: demoBrief.tradeoffs,
  counterargument: demoBrief.counterargument,
  openQuestion: demoBrief.question,
  confidence: demoBrief.confidence,
});
export function PreparationBrief({ sources }: { sources: CaseSource[] }) {
  const [attempt, setAttempt] = useState<AttemptDraft | null>(null);
  const [brief, setBrief] = useState(initialBrief);
  const [generating, setGenerating] = useState(true);
  const [reflection, setReflection] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const remote = isInsForgePersistenceEnabled()
          ? await loadPersistedAttempt()
          : null;
        const saved =
          remote ||
          readStoredAttempt(localStorage.getItem(ATTEMPT_STORAGE_KEY));
        if (cancelled) return;
        setAttempt(saved);
        if (remote?.reflection) setReflection(remote.reflection);
        const savedComparison = reflectionSchema.safeParse(remote?.comparison);
        if (savedComparison.success) setComparison(savedComparison.data);
        const savedBrief = briefSchema.safeParse(remote?.brief);
        if (savedBrief.success) {
          setBrief(savedBrief.data);
          setGenerating(false);
          return;
        }
        if (!saved) {
          setGenerating(false);
          return;
        }
        const payload = await postAI<Brief>("brief", {
          student: saved,
          caseSources: sources,
        });
        if (cancelled) return;
        setBrief(payload.data);
        await savePersistedBrief(payload.data);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "The brief could not be generated.",
          );
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sources]);
  const compare = async () => {
    if (!reflection.trim()) {
      setError("Add a reflection before comparing your reasoning.");
      return;
    }
    setError("");
    try {
      const payload = await postAI<Comparison>("reflection", {
        preClass: attempt,
        postClass: reflection,
        caseSources: sources,
      });
      setComparison(payload.data);
      await savePersistedReflection(reflection, payload.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The comparison is unavailable.",
      );
    }
  };
  const evidenceSourceIds = [
    ...new Set(
      brief.evidence.flatMap((item) => [
        item.sourceId,
        ...Array.from(
          item.claim.matchAll(/\[(S\d{1,2})\]/g),
          (match) => match[1],
        ),
      ]),
    ),
  ];
  return (
    <main className="shell py-10 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Preparation complete</div>
          <h1 className="serif mt-2 text-4xl">Your pre-class brief</h1>
          <p className="mt-2 text-sm text-[#68727b]">
            {generating
              ? "Building from your committed reasoning…"
              : "Generated from your reasoning—not a model answer."}
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary">
          <Download size={15} />
          Print / save PDF
        </button>
      </div>
      <article
        className={`paper mt-8 rounded-2xl p-6 sm:p-10 transition-opacity ${generating ? "opacity-60" : ""}`}
      >
        <header className="border-b rule pb-7">
          <div className="flex gap-3 text-sm text-[#55705e]">
            <CheckCircle2 size={18} />
            Ready for class
          </div>
          <h2 className="serif mt-4 max-w-3xl text-3xl">{caseStudy.title}</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-[#68727b]">
            <span>{caseStudy.course}</span>
            <span>•</span>
            <span>Confidence {brief.confidence}%</span>
            <span>•</span>
            <span>All figures fictional</span>
          </div>
        </header>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <BriefBlock n="01" title="Recommendation">
            <p>{brief.recommendation}</p>
          </BriefBlock>
          <BriefBlock n="02" title="Supporting evidence">
            <ul>
              {brief.evidence.map((x) => (
                <li key={x.claim}>
                  {x.claim}
                  {!x.claim.includes(`[${x.sourceId}]`) && (
                    <>
                      {" "}
                      <b>[{x.sourceId}]</b>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </BriefBlock>
          <BriefBlock n="03" title="Assumptions">
            <ul>
              {brief.assumptions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </BriefBlock>
          <BriefBlock n="04" title="Trade-offs">
            <p>{brief.tradeoffs}</p>
          </BriefBlock>
          <BriefBlock n="05" title="Strongest counterargument">
            <p>{brief.counterargument}</p>
          </BriefBlock>
          <BriefBlock n="06" title="Open question for class">
            <p>{brief.openQuestion}</p>
          </BriefBlock>
        </div>
        <div className="mt-9 border-t rule pt-5 text-xs text-[#68727b]">
          Source references:{" "}
          {evidenceSourceIds.map((id) => `[${id}]`).join(" · ")}. AI inference
          should be verified against the original case.
        </div>
      </article>
      <section className="mt-12 border-t rule pt-10">
        <div className="eyebrow">Post-class reflection</div>
        <h2 className="serif mt-3 text-3xl">What changed in your thinking?</h2>
        <p className="mt-2 text-[#68727b]">
          Which assumption was weakest? What evidence changed your position?
        </p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          className="mt-6 min-h-32 w-full rounded-xl border rule bg-[#fffdf8] p-4"
          placeholder="Describe your post-class position and the evidence that moved you."
        />
        <button onClick={compare} className="btn-primary mt-4">
          <RotateCcw size={15} />
          Compare reasoning
        </button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#8a3f2b]">
            {error}
          </p>
        )}
        {comparison && (
          <div className="mt-5 rounded-xl bg-[#e9e2d4] p-5 text-sm leading-7 fade-up">
            <div className="flex gap-2 font-bold">
              <Sparkles size={17} className="text-[#9a7336]" />
              Reasoning shift
            </div>
            <p className="mt-2">{comparison.reasoningShift}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="font-bold">Position</dt>
                <dd>{comparison.positionShift}</dd>
              </div>
              <div>
                <dt className="font-bold">Weakest assumption</dt>
                <dd>{comparison.weakenedAssumption}</dd>
              </div>
              <div>
                <dt className="font-bold">New evidence</dt>
                <dd>{comparison.newEvidence}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/student" className="btn-secondary">
          Back to dashboard
        </Link>
        <Link href="/faculty" className="btn-secondary">
          View faculty demo
        </Link>
      </div>
    </main>
  );
}
function BriefBlock({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t rule pt-5">
      <div className="flex gap-4">
        <span className="serif text-[#a27b3c]">{n}</span>
        <div className="text-sm leading-7 [&_ul]:list-disc [&_ul]:pl-4">
          <h3 className="mb-2 font-bold">{title}</h3>
          {children}
        </div>
      </div>
    </section>
  );
}
