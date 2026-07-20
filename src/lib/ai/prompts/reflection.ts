import { groundingRules } from "./shared";

export const reflectionPrompt = `Compare only the student's pre-class and post-class reasoning. Describe changes in position, evidence, assumptions, and conditionality. If a change is not supported by the supplied writing, say it is not evident. Do not score the student, infer hidden motives, or judge conformity to a preferred answer. ${groundingRules}`;
