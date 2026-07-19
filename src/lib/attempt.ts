import { z } from "zod"; import { POSITION_OPTIONS } from "./data";
export const ATTEMPT_STORAGE_KEY="caseflow-attempt";
export const attemptSchema=z.object({recommendation:z.string(),evidence:z.string(),uncertainty:z.string(),position:z.enum(POSITION_OPTIONS),rationale:z.string(),risk:z.string(),mitigation:z.string(),confidence:z.number().min(20).max(100),coachResponse:z.string(),followupResponse:z.string()});
export type AttemptDraft=z.infer<typeof attemptSchema>;
export function readStoredAttempt(raw:string|null):AttemptDraft|null{if(!raw)return null;try{const parsed=attemptSchema.safeParse(JSON.parse(raw));return parsed.success?parsed.data:null}catch{return null}}
