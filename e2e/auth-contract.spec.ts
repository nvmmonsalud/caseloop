import { expect, test } from "@playwright/test";

test("protected student and faculty routes preserve their intended destination", async ({ page }) => {
  for (const path of ["/student/cases/hikari-philippines?step=2", "/faculty/cases/hikari-philippines"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?/);
    const current = new URL(page.url());
    expect(current.searchParams.get("next")).toBe(path);
    expect(current.searchParams.get("reason")).toBe("sign_in_required");
    await expect(page.getByRole("status")).toContainText("Sign in to continue to your private workspace.");
  }
});

test("verification redirects show success and safe failure messages", async ({ page }) => {
  await page.goto("/login?insforge_type=verify_email&insforge_status=success");
  await expect(page.getByRole("status")).toHaveText("Email verified. Sign in to continue to CaseFlow.");

  await page.goto("/login?insforge_type=verify_email&insforge_status=error&insforge_error=private-provider-detail");
  await expect(page.getByText(
    "That verification link is invalid or expired. Request a new link below.",
    { exact: true },
  )).toBeVisible();
  await expect(page.locator("body")).not.toContainText("private-provider-detail");
});

test("sign-in errors remain useful without exposing provider details", async ({ page }) => {
  await page.goto("/login");
  const signInForm = page.locator("form").first();
  await signInForm.getByLabel("Email", { exact: true }).fill("student@example.com");
  await signInForm.getByLabel("Password").fill("wrong-password");
  await signInForm.getByRole("button", { name: "Continue to CaseFlow" }).click();

  await expect(signInForm.getByRole("alert")).toHaveText(
    "Unable to sign in with those credentials. Check your details or request a new verification link.",
  );
  await expect(page.locator("body")).not.toContainText("No deterministic E2E session is configured");
});
