import "server-only";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isInsForgePersistenceEnabled } from "./config";
import { buildLoginPath, roleHome } from "@/lib/auth/navigation";

export type CaseFlowSession = {
  userId: string;
  email: string;
  displayName: string;
  role: "student" | "faculty";
};

export async function getCaseFlowSession(): Promise<CaseFlowSession | null> {
  if (!isInsForgePersistenceEnabled()) return null;

  const client = createServerClient({ cookies: await cookies() });
  const { data: authData, error: authError } = await client.auth.getCurrentUser();
  if (authError || !authData?.user) return null;

  const fallbackName = authData.user.profile?.name || authData.user.email.split("@")[0];
  const { error: bootstrapError } = await client.database.rpc("bootstrap_caseflow_profile", {
    display_name_input: fallbackName,
  });
  if (bootstrapError) {
    throw new Error(`Could not initialize the CaseFlow profile: ${bootstrapError.message}`);
  }

  const { data: profile, error: profileError } = await client.database
    .from("profiles")
    .select("display_name, role")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Could not load the CaseFlow profile: ${profileError?.message ?? "Profile missing"}`);
  }

  return {
    userId: authData.user.id,
    email: authData.user.email,
    displayName: String(profile.display_name),
    role: profile.role === "faculty" ? "faculty" : "student",
  };
}

export async function requireCaseFlowRole(role: "student" | "faculty") {
  if (!isInsForgePersistenceEnabled()) return null;

  const session = await getCaseFlowSession();
  if (!session) redirect(buildLoginPath(`/${role}`, "sign_in_required"));
  if (session.role !== role) redirect(roleHome(session.role));
  return session;
}
