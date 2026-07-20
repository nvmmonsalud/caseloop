import { describe, expect, it } from "vitest";
import {
  appOrigin,
  buildLoginPath,
  getLoginNotice,
  roleHome,
  safeInternalPath,
} from "./navigation";

describe("auth navigation", () => {
  it("keeps safe internal destinations including their query", () => {
    expect(safeInternalPath("/student/cases/case-1?step=2")).toBe("/student/cases/case-1?step=2");
  });

  it.each([
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "/\\attacker.example/steal",
    "javascript:alert(1)",
  ])("rejects an unsafe post-auth destination: %s", (destination) => {
    expect(safeInternalPath(destination)).toBe("/student");
  });

  it("preserves an expired session destination on the login URL", () => {
    expect(buildLoginPath("/faculty/cases/case-1?tab=brief", "session_expired")).toBe(
      "/login?next=%2Ffaculty%2Fcases%2Fcase-1%3Ftab%3Dbrief&reason=session_expired",
    );
  });

  it("maps role mismatches to the authorized home", () => {
    expect(roleHome("student")).toBe("/student");
    expect(roleHome("faculty")).toBe("/faculty");
  });

  it("shows safe verification callback messaging without reflecting provider errors", () => {
    expect(getLoginNotice({ insforge_type: "verify_email", insforge_status: "success" })).toEqual({
      tone: "success",
      message: "Email verified. Sign in to continue to CaseFlow.",
    });
    expect(getLoginNotice({
      insforge_type: "verify_email",
      insforge_status: "error",
      insforge_error: "internal provider detail",
    })?.message).toBe("That verification link is invalid or expired. Request a new link below.");
  });

  it("requires an HTTPS canonical origin outside local development", () => {
    expect(appOrigin("https://caseloop.example/path", true)).toBe("https://caseloop.example");
    expect(appOrigin("http://localhost:3000", false)).toBe("http://localhost:3000");
    expect(() => appOrigin("http://caseloop.example", true)).toThrow(/HTTPS/);
    expect(() => appOrigin(undefined, true)).toThrow(/required/);
  });
});
