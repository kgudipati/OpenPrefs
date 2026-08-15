import { resolve } from "node:path";
import { keywordResolver } from "../examples/typescript/src/keywordResolver.js";
import { evalCases } from "./cases/index.js";
import {
  type EvalReport,
  formatHumanReport,
  runEvalSuite,
  validateCaseSuite,
  writeJsonReport,
} from "./harness/index.js";
import { loadLocalEnv } from "./loadEnv.js";
import { evalManifest, startingState } from "./manifest.js";
import { createHostedEvalResolver } from "./resolvers/hosted.js";
import { deterministicThreshold } from "./threshold.js";

type ResolverSelection = "keyword" | "hosted";

function selectionFromArgs(): ResolverSelection {
  const selected = process.argv[2] ?? "keyword";
  if (selected === "keyword" || selected === "hosted") {
    return selected;
  }
  throw new Error(`Unknown eval resolver "${selected}". Expected keyword or hosted.`);
}

function outputPath(selection: ResolverSelection, model?: string): string {
  const configured = process.env.OPENPREFS_EVAL_OUTPUT?.trim();
  if (configured !== undefined && configured.length > 0) {
    return resolve(configured);
  }
  const name = selection === "keyword" ? "keyword" : (model ?? "hosted");
  return resolve(".evals-results", `${name}.json`);
}

async function main(): Promise<void> {
  const suiteErrors = validateCaseSuite(evalCases);
  if (suiteErrors.length > 0) {
    throw new Error(`Invalid eval suite:\n${suiteErrors.join("\n")}`);
  }

  const selection = selectionFromArgs();
  let model: string | undefined;
  let report: EvalReport;
  if (selection === "keyword") {
    report = await runEvalSuite({
      resolver: keywordResolver,
      resolverName: "deterministic keyword resolver",
      manifest: evalManifest,
      startingState,
      cases: evalCases,
      policy: { confirmation: "sensitive", maxChangesPerRequest: 30 },
      threshold: deterministicThreshold,
    });
  } else {
    await loadLocalEnv(resolve("examples/typescript/.env"));
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey === undefined || apiKey.length === 0) {
      throw new Error("OPENAI_API_KEY is required for hosted evals.");
    }
    model = process.env.OPENPREFS_MODEL?.trim() || "gpt-5.6-luna";
    const hosted = createHostedEvalResolver({ apiKey, model });
    report = await runEvalSuite({
      resolver: hosted.resolver,
      resolverName: `OpenAI Responses API (${model})`,
      manifest: evalManifest,
      startingState,
      cases: evalCases,
      policy: { confirmation: "sensitive", maxChangesPerRequest: 30 },
      takeObservation: hosted.takeObservation,
    });
  }

  const jsonPath = outputPath(selection, model);
  process.stdout.write(formatHumanReport(report));
  await writeJsonReport(jsonPath, report);
  process.stdout.write(`JSON report: ${jsonPath}\n`);

  if (selection === "keyword" && report.meetsThreshold === false) {
    process.exitCode = 1;
  }
  if (
    selection === "hosted" &&
    report.cases.some((result) => result.observation?.error !== undefined)
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Eval runner failed.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
