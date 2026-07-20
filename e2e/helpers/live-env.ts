const productionHosts = new Set(["caseloop-zeta.vercel.app"]);

const required = [
  "E2E_LIVE_BASE_URL",
  "E2E_STUDENT_EMAIL",
  "E2E_STUDENT_PASSWORD",
  "E2E_FACULTY_EMAIL",
  "E2E_FACULTY_PASSWORD",
  "E2E_NON_PRODUCTION_CONFIRM",
] as const;

const missing = required.filter((name) => !process.env[name]);
let unsafeHost = false;

if (process.env.E2E_LIVE_BASE_URL) {
  try {
    const target = new URL(process.env.E2E_LIVE_BASE_URL);
    const localHttp = target.protocol === "http:" && ["127.0.0.1", "localhost"].includes(target.hostname);
    unsafeHost = productionHosts.has(target.hostname) || (target.protocol !== "https:" && !localHttp);
  } catch {
    unsafeHost = true;
  }
}

const nonProductionConfirmed = process.env.E2E_NON_PRODUCTION_CONFIRM === "true";

export const liveEnvironment = {
  available: missing.length === 0 && !unsafeHost && nonProductionConfirmed,
  reason: unsafeHost
    ? "E2E_LIVE_BASE_URL must be HTTPS and target an isolated non-production deployment."
    : !nonProductionConfirmed
      ? "Set E2E_NON_PRODUCTION_CONFIRM=true only for an isolated non-production deployment."
      : `Live InsForge E2E requires: ${missing.join(", ")}`,
  studentEmail: process.env.E2E_STUDENT_EMAIL || "",
  studentPassword: process.env.E2E_STUDENT_PASSWORD || "",
  facultyEmail: process.env.E2E_FACULTY_EMAIL || "",
  facultyPassword: process.env.E2E_FACULTY_PASSWORD || "",
};
