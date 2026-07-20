import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { caseStudy } from "@/lib/data";
import { runAI, AIServiceError } from "./service";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: vi.fn() };
});

const mockedGenerateText = vi.mocked(generateText);
const coachOutput = {
  question: "What must be true for the partner network to create reach?",
  challenge: "Which operating constraint in [S4] most threatens that claim?",
  sourceIds: ["S4"] as const,
  inference: "Execution capacity may be the binding constraint.",
};
const coachInput = {
  student: {
    recommendation: "Joint venture",
    evidence: "Outlet access [S5]",
    uncertainty: "Execution quality",
  },
  caseSources: caseStudy.sources,
};

describe("runAI", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("AI_GATEWAY_MODEL", "openai/gpt-5.6-terra");
    vi.stubEnv("AI_REASONING_EFFORT", "medium");
    vi.stubEnv("AI_FALLBACK_ON_ERROR", "true");
    mockedGenerateText.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns the deterministic response without calling a provider in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");

    const result = await runAI("coach", coachInput);

    expect(result.mode).toBe("demo");
    expect(result.data).toMatchObject({ sourceIds: ["S5"] });
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("generates and validates a live Gateway response", async () => {
    mockedGenerateText.mockResolvedValue({ output: coachOutput } as never);

    const result = await runAI("coach", coachInput);

    expect(result).toEqual({ data: coachOutput, mode: "live" });
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-5.6-terra",
        reasoning: "medium",
        timeout: 30_000,
        maxRetries: 1,
      }),
    );
  });

  it("uses a safe fallback when the provider fails", async () => {
    mockedGenerateText.mockRejectedValue(new Error("provider unavailable"));

    const result = await runAI("coach", coachInput);

    expect(result.mode).toBe("fallback");
    expect(result.data).toMatchObject({ sourceIds: ["S5"] });
  });

  it("uses a safe fallback when structured output is malformed", async () => {
    mockedGenerateText.mockResolvedValue({ output: { question: "Incomplete" } } as never);

    const result = await runAI("coach", coachInput);

    expect(result.mode).toBe("fallback");
    expect(result.data).toHaveProperty("challenge");
  });

  it("rejects hallucinated source IDs before returning a live result", async () => {
    mockedGenerateText.mockResolvedValue({
      output: { ...coachOutput, sourceIds: ["S3"] },
    } as never);
    const input = {
      ...coachInput,
      caseSources: caseStudy.sources.filter((source) => source.id === "S4"),
    };

    const result = await runAI("coach", input);

    expect(result.mode).toBe("fallback");
  });

  it("surfaces a controlled error when fallback is explicitly disabled", async () => {
    vi.stubEnv("AI_FALLBACK_ON_ERROR", "false");
    mockedGenerateText.mockRejectedValue(new Error("provider unavailable"));

    await expect(runAI("coach", coachInput)).rejects.toEqual(
      expect.objectContaining<Partial<AIServiceError>>({
        name: "AIServiceError",
        status: 502,
      }),
    );
  });
});
