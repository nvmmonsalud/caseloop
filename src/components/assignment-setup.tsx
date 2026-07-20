"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, FileCheck2, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";

import {
  reviewCaseSourceAction,
  savePilotSettingsAction,
  type PilotSettingsActionState,
} from "@/app/faculty/cases/[caseId]/pilot-actions";
import type { FacultyPendingSource } from "@/lib/insforge/pilot";
import type { PilotSettings } from "@/lib/pilot-settings";

const initialActionState: PilotSettingsActionState = {};

export function AssignmentSetup({
  initialSettings,
  initialPendingSources,
}: {
  initialSettings: PilotSettings;
  initialPendingSources: FacultyPendingSource[];
}) {
  const [criteria, setCriteria] = useState(initialSettings.rubric);
  const [state, saveAction, savePending] = useActionState(savePilotSettingsAction, initialActionState);
  const [pendingSources, setPendingSources] = useState(initialPendingSources);
  const [uploadMessage, setUploadMessage] = useState<string>();
  const [uploadPending, setUploadPending] = useState(false);
  const [reviewPending, startReview] = useTransition();
  const persistent = process.env.NEXT_PUBLIC_PERSISTENCE_ENABLED === "true";

  function updateCriterion(index: number, field: "title" | "description" | "weight", value: string) {
    setCriteria((current) => current.map((criterion, itemIndex) => itemIndex === index
      ? { ...criterion, [field]: field === "weight" ? Number(value) : value }
      : criterion));
  }

  async function ingest(formData: FormData) {
    setUploadPending(true);
    setUploadMessage(undefined);
    try {
      const response = await fetch("/api/faculty/case-materials", { method: "POST", body: formData });
      const payload = await response.json() as {
        error?: string;
        message?: string;
        source?: { id: string; sourceKey: string; reviewStatus: "pending" };
        filename?: string;
        preview?: string;
      };
      if (!response.ok || !payload.source || !payload.filename || !payload.preview) throw new Error(payload.error || "Upload failed.");
      const pendingSource: FacultyPendingSource = {
        ...payload.source,
        filename: payload.filename,
        preview: payload.preview,
      };
      setPendingSources((current) => [
        ...current.filter((source) => source.id !== pendingSource.id),
        pendingSource,
      ]);
      setUploadMessage(payload.message);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "The document could not be uploaded.");
    } finally {
      setUploadPending(false);
    }
  }

  function review(sourceId: string, approve: boolean) {
    startReview(async () => {
      const result = await reviewCaseSourceAction(sourceId, approve);
      setUploadMessage(result.error || result.message);
      if (!result.error) setPendingSources((current) => current.filter((source) => source.id !== sourceId));
    });
  }

  return (
    <section className="mt-12 border-y rule py-8" aria-labelledby="pilot-controls-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Pilot controls</div>
          <h2 id="pilot-controls-title" className="serif mt-2 text-3xl">Shape the learning contract before release.</h2>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#506271]"><ShieldCheck size={16} /> Faculty controlled</div>
      </div>

      <form action={saveAction} className="mt-8 paper rounded-2xl p-6 sm:p-8">
        <input type="hidden" name="rubric" value={JSON.stringify(criteria)} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Reasoning rubric</div>
            <p className="mt-2 text-sm text-[#68727b]">Criteria guide feedback; they do not produce an automated grade. Weights must total 100%.</p>
          </div>
          <button
            type="button"
            disabled={criteria.length >= 8}
            onClick={() => setCriteria((current) => [...current, { title: "New criterion", description: "Describe the reasoning behavior to look for.", weight: 5 }])}
            className="btn-secondary disabled:opacity-50"
          ><Plus size={15} /> Add</button>
        </div>
        <div className="mt-6 space-y-4">
          {criteria.map((criterion, index) => (
            <fieldset key={index} className="grid gap-3 rounded-xl border rule p-4 sm:grid-cols-[1fr_1.5fr_90px_auto]">
              <label className="text-xs font-bold">Criterion<input required maxLength={80} value={criterion.title} onChange={(event) => updateCriterion(index, "title", event.target.value)} className="mt-2 w-full rounded-lg border rule bg-white p-3 text-sm font-normal" /></label>
              <label className="text-xs font-bold">Description<input required maxLength={500} value={criterion.description} onChange={(event) => updateCriterion(index, "description", event.target.value)} className="mt-2 w-full rounded-lg border rule bg-white p-3 text-sm font-normal" /></label>
              <label className="text-xs font-bold">Weight %<input required min={5} max={100} type="number" value={criterion.weight} onChange={(event) => updateCriterion(index, "weight", event.target.value)} className="mt-2 w-full rounded-lg border rule bg-white p-3 text-sm font-normal" /></label>
              <button type="button" aria-label={`Remove ${criterion.title}`} onClick={() => setCriteria((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="self-end rounded-lg border rule p-3 text-[#7a3d28]"><Trash2 size={16} /></button>
            </fieldset>
          ))}
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold">Shared feedback title<input name="feedbackTitle" maxLength={120} defaultValue={initialSettings.feedback?.title || ""} className="mt-2 w-full rounded-lg border rule bg-white p-3 font-normal" /></label>
          <label className="text-sm font-bold sm:col-span-2">Shared feedback<textarea name="feedbackBody" maxLength={4000} rows={4} defaultValue={initialSettings.feedback?.body || ""} placeholder="Optional class-level synthesis; never include individual responses or grades." className="mt-2 w-full rounded-lg border rule bg-white p-3 font-normal" /></label>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl bg-[#f1ede4] p-4 text-sm">
            <input type="checkbox" name="releaseRubric" defaultChecked={Boolean(initialSettings.rubricReleasedAt)} className="mt-1" />
            <span><b>Release rubric</b><br /><span className="text-[#68727b]">Independent and reversible.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-[#f1ede4] p-4 text-sm">
            <input type="checkbox" name="releaseFeedback" defaultChecked={Boolean(initialSettings.feedback?.releasedAt)} className="mt-1" />
            <span><b>Release shared feedback</b><br /><span className="text-[#68727b]">Requires saved feedback; independent from the rubric.</span></span>
          </label>
        </div>
        {(state.error || state.message) && <p role={state.error ? "alert" : "status"} className={`mt-4 text-sm ${state.error ? "text-[#7a3d28]" : "text-[#355b40]"}`}>{state.error || state.message}</p>}
        <button disabled={savePending || criteria.length === 0} className="btn-primary mt-5 disabled:opacity-50">
          {savePending ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
          {savePending ? "Saving…" : "Save rubric and release controls"}
        </button>
      </form>

      <div className="mt-8 rounded-2xl bg-[#10283f] p-6 text-white sm:p-8">
        <div className="eyebrow !text-[#d6b77e]">Secure case ingestion</div>
        <h3 className="serif mt-3 text-3xl">Add a grounded PDF or DOCX source.</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#cfdae1]">Files are limited to 4 MB, checked by extension, MIME and file signature, screened for macros, active PDF actions and known malware test signatures, extracted as plain text, stored privately, and quarantined until faculty approval.</p>
        {!persistent ? (
          <p className="mt-5 rounded-xl bg-white/10 p-4 text-sm">Enable InsForge persistence to upload private course material. Demo mode leaves production storage untouched.</p>
        ) : (
          <form action={ingest} className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-bold">Source title<input required name="title" maxLength={160} className="mt-2 w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-[#10283f] font-normal" /></label>
            <label className="text-sm font-bold">PDF or DOCX<input required name="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="mt-2 block w-full rounded-lg border border-white/20 bg-white px-3 py-2.5 text-sm text-[#10283f]" /></label>
            <button disabled={uploadPending} className="btn-primary self-end !bg-[#d6b77e] !text-[#10283f] disabled:opacity-60">{uploadPending ? <Loader2 className="animate-spin" size={15} /> : <FileCheck2 size={15} />} {uploadPending ? "Validating…" : "Validate upload"}</button>
          </form>
        )}
        {uploadMessage && <p role="status" className="mt-4 text-sm text-[#e7d8b9]">{uploadMessage}</p>}
        {pendingSources.length > 0 && <div className="mt-5 space-y-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[#d6b77e]">Pending faculty review</div>{pendingSources.map((source) => <div key={source.id} className="rounded-xl bg-white p-5 text-[#10283f]"><div className="text-xs font-bold text-[#8a6832]">{source.sourceKey} · pending review · {source.filename}</div><p className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap text-sm leading-6">{source.preview}</p><div className="mt-4 flex gap-3"><button disabled={reviewPending} type="button" onClick={() => review(source.id, true)} className="btn-primary">Approve for students</button><button disabled={reviewPending} type="button" onClick={() => review(source.id, false)} className="btn-secondary">Reject</button></div></div>)}</div>}
      </div>
    </section>
  );
}
