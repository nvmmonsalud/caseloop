import { groundingRules } from "./shared";
export const cohortAnalysisPrompt=`Analyze only the provided anonymized cohort responses. Derive counts exactly; find reasoning gaps, overlooked evidence, and useful tensions. Do not infer protected traits or expose identities. ${groundingRules}`;
