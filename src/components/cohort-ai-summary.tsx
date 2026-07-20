"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { postAI } from "@/lib/ai/client";
import { caseStudy } from "@/lib/data";
import type { RepresentativeArgument } from "@/lib/faculty-analytics";

type Insight = {
  misconceptions: { title: string; evidence: string; count: number }[];
  overlookedSourceIds: string[];
  discussionTensions: string[];
};

export function CohortAISummary({ responses }: { responses: RepresentativeArgument[] }) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [mode, setMode] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (responses.length === 0) return;
    postAI<Insight>("cohort", {
      responses: responses.map((response) => ({
        position: response.position,
        rationale: response.rationale,
        assumption: response.rationale,
        evidence: response.evidence,
      })),
      caseSources: caseStudy.sources,
    })
      .then((payload) => {
        setInsight(payload.data);
        setMode(payload.mode);
      })
      .catch(() => setFailed(true));
  }, [responses]);

  if (responses.length === 0) {
    return <div className="mt-5 text-sm text-[#68727b]">No completed responses are available to analyze yet.</div>;
  }
  if (failed) {
    return <div role="alert" className="mt-5 text-sm text-[#8a3f2b]">The cohort analyzer is temporarily unavailable.</div>;
  }
  if (!insight) return <div className="mt-5 text-sm text-[#68727b]">Analyzing anonymized reasoning patterns…</div>;

  return (
    <div className="mt-5 rounded-2xl bg-[#e9e2d4] p-6">
      <div className="flex items-center gap-2 font-bold">
        <Sparkles size={17} className="text-[#9a7336]" />
        Cohort analyzer
        <span className="ml-auto text-xs uppercase tracking-wider text-[#758087]">{mode} mode</span>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">Discussion tensions</div>
          <ul className="mt-2 list-disc pl-4 text-sm leading-6">
            {insight.discussionTensions.map((tension) => <li key={tension}>{tension}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">Overlooked sources</div>
          <p className="mt-2 text-sm">
            {insight.overlookedSourceIds.length
              ? insight.overlookedSourceIds.map((sourceId) => `[${sourceId}]`).join(", ")
              : "No consistent gap detected in the representative sample."}
          </p>
        </div>
      </div>
    </div>
  );
}
