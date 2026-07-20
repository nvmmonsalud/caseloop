import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authActions: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  resendVerificationEmail: vi.fn(),
  clearAuthCookies: vi.fn(),
  cookieStore: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: vi.fn(() => mocks.authActions),
  createServerClient: vi.fn(() => ({
    auth: { resendVerificationEmail: mocks.resendVerificationEmail },
  })),
  clearAuthCookies: mocks.clearAuthCookies,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => mocks.cookieStore) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  resendVerificationAction,
  signInAction,
  signOutAction,
  signUpAction,
} from "./actions";

function credentials(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("email", "student@example.com");
  form.set("password", "correct-horse");
  form.set("next", "/student/cases/case-1?step=2");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

describe("login server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://caseloop.example";
  });

  it("signs in and returns to a validated intended route", async () => {
    mocks.authActions.signInWithPassword.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    await expect(signInAction({}, credentials())).rejects.toThrow(
      "NEXT_REDIRECT:/student/cases/case-1?step=2",
    );
  });

  it("rejects invalid credentials before contacting InsForge", async () => {
    const state = await signInAction({}, credentials({ email: "not-an-email", password: "short" }));

    expect(state.error).toBe("Enter a valid email address.");
    expect(mocks.authActions.signInWithPassword).not.toHaveBeenCalled();
  });

  it("does not expose provider details for failed sign-in", async () => {
    mocks.authActions.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "User exists but has not verified email" },
    });

    const state = await signInAction({}, credentials());
    expect(state.error).not.toContain("User exists");
    expect(state.error).toContain("Unable to sign in");
  });

  it("signs up with the exact allowlisted verification callback", async () => {
    mocks.authActions.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, requireEmailVerification: true },
      error: null,
    });
    const form = credentials({ name: "Maya Chen" });

    const state = await signUpAction({}, form);
    expect(mocks.authActions.signUp).toHaveBeenCalledWith(expect.objectContaining({
      redirectTo: "https://caseloop.example/login",
    }));
    expect(state.message).toContain("If the address can receive");
  });

  it("returns the same resend response when the provider rejects the request", async () => {
    mocks.resendVerificationEmail.mockResolvedValue({
      data: null,
      error: { message: "No such account" },
    });
    const success = await resendVerificationAction({}, credentials());
    mocks.resendVerificationEmail.mockRejectedValueOnce(new Error("rate limited"));
    const failure = await resendVerificationAction({}, credentials());

    expect(success.message).toBe(failure.message);
    expect(success.message).toContain("If that account is awaiting verification");
  });

  it("clears local auth cookies and redirects even when provider sign-out fails", async () => {
    mocks.authActions.signOut.mockRejectedValue(new Error("provider unavailable"));

    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/login?signed_out=true");
    expect(mocks.clearAuthCookies).toHaveBeenCalledWith(mocks.cookieStore);
  });
});
