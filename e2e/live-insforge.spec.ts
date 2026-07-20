import { expect, test, type Page } from "@playwright/test";

import {
  completeCoachingAndDecision,
  diagnostic,
  fillDiagnostic,
  returnToDiagnostic,
} from "./helpers/student-journey";
import { liveEnvironment } from "./helpers/live-env";

test.describe.configure({ mode: "serial" });
test.skip(!liveEnvironment.available, liveEnvironment.reason);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  const signInForm = page.locator("form").first();
  await signInForm.getByLabel("Email", { exact: true }).fill(email);
  await signInForm.getByLabel("Password").fill(password);
  await signInForm.getByRole("button", { name: "Continue to CaseFlow" }).click();
}

function waitForPersistedAttempt(page: Page) {
  return page.waitForResponse((response) =>
    response.url().includes("/api/database/rpc/load_caseflow_attempt") && response.ok(),
  );
}

test("student completes and restores the full persisted journey", async ({ page }) => {
  await signIn(page, liveEnvironment.studentEmail, liveEnvironment.studentPassword);
  await expect(page).toHaveURL(/\/student$/);

  const initialAttempt = waitForPersistedAttempt(page);
  await page.goto("/student/cases/hikari-philippines");
  await initialAttempt;
  await returnToDiagnostic(page);
  await fillDiagnostic(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Socratic review · turn [12] of 2/)).toBeVisible();

  const restoredAttempt = waitForPersistedAttempt(page);
  await page.reload();
  await restoredAttempt;
  await returnToDiagnostic(page);
  await expect(page.getByLabel("Initial recommendation")).toHaveValue(diagnostic.recommendation);
  await expect(page.getByLabel("Strongest supporting evidence")).toHaveValue(diagnostic.evidence);

  await page.getByRole("button", { name: "Continue" }).click();
  await completeCoachingAndDecision(page);
  await expect(page).toHaveURL(/\/student\/cases\/hikari-philippines\/brief$/);
  await expect(page.getByRole("heading", { name: "Your pre-class brief" })).toBeVisible();
  await expect(page.getByText("Generated from your reasoning—not a model answer.")).toBeVisible();

  const reflection = "The discussion weakened my distribution assumption; [S4] made operating capacity decisive.";
  await page.getByPlaceholder("Describe your post-class position and the evidence that moved you.").fill(reflection);
  await page.getByRole("button", { name: "Compare reasoning" }).click();
  await expect(page.getByText("Reasoning shift")).toBeVisible();

  const restoredReflection = waitForPersistedAttempt(page);
  await page.reload();
  await restoredReflection;
  await expect(page.getByPlaceholder("Describe your post-class position and the evidence that moved you.")).toHaveValue(
    reflection,
  );
  await expect(page.getByText("Reasoning shift")).toBeVisible();

  await page.goto("/faculty");
  await expect(page).toHaveURL(/\/student$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=true$/);
  await expect(page.getByRole("status")).toHaveText("You have been signed out securely.");

  await signIn(page, liveEnvironment.studentEmail, liveEnvironment.studentPassword);
  await expect(page).toHaveURL(/\/student$/);
  const restoredAfterSignIn = waitForPersistedAttempt(page);
  await page.goto("/student/cases/hikari-philippines/brief");
  await restoredAfterSignIn;
  await expect(page.getByPlaceholder("Describe your post-class position and the evidence that moved you.")).toHaveValue(
    reflection,
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=true$/);
});

test("faculty reviews aggregates and releases course-scoped feedback", async ({ page }) => {
  await signIn(page, liveEnvironment.facultyEmail, liveEnvironment.facultyPassword);
  await expect(page).toHaveURL(/\/faculty$/);
  await expect(page.getByText(/fictional demo cohort/)).toBeVisible();

  await page.getByRole("link", { name: /Open cohort insight/ }).click();
  await expect(page.getByText(/No student identities, private responses, or preparation briefs/)).toBeVisible();
  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  expect(visibleText).not.toContain(liveEnvironment.studentEmail);
  expect(visibleText).not.toContain("student_id");

  await page.getByLabel("Shared feedback title").fill("Pilot discussion synthesis");
  await page.getByPlaceholder("Optional class-level synthesis; never include individual responses or grades.").fill(
    "Compare distribution reach with the operating-capacity constraints in [S4] before deepening commitment.",
  );
  await page.getByRole("checkbox", { name: /Release rubric/ }).check();
  await page.getByRole("checkbox", { name: /Release shared feedback/ }).check();
  await page.getByRole("button", { name: "Save rubric and release controls" }).click();
  await expect(page.getByRole("status")).toHaveText("Rubric, feedback, and release controls saved.");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=true$/);

  await signIn(page, liveEnvironment.studentEmail, liveEnvironment.studentPassword);
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByText("Faculty-released reasoning rubric")).toBeVisible();
  await expect(page.getByText("Pilot discussion synthesis")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=true$/);
});
