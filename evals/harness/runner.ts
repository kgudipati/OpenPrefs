import {
  createOpenPrefs,
  type OpenPrefsResult,
  type PreferenceChange,
  type PreferencesAdapter,
} from "../../src/index.js";
import type {
  EvalActual,
  EvalCase,
  EvalCaseResult,
  EvalClass,
  EvalClassScore,
  EvalReport,
  EvalState,
  EvalValue,
  ResolverObservation,
  ResolverTokenUsage,
  RunEvalSuiteOptions,
} from "./types.js";

const classOrder: readonly EvalClass[] = [
  "direct",
  "synonym",
  "multiSetting",
  "relative",
  "goalOriented",
  "ambiguous",
  "unsupported",
  "adversarial",
  "contradictory",
];

function isEvalValue(value: unknown): value is EvalValue {
  return typeof value === "boolean" || typeof value === "string" || typeof value === "number";
}

function proposalChanges(result: OpenPrefsResult): readonly PreferenceChange[] {
  if (result.status !== "confirmation_required") {
    return [];
  }
  const changes: PreferenceChange[] = [];
  for (const change of result.proposal.changes) {
    if (typeof change.id === "string" && isEvalValue(change.value)) {
      changes.push({ id: change.id, value: change.value });
    }
  }
  return changes;
}

function lifecycleChanges(result: OpenPrefsResult): readonly PreferenceChange[] {
  switch (result.status) {
    case "applied":
      return result.applied;
    case "confirmation_required":
      return proposalChanges(result);
    case "rejected":
      return result.changes;
    case "failed":
      return result.applied;
    case "needs_clarification":
    case "unsupported":
      return [];
    default: {
      const unhandledResult: never = result;
      return unhandledResult;
    }
  }
}

function changeKey(change: PreferenceChange): string {
  return JSON.stringify([change.id, change.value]);
}

/**
 * Compares preference changes as an exact mathematical set, ignoring order but rejecting extras,
 * omissions, and duplicate entries.
 *
 * @param expected - Literal expected change set.
 * @param actual - Lifecycle-observed change set.
 * @returns `true` only when both contain the same unique id/value pairs.
 */
export function exactChangeSet(
  expected: readonly PreferenceChange[],
  actual: readonly PreferenceChange[],
): boolean {
  const expectedKeys = expected.map(changeKey);
  const actualKeys = actual.map(changeKey);
  const expectedIds = new Set(expected.map((change) => change.id));
  const actualIds = new Set(actual.map((change) => change.id));
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);
  if (
    expectedIds.size !== expected.length ||
    actualIds.size !== actual.length ||
    expectedSet.size !== expectedKeys.length ||
    actualSet.size !== actualKeys.length ||
    expectedSet.size !== actualSet.size
  ) {
    return false;
  }
  return [...expectedSet].every((key) => actualSet.has(key));
}

function scoreCase(evalCase: EvalCase, actual: EvalActual): boolean {
  if (evalCase.expected.status !== actual.status) {
    return false;
  }
  if ("changes" in evalCase.expected) {
    const expectedChanges = evalCase.expected.changes;
    if (!exactChangeSet(expectedChanges, actual.changes)) {
      return false;
    }
    if (actual.status === "applied") {
      return exactChangeSet(expectedChanges, actual.appliedChanges);
    }
    return actual.appliedChanges.length === 0;
  }
  return actual.appliedChanges.length === 0;
}

function createState(
  startingState: EvalState,
  overrides: EvalCase["startingState"],
): Record<string, EvalValue> {
  const state: Record<string, EvalValue> = { ...startingState };
  if (overrides !== undefined) {
    for (const [id, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        state[id] = value;
      }
    }
  }
  return state;
}

function createAdapter(
  state: Record<string, EvalValue>,
  appliedChanges: PreferenceChange[],
): PreferencesAdapter {
  return {
    read(ids: readonly string[]) {
      const current: Record<string, EvalValue> = {};
      for (const id of ids) {
        const value = state[id];
        if (value !== undefined) {
          current[id] = value;
        }
      }
      return current;
    },
    apply(changes: readonly PreferenceChange[]) {
      for (const change of changes) {
        state[change.id] = change.value;
        appliedChanges.push({ id: change.id, value: change.value });
      }
      return { ok: true };
    },
  };
}

