import { expect, test, type Page } from "@playwright/test";

import { diagnostic, fillDiagnostic, returnToDiagnostic } from "./helpers/student-journey";
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

test("student persists a diagnostic, is role-restricted, and signs out", async ({ page }) => {
  await signIn(page, liveEnvironment.studentEmail, liveEnvironment.studentPassword);
  await expect(page).toHaveURL(/\/student$/);

  await page.goto("/student/cases/hikari-philippines");
  await returnToDiagnostic(page);
  await fillDiagnostic(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Socratic review · turn [12] of 2/)).toBeVisible();

  await page.reload();
  await returnToDiagnostic(page);
  await expect(page.getByLabel("Initial recommendation")).toHaveValue(diagnostic.recommendation);
  await expect(page.getByLabel("Strongest supporting evidence")).toHaveValue(diagnostic.evidence);

  await page.goto("/faculty");
  await expect(page).toHaveURL(/\/student$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=true$/);
  await expect(page.getByRole("status")).toHaveText("You have been signed out securely.");
});

test("faculty sees aggregate-only analytics and signs out", async ({ page }) => {
  await signIn(page, liveEnvironment.facultyEmail, liveEnvironment.facultyPassword);
  await expect(page).toHaveURL(/\/faculty$/);
  await expect(page.getByText(/fictional demo cohort/)).toBeVisible();

  await page.getByRole("link", { name: /Open cohort insight/ }).click();
  await expect(page.getByText(/No student identities, private responses, or preparation briefs/)).toBeVisible();
  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  expect(visibleText).not.toContain(liveEnvironment.studentEmail);
  expect(visibleText).not.toContain("student_id");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=true$/);
});
