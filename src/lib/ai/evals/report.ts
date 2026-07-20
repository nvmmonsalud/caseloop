import type { AIEvalReport } from "./types";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const money = (value: number) => `$${value.toFixed(4)}`;

export function renderEvalJson(report: AIEvalReport) {
  return JSON.stringify(report, null, 2);
}

export function renderEvalMarkdown(report: AIEvalReport) {
  const lines = [
    "# CaseFlow AI evaluation",
    "",
    `- Result: **${report.passed ? "PASS" : "FAIL"}**`,
    `- Mode: \`${report.mode}\``,
    `- Model: \`${report.model}\``,
    `- Cases: ${report.summary.passedCases}/${report.summary.totalCases} passed`,
    `- Checks: ${percent(report.summary.overallPassRate)} passed`,
    `- Critical checks: ${percent(report.summary.criticalPassRate)} passed`,
    `- Tokens: ${report.summary.totalTokens.toLocaleString("en-US")}`,
    `- Estimated cost: ${money(report.summary.estimatedCostUsd)}`,
    "",
    "| Fixture | Workflow | Result | Score | Tokens | Cost |",
    "|---|---|---:|---:|---:|---:|",
    ...report.cases.map(
      (item) =>
        `| ${item.fixtureId} | ${item.feature} | ${item.passed ? "PASS" : "FAIL"} | ${percent(item.score)} | ${item.usage.totalTokens} | ${money(item.estimatedCostUsd)} |`,
    ),
  ];

  const failures = report.cases.flatMap((item) =>
    item.checks
      .filter((check) => !check.passed)
      .map(
        (check) =>
          `- \`${item.fixtureId}/${check.id}\`${check.critical ? " (critical)" : ""}: ${check.message}`,
      ),
  );

  if (failures.length > 0) {
    lines.push("", "## Failed checks", "", ...failures);
  }

  lines.push(
    "",
    "Reports contain fixture IDs, scores, and usage only. Inputs, prompts, model outputs, and credentials are never written.",
  );

  return `${lines.join("\n")}\n`;
}
