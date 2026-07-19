import { groundingRules } from "./shared";
export const preparationBriefPrompt=`Turn the student's own committed reasoning into a one-page preparation brief. Preserve uncertainty and the strongest counterargument; do not improve the student's position into an answer key. ${groundingRules}`;
