import { defineConfig, devices } from "@playwright/test";

const demoBaseUrl = "http://127.0.0.1:3100";
const authBaseUrl = "http://127.0.0.1:3101";
const mockInsForgeUrl = "http://127.0.0.1:3199";
const liveBaseUrl = process.env.E2E_LIVE_BASE_URL || authBaseUrl;

function serverEnv(overrides: Record<string, string>) {
  return Object.fromEntries(
    Object.entries({ ...process.env, ...overrides }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "demo",
      testMatch: /demo\.spec\.ts/,
      use: { baseURL: demoBaseUrl },
    },
    {
      name: "auth-contract",
      testMatch: /auth-contract\.spec\.ts/,
      use: { baseURL: authBaseUrl },
    },
    {
      name: "live",
      testMatch: /live-insforge\.spec\.ts/,
      use: {
        baseURL: liveBaseUrl,
        trace: "off",
        video: "off",
      },
      fullyParallel: false,
    },
  ],
  webServer: [
    {
      name: "mock-insforge",
      command: "node e2e/support/mock-insforge.mjs",
      url: `${mockInsForgeUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      name: "demo-app",
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: `${demoBaseUrl}/demo`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: serverEnv({
        NEXT_DIST_DIR: ".next-e2e-demo",
        DEMO_MODE: "true",
        NEXT_PUBLIC_PERSISTENCE_ENABLED: "false",
        NEXT_PUBLIC_APP_URL: demoBaseUrl,
      }),
    },
    {
      name: "auth-contract-app",
      command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
      url: `${authBaseUrl}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: serverEnv({
        NEXT_DIST_DIR: ".next-e2e-auth",
        DEMO_MODE: "true",
        NEXT_PUBLIC_PERSISTENCE_ENABLED: "true",
        NEXT_PUBLIC_INSFORGE_URL: mockInsForgeUrl,
        NEXT_PUBLIC_INSFORGE_ANON_KEY: "e2e-public-anon-key",
        NEXT_PUBLIC_APP_URL: authBaseUrl,
      }),
    },
  ],
});
