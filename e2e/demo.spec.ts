import { expect, test } from "@playwright/test";

import { completeCoachingAndDecision, diagnostic, fillDiagnostic } from "./helpers/student-journey";

test("student completes the deterministic preparation and reflection journey", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("link", { name: /Student/ }).click();
  await expect(page.getByRole("heading", { name: "Good morning, Maya." })).toBeVisible();
  await page.getByRole("link", { name: /Continue preparation/ }).click();

  await fillDiagnostic(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Socratic review · turn 1 of 2/)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Initial recommendation")).toHaveValue(diagnostic.recommendation);
  await expect(page.getByLabel("Strongest supporting evidence")).toHaveValue(diagnostic.evidence);
  await expect(page.getByLabel("Biggest uncertainty")).toHaveValue(diagnostic.uncertainty);

  await page.getByRole("button", { name: "Continue" }).click();
  await completeCoachingAndDecision(page);

  await expect(page).toHaveURL(/\/student\/cases\/hikari-philippines\/brief$/);
  await expect(page.getByRole("heading", { name: "Your pre-class brief" })).toBeVisible();
  await expect(page.getByText("Generated from your reasoning—not a model answer.")).toBeVisible();
  await expect(page.getByText(/Source references: \[S2\]/)).toBeVisible();

  await page.getByPlaceholder("Describe your post-class position and the evidence that moved you.").fill(
    "The class discussion weakened my distribution assumption; [S4] made operating capacity decisive.",
  );
  await page.getByRole("button", { name: "Compare reasoning" }).click();
  await expect(page.getByText("Reasoning shift")).toBeVisible();
  await expect(page.getByText("Weakest assumption")).toBeVisible();
  await expect(page.getByText("New evidence")).toBeVisible();
});

test("faculty sees only fictional aggregate and anonymous representative arguments", async ({ page }) => {
  await page.goto("/faculty");
  await expect(page.getByText("Faculty workspace · fictional demo cohort")).toBeVisible();
  await expect(page.getByText("Updated from 12 synthetic responses")).toBeVisible();
  await expect(page.getByText("74%")).toBeVisible();

  await page.getByRole("link", { name: /Open cohort insight/ }).click();
  await expect(page.getByText(/No student identities, private responses, or preparation briefs/)).toBeVisible();
  await expect(page.getByText("Anonymous representative arguments")).toBeVisible();
  await expect(page.getByText(/Anonymous A01/)).toBeVisible();

  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  expect(visibleText).not.toContain("student_id");
  expect(visibleText).not.toContain("Maya Chen");
});