function aggregateClasses(results: readonly EvalCaseResult[]): readonly EvalClassScore[] {
  return classOrder.map((evalClass) => {
    const classResults = results.filter((result) => result.case.class === evalClass);
    return {
      class: evalClass,
      passed: classResults.filter((result) => result.passed).length,
      total: classResults.length,
    };
  });
}

function sumUsage(observations: readonly ResolverObservation[]): ResolverTokenUsage | undefined {
  const usages = observations.flatMap((observation) =>
    observation.usage === undefined ? [] : [observation.usage],
  );
  if (usages.length === 0) {
    return undefined;
  }
  return usages.reduce<ResolverTokenUsage>(
    (total, usage) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      cachedInputTokens: total.cachedInputTokens + usage.cachedInputTokens,
      cacheWriteInputTokens: total.cacheWriteInputTokens + usage.cacheWriteInputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
    }),
    { inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0 },
  );
}

function sumCost(observations: readonly ResolverObservation[]): number | undefined {
  if (
    observations.length === 0 ||
    observations.some((observation) => observation.costUsd === undefined)
  ) {
    return undefined;
  }
  return observations.reduce((total, observation) => total + (observation.costUsd ?? 0), 0);
}

/**
 * Validates suite-level invariants independently of resolver quality.
 *
 * @param cases - Case list to inspect.
 * @param minimumPerClass - Required count for every specification class.
 * @returns Human-readable invariant violations; an empty list means the suite is valid.
 */
export function validateCaseSuite(
  cases: readonly EvalCase[],
  minimumPerClass = 5,
): readonly string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  for (const evalCase of cases) {
    if (seenIds.has(evalCase.id)) {
      errors.push(`Duplicate case id: ${evalCase.id}`);
    }
    seenIds.add(evalCase.id);
  }
  for (const evalClass of classOrder) {
    const count = cases.filter((evalCase) => evalCase.class === evalClass).length;
    if (count < minimumPerClass) {
      errors.push(`${evalClass} has ${count} cases; expected at least ${minimumPerClass}.`);
    }
  }
  return errors;
}

/**
 * Runs every case through an isolated `openPrefs.request()` lifecycle and scores exact outcomes.
 *
 * @param options - Resolver, manifest, host state, cases, policy, and optional telemetry hook.
 * @returns Per-case evidence, per-class aggregates, totals, and optional usage/cost data.
 */
export async function runEvalSuite(options: RunEvalSuiteOptions): Promise<EvalReport> {
  const results: EvalCaseResult[] = [];
  const observations: ResolverObservation[] = [];
  const runAt = new Date().toISOString();

  for (const evalCase of options.cases) {
    const state = createState(options.startingState, evalCase.startingState);
    const appliedChanges: PreferenceChange[] = [];
    const adapter = createAdapter(state, appliedChanges);
    const openPrefs = createOpenPrefs({
      preferences: options.manifest,
      resolver: options.resolver,
      adapter,
      ...(options.policy === undefined ? {} : { policy: options.policy }),
    });
    const startedAt = Date.now();
    const result = await openPrefs.request(evalCase.input);
    const durationMs = Date.now() - startedAt;
    const observation = options.takeObservation?.();
    if (observation !== undefined) {
      observations.push(observation);
    }
    const actual: EvalActual = {
      status: result.status,
      changes: lifecycleChanges(result),
      appliedChanges: [...appliedChanges],
      result,
    };
    results.push({
      case: evalCase,
      passed: scoreCase(evalCase, actual),
      actual,
      ...(observation === undefined ? {} : { observation }),
      durationMs,
    });
  }

  const passed = results.filter((result) => result.passed).length;
  const usage = sumUsage(observations);
  const totalCostUsd = sumCost(observations);
  return {
    resolver: options.resolverName,
    runAt,
    cases: results,
    classes: aggregateClasses(results),
    passed,
    total: results.length,
    ...(usage === undefined ? {} : { usage }),
    ...(totalCostUsd === undefined ? {} : { totalCostUsd }),
    ...(options.threshold === undefined
      ? {}
      : { threshold: options.threshold, meetsThreshold: passed >= options.threshold }),
  };
}
