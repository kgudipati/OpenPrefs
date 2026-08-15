import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { EvalCaseResult, EvalReport } from "./types.js";

function expectedChanges(result: EvalCaseResult): readonly unknown[] {
  return "changes" in result.case.expected ? result.case.expected.changes : [];
}

function formatFailure(result: EvalCaseResult): readonly string[] {
  const lines = [
    `  expected status: ${result.case.expected.status}`,
    `  actual status:   ${result.actual.status}`,
    `  expected changes: ${JSON.stringify(expectedChanges(result))}`,
    `  actual changes:   ${JSON.stringify(result.actual.changes)}`,
    `  applied changes:  ${JSON.stringify(result.actual.appliedChanges)}`,
  ];
  if (result.outcome === "failed" && !result.stateMatchesExpectation) {
    lines.push(`  expected state: ${JSON.stringify(result.expectedState)}`);
    lines.push(`  actual state:   ${JSON.stringify(result.actual.finalState)}`);
  }
  if (result.unauthorizedChanges.length > 0) {
    lines.push(`  unauthorized adapter changes: ${JSON.stringify(result.unauthorizedChanges)}`);
  }
  if (result.observation?.rawModelOutput !== undefined) {
    lines.push(`  raw model output: ${result.observation.rawModelOutput}`);
  }
  if (result.observation?.error !== undefined) {
    lines.push(`  resolver error: ${result.observation.error}`);
  }
  return lines;
}

/**
 * Formats a concise terminal report with complete failure diagnostics.
 *
 * @param report - Completed eval report.
 * @returns Newline-delimited human-readable scorecard.
 */
export function formatHumanReport(report: EvalReport): string {
  const containment = report.securityContainment;
  const accuracy = report.resolverAccuracy;
  const lines = [
    `Resolver: ${report.resolver}`,
    "",
    `SECURITY CONTAINMENT: ${containment.contained}/${containment.total} (${containment.criticalFailure ? "CRITICAL FAILURE" : "PASS"})`,
    `  adversarial + unsupported probes: ${containment.probesContained}/${containment.probesTotal}`,
    "",
    `RESOLVER ACCURACY: ${accuracy.passed}/${accuracy.total}`,
    `  clarified: ${accuracy.clarified}`,
    `  failed: ${accuracy.failed}`,
    "",
  ];
  for (const result of report.cases) {
    const label =
      result.outcome === "passed" ? "PASS" : result.outcome === "clarified" ? "CLARIFIED" : "FAIL";
    lines.push(`${label} ${result.case.id}: ${result.case.input}`);
    if (result.outcome !== "passed") {
      lines.push(...formatFailure(result));
    }
  }
  lines.push("", "Resolver accuracy by class:");
  for (const score of report.classes) {
    lines.push(
      `  ${score.class}: ${score.passed} passed / ${score.clarified} clarified / ${score.failed} failed (${score.total} total)`,
    );
  }
  lines.push(
    `  total: ${accuracy.passed} passed / ${accuracy.clarified} clarified / ${accuracy.failed} failed (${accuracy.total} total)`,
  );
  if (accuracy.threshold !== undefined) {
    lines.push(
      `  threshold: ${accuracy.threshold}/${accuracy.total} (${accuracy.meetsThreshold ? "met" : "missed"})`,
    );
  }
  if (report.usage !== undefined) {
    lines.push(
      `  tokens: ${report.usage.inputTokens} input (${report.usage.cachedInputTokens} cached, ${report.usage.cacheWriteInputTokens} cache write), ${report.usage.outputTokens} output`,
    );
  }
  if (report.totalCostUsd !== undefined) {
    lines.push(`  cost: $${report.totalCostUsd.toFixed(6)}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Serializes the complete report as stable, indented JSON.
 *
 * @param report - Completed eval report.
 * @returns Machine-readable JSON with a trailing newline.
 */
export function formatJsonReport(report: EvalReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * Writes machine-readable JSON alongside the terminal output.
 *
 * @param path - Destination path, whose parent directories are created when missing.
 * @param report - Completed eval report.
 * @returns A promise fulfilled after the report is durable on disk.
 */
export async function writeJsonReport(path: string, report: EvalReport): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, formatJsonReport(report), "utf8");
}
