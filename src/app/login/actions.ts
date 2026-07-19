"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

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

function safeNext(formData: FormData) {
  const value = String(formData.get("next") || "/student");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/student";
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
      error: error?.message || "Sign in failed.",
      fields: { email: parsed.data.email },
    };
  }

  redirect(safeNext(formData));
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
  const { data, error } = await auth.signUp({
    ...parsed.data,
    redirectTo: new URL("/login?verified=true", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").toString(),
  });
  if (error) {
    return {
      mode: "signup",
      error: error.message || "Account creation failed.",
      fields: { name: parsed.data.name, email: parsed.data.email },
    };
  }

  if (data?.requireEmailVerification || !data?.user) {
    return {
      mode: "signin",
      message: "Check your email to verify your account, then sign in.",
      fields: { email: parsed.data.email },
    };
  }

  redirect(safeNext(formData));
}

export async function signOutAction() {
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  redirect("/login");
}
