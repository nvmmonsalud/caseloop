import { expect, type Page } from "@playwright/test";

export const diagnostic = {
  recommendation: "Use a staged joint venture with governance gates.",
  evidence: "The JV requires less capital [S2], while the partner adds local reach [S5].",
  uncertainty: "Outlet access may not translate into quality distribution.",
};

export async function fillDiagnostic(page: Page, values = diagnostic) {
  await page.getByLabel("Initial recommendation").fill(values.recommendation);
  await page.getByLabel("Strongest supporting evidence").fill(values.evidence);
  await page.getByLabel("Biggest uncertainty").fill(values.uncertainty);
}

export async function returnToDiagnostic(page: Page) {
  for (let attempts = 0; attempts < 3; attempts += 1) {
    if (await page.getByRole("heading", { name: "What is your first call?" }).isVisible()) return;
    await page.getByRole("button", { name: "Back" }).click();
  }
  await expect(page.getByRole("heading", { name: "What is your first call?" })).toBeVisible();
}

export async function completeCoachingAndDecision(page: Page) {
  await expect(page.getByText(/Socratic review · turn 1 of 2/)).toBeVisible();
  await page.getByLabel("Response to coach").fill(
    "My assumption is that partner access becomes effective distribution only with service-level controls [S5].",
  );
  await page.getByRole("button", { name: "Next challenge" }).click();

  await expect(page.getByText(/Socratic review · turn 2 of 2/)).toBeVisible();
  await page.getByLabel("Response to follow-up").fill(
    "The operating-risk memo [S4] weakens my view, so I would stage capital behind integration milestones.",
  );
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Commit your recommendation." })).toBeVisible();
  await page.getByRole("button", { name: "Joint venture" }).click();
  await page.getByLabel("Rationale").fill("A staged JV balances speed, local knowledge, and reversible capital exposure.");
  await page.getByLabel("Key risk").fill("Informal reporting controls could hide execution problems.");
  await page.getByLabel("Mitigation").fill("Require audited milestones and a board-level escalation mechanism.");
  await page.getByLabel("Confidence").fill("82");
  await page.getByRole("button", { name: "Create preparation brief" }).click();
}
