import { createBrowserClient } from "@insforge/sdk/ssr";
import { isInsForgePersistenceEnabled } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getInsForgeBrowserClient() {
  if (!isInsForgePersistenceEnabled()) {
    throw new Error("InsForge persistence is not configured.");
  }

  browserClient ??= createBrowserClient();
  return browserClient;
}
