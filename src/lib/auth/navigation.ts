export const DEFAULT_POST_AUTH_PATH = "/student";

export type AppRole = "student" | "faculty";

export type LoginNotice = {
  tone: "success" | "error" | "info";
  message: string;
};

type SearchValue = string | string[] | undefined;

function firstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function safeInternalPath(value: string | null | undefined, fallback = DEFAULT_POST_AUTH_PATH) {
  if (!value || !value.startsWith("/")) return fallback;

  try {
    const base = new URL("https://caseflow.invalid");
    const destination = new URL(value, base);
    if (destination.origin !== base.origin) return fallback;

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function roleHome(role: AppRole) {
  return role === "faculty" ? "/faculty" : "/student";
}

export function buildLoginPath(
  intendedPath: string | null | undefined,
  reason?: "session_expired" | "sign_in_required",
) {
  const params = new URLSearchParams({ next: safeInternalPath(intendedPath) });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

export function getLoginNotice(params: Record<string, SearchValue>): LoginNotice | null {
  const status = firstValue(params.insforge_status);
  const type = firstValue(params.insforge_type);
  const reason = firstValue(params.reason);
  const signedOut = firstValue(params.signed_out);

  if (type === "verify_email" && status === "success") {
    return { tone: "success", message: "Email verified. Sign in to continue to CaseFlow." };
  }

  if (type === "verify_email" && status === "error") {
    return {
      tone: "error",
      message: "That verification link is invalid or expired. Request a new link below.",
    };
  }

  if (reason === "session_expired") {
    return { tone: "info", message: "Your session expired. Sign in again to continue where you left off." };
  }

  if (reason === "sign_in_required") {
    return { tone: "info", message: "Sign in to continue to your private workspace." };
  }

  if (signedOut === "true") {
    return { tone: "success", message: "You have been signed out securely." };
  }

  return null;
}

export function appOrigin(configuredOrigin: string | undefined, production: boolean) {
  if (!configuredOrigin) {
    if (production) throw new Error("NEXT_PUBLIC_APP_URL is required in production.");
    return "http://localhost:3000";
  }

  const url = new URL(configuredOrigin);
  const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS, except for local development.");
  }

  return url.origin;
}
