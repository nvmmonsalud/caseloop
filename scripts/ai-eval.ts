import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderEvalJson, renderEvalMarkdown } from "../src/lib/ai/evals/report";
import { runEvalSuite } from "../src/lib/ai/evals/runner";
import type { EvalMode } from "../src/lib/ai/evals/types";

type OutputFormat = "json" | "markdown";

function argumentValue(name: string) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];
  return process.argv
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function parseArguments() {
  const mode = (argumentValue("--mode") || "offline") as EvalMode;
  const format = (argumentValue("--format") || "markdown") as OutputFormat;
  const outputDir = argumentValue("--output-dir");

  if (!(["offline", "live"] as const).includes(mode)) {
    throw new Error("--mode must be offline or live.");
  }
  if (!(["json", "markdown"] as const).includes(format)) {
    throw new Error("--format must be json or markdown.");
  }
  return { mode, format, outputDir };
}

async function main() {
  try {
    const options = parseArguments();
    const report = await runEvalSuite({ mode: options.mode });
    const json = renderEvalJson(report);
    const markdown = renderEvalMarkdown(report);

    if (options.outputDir) {
      const directory = resolve(options.outputDir);
      await mkdir(directory, { recursive: true });
      await Promise.all([
        writeFile(resolve(directory, "caseflow-ai-eval.json"), `${json}\n`, "utf8"),
        writeFile(resolve(directory, "caseflow-ai-eval.md"), markdown, "utf8"),
      ]);
    }

    process.stdout.write(options.format === "json" ? `${json}\n` : markdown);
    process.exitCode = report.passed ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown evaluation error.";
    process.stderr.write(`CaseFlow AI evaluation could not run: ${message}\n`);
    process.exitCode = 2;
  }
}

void main();
