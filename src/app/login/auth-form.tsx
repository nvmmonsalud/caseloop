"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { signInAction, signUpAction, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export function AuthForm({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signIn, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initialState);
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signInPending || signUpPending;

  return (
    <div className="paper rounded-2xl p-6 sm:p-8">
      <div className="grid grid-cols-2 rounded-xl bg-[#eee8dc] p-1 text-sm font-bold">
        {(["signin", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-lg px-4 py-2.5 ${mode === item ? "bg-white text-[#10283f] shadow-sm" : "text-[#6b747b]"}`}
          >
            {item === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form action={mode === "signin" ? signIn : signUp} className="mt-7 space-y-5">
        <input type="hidden" name="next" value={nextPath} />
        {mode === "signup" && (
          <Field label="Name" name="name" type="text" autoComplete="name" defaultValue={state.fields?.name} />
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />

        {state.error && (
          <p role="alert" className="rounded-xl border border-[#d8b9a9] bg-[#fff5ef] p-3 text-sm text-[#7a3d28]">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-xl border border-[#b9cdbd] bg-[#f1f8f2] p-3 text-sm text-[#355b40]">
            {state.message}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full justify-center disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
          {mode === "signin" ? "Continue to CaseFlow" : "Create student account"}
        </button>
      </form>
      <p className="mt-5 text-xs leading-5 text-[#6b747b]">
        New accounts begin with the student role. Faculty access is granted by the course administrator.
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border rule bg-[#fffdf8] px-4 py-3 font-normal focus:border-[#a27b3c]"
      />
    </label>
  );
}
