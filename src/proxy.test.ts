import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }));

vi.mock("@insforge/sdk/ssr/middleware", () => ({ updateSession: mocks.updateSession }));
vi.mock("@/lib/insforge/config", () => ({ isInsForgePersistenceEnabled: () => true }));

import { proxy } from "./proxy";

describe("auth proxy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an expired protected session to login with its intended route", async () => {
    mocks.updateSession.mockResolvedValue({
      refreshed: false,
      accessToken: null,
      error: { message: "refresh expired" },
    });
    const request = new NextRequest("https://caseloop.example/student/cases/case-1?step=2");

    const response = await proxy(request);
    const location = response.headers.get("location");
    expect(response.status).toBe(307);
    expect(location).toBe(
      "https://caseloop.example/login?next=%2Fstudent%2Fcases%2Fcase-1%3Fstep%3D2&reason=session_expired",
    );
  });

  it("allows a protected request after a successful refresh", async () => {
    mocks.updateSession.mockResolvedValue({ refreshed: true, accessToken: "short-lived-token", error: null });

    const response = await proxy(new NextRequest("https://caseloop.example/faculty"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
