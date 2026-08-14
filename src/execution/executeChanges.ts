import type { ApplyFailure, PreferencesAdapter } from "../adapter/types";
import type { AppliedResult, FailedResult } from "../core/results";
import { errorMessage, isRecord, readOwnDataProperty } from "../internal/guards";
import type { PreferenceChange } from "../proposal/types";

const malformedResultMessage = "Adapter returned a malformed apply result.";

function freezeChanges(changes: readonly PreferenceChange[]): readonly PreferenceChange[] {
  return Object.freeze([...changes]);
}

function freezeFailures(failures: readonly ApplyFailure[]): readonly ApplyFailure[] {
  return Object.freeze(failures.map(({ id, reason }) => Object.freeze({ id, reason })));
}

function totalFailure(changes: readonly PreferenceChange[], reason: string): FailedResult {
  return Object.freeze({
    status: "failed",
    error: reason,
    applied: Object.freeze([]),
    failed: freezeFailures(changes.map(({ id }) => ({ id, reason }))),
  });
}

function normalizeResult(
  changes: readonly PreferenceChange[],
  result: unknown,
): AppliedResult | FailedResult {
  if (!isRecord(result)) {
    return totalFailure(changes, malformedResultMessage);
  }

  const failedProperty = readOwnDataProperty(result, "failed");
  if (!failedProperty.found) {
    return Object.freeze({ status: "applied", applied: freezeChanges(changes) });
  }
  if (!Array.isArray(failedProperty.value)) {
    return totalFailure(changes, malformedResultMessage);
  }

  const changeIds = new Set(changes.map(({ id }) => id));
  const failedIds = new Set<string>();
  const failures: ApplyFailure[] = [];
  for (const failure of failedProperty.value) {
    if (!isRecord(failure)) {
      return totalFailure(changes, malformedResultMessage);
    }
    const idProperty = readOwnDataProperty(failure, "id");
    const reasonProperty = readOwnDataProperty(failure, "reason");
    if (
      !idProperty.found ||
      typeof idProperty.value !== "string" ||
      !reasonProperty.found ||
      typeof reasonProperty.value !== "string" ||
      !changeIds.has(idProperty.value) ||
      failedIds.has(idProperty.value)
    ) {
      return totalFailure(changes, malformedResultMessage);
    }
    failedIds.add(idProperty.value);
    failures.push({ id: idProperty.value, reason: reasonProperty.value });
  }

  if (failures.length === 0) {
    return Object.freeze({ status: "applied", applied: freezeChanges(changes) });
  }

  return Object.freeze({
    status: "failed",
    error: "The adapter reported one or more failed preference changes.",
    applied: freezeChanges(changes.filter(({ id }) => !failedIds.has(id))),
    failed: freezeFailures(failures),
  });
}

/**
 * Applies validated changes through a host adapter and normalizes its outcome.
 *
 * Adapter exceptions, rejected promises, and malformed reports become typed total failures.
 * Valid per-change failures are reported without rollback, retries, or transaction semantics.
 *
 * @param adapter - The host application's preference mutation boundary.
 * @param changes - Whitelisted and policy-approved changes ready for mutation.
 * @returns A frozen result naming every applied and failed change; the promise never rejects.
 */
export async function executeChanges(
  adapter: PreferencesAdapter,
  changes: readonly PreferenceChange[],
): Promise<AppliedResult | FailedResult> {
  try {
    const result: unknown = await adapter.apply(changes);
    return normalizeResult(changes, result);
  } catch (error) {
    return totalFailure(
      changes,
      errorMessage(error, "Adapter failed while applying preference changes."),
    );
  }
}
