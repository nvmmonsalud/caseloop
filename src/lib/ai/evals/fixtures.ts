import type { AIEvalFixture } from "./types";

const fictionalSources = [
  {
    id: "S1",
    title: "Market timing",
    text: "The fictional market is growing 8% annually, while two competitors plan launches within 18 months.",
  },
  {
    id: "S2",
    title: "Acquisition candidate",
    text: "A fictional acquisition would provide 9% share but require substantial integration investment.",
  },
  {
    id: "S3",
    title: "Customer research",
    text: "Synthetic interviews favor localized flavors and smaller package sizes.",
  },
  {
    id: "S4",
    title: "Operating capacity",
    text: "The fictional company has no local integration team and can staff only one major expansion this year.",
  },
  {
    id: "S5",
    title: "Partner proposal",
    text: "A fictional partner offers access to 18,000 outlets without guaranteeing service levels or sell-through.",
  },
] as const;

export const aiEvalFixtures = [
  {
    id: "coach-assumption-pressure-test",
    feature: "coach",
    description: "Challenges an outlet-access assumption without choosing for the student.",
    input: {
      student: {
        recommendation: "Joint venture",
        evidence: "Partner access could accelerate entry [S5].",
        uncertainty: "Whether access becomes reliable distribution.",
      },
      caseSources: fictionalSources,
    },
  },
  {
    id: "brief-preserves-committed-reasoning",
    feature: "brief",
    description: "Preserves a synthetic student's position, evidence, uncertainty, and confidence.",
    input: {
      student: {
        position: "Organic entry",
        recommendation: "Pilot organically before scaling.",
        rationale: "A pilot tests localization before a larger commitment.",
        evidence: "Customer research supports localization [S3].",
        uncertainty: "The cost of waiting while competitors prepare launches [S1].",
        coachResponse: "My assumption is that a pilot can learn fast enough.",
        risk: "Slow distribution growth.",
        mitigation: "Set a six-month decision gate.",
        confidence: 68,
      },
      caseSources: fictionalSources,
    },
  },
  {
    id: "cohort-anonymous-patterns",
    feature: "cohort",
    description: "Aggregates only anonymous, fictional reasoning patterns.",
    input: {
      responses: [
        { position: "Joint venture", evidence: ["S5"], assumption: "Outlet access creates distribution." },
        { position: "Joint venture", evidence: ["S5"], assumption: "Partner access is fast." },
        { position: "Acquisition", evidence: ["S2", "S4"], assumption: "Integration is manageable." },
        { position: "Organic entry", evidence: ["S1", "S3"], assumption: "A pilot can learn quickly." },
      ],
      caseSources: fictionalSources,
    },
  },
  {
    id: "plan-sixty-minutes",
    feature: "plan",
    description: "Produces a complete 60-minute plan from anonymous fictional patterns.",
    input: {
      duration: 60,
      responses: [
        { position: "Joint venture", evidence: ["S5"] },
        { position: "Acquisition", evidence: ["S2", "S4"] },
        { position: "Organic entry", evidence: ["S1", "S3"] },
      ],
      caseSources: fictionalSources,
    },
  },
  {
    id: "reflection-evidence-shift",
    feature: "reflection",
    description: "Compares synthetic pre/post reasoning and preserves newly cited evidence.",
    input: {
      preClass: {
        position: "Joint venture",
        uncertainty: "Whether partner access becomes effective reach.",
        evidence: "The partner offers 18,000 outlets [S5].",
      },
      postClass:
        "I still prefer a joint venture, but operating capacity [S4] makes my recommendation conditional on a staged governance plan.",
      caseSources: fictionalSources,
    },
  },
] satisfies AIEvalFixture[];

export const fixturesById = Object.fromEntries(
  aiEvalFixtures.map((fixture) => [fixture.id, fixture]),
) as Record<(typeof aiEvalFixtures)[number]["id"], AIEvalFixture>;
