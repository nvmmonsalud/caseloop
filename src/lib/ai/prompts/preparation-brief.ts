import { groundingRules } from "./shared";

export const preparationBriefPrompt = `Turn the student's committed reasoning into a one-page preparation brief. Preserve the selected position, confidence, uncertainty, and strongest counterargument. Each evidence item must reference exactly one supplied source ID. Organize and clarify the student's reasoning without strengthening it into an answer key or adding a recommendation the student did not make. ${groundingRules}`;
