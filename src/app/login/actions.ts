"use server";

import { clearAuthCookies, createAuthActions, createServerClient, type CookieStore } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appOrigin, safeInternalPath } from "@/lib/auth/navigation";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(2, "Enter your name.").max(120, "Keep your name under 120 characters."),
});

export type AuthFormState = {
  mode?: "signin" | "signup";
  message?: string;
  error?: string;
  fields?: { email?: string; name?: string };
};

function nextFrom(formData: FormData) {
  return safeInternalPath(String(formData.get("next") || ""));
}

function verificationRedirectUrl() {
  return new URL(
    "/login",
    appOrigin(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV === "production"),
  ).toString();
}

export async function signInAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      mode: "signin",
      error: parsed.error.issues[0]?.message,
      fields: { email: String(formData.get("email") || "") },
    };
  }

  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signInWithPassword(parsed.data);
  if (error || !data?.user) {
    return {
      mode: "signin",
      error: "Unable to sign in with those credentials. Check your details or request a new verification link.",
      fields: { email: parsed.data.email },
    };
  }

  redirect(nextFrom(formData));
}

export async function signUpAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      mode: "signup",
      error: parsed.error.issues[0]?.message,
      fields: {
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
      },
    };
  }

  const auth = createAuthActions({ cookies: await cookies() });
  let redirectTo: string;
  try {
    redirectTo = verificationRedirectUrl();
  } catch {
    return {
      mode: "signup",
      error: "Account creation is temporarily unavailable. Please try again later.",
      fields: { name: parsed.data.name, email: parsed.data.email },
    };
  }

  const { data, error } = await auth.signUp({ ...parsed.data, redirectTo });
  if (error) {
    return {
      mode: "signup",
      error: "We could not complete that request. Wait a minute, then try again or sign in.",
      fields: { name: parsed.data.name, email: parsed.data.email },
    };
  }

  if (data?.requireEmailVerification || !data?.user) {
    return {
      mode: "signin",
      message: "If the address can receive a verification email, a link will arrive shortly. Verify it, then sign in.",
      fields: { email: parsed.data.email },
    };
  }

  redirect(nextFrom(formData));
}

export async function resendVerificationAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = z.email("Enter a valid email address.").safeParse(formData.get("email"));
  if (!parsed.success) {
    return { mode: "signin", error: parsed.error.issues[0]?.message };
  }

  try {
    const client = createServerClient({ cookies: await cookies() });
    await client.auth.resendVerificationEmail({
      email: parsed.data,
      redirectTo: verificationRedirectUrl(),
    });
  } catch {
    // Keep this response non-enumerating, including for provider and rate-limit errors.
  }

  return {
    mode: "signin",
    message: "If that account is awaiting verification, a new link will arrive shortly. Wait at least one minute before trying again.",
    fields: { email: parsed.data },
  };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });
  try {
    await auth.signOut();
  } catch {
    // Local session removal must still succeed if the provider is temporarily unavailable.
  } finally {
    clearAuthCookies(cookieStore as unknown as CookieStore);
  }
  redirect("/login?signed_out=true");
}
