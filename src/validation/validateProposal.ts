import { isRecord, readOwnDataProperty } from "../internal/guards";
import type { PreferencesManifest } from "../manifest/manifest";
import type { PreferenceDefinition } from "../manifest/types";
import type { PreferenceChange } from "../proposal/types";

/** Identifies the proposal validation rule that an untrusted value violated. */
export type ProposalRejectionCode =
  | "PROPOSAL_MALFORMED"
  | "CHANGE_MALFORMED"
  | "ID_INVALID"
  | "ID_UNKNOWN"
  | "VALUE_TYPE_MISMATCH"
  | "VALUE_ENUM_VIOLATION"
  | "VALUE_RANGE_VIOLATION"
  | "VALUE_NOT_FINITE"
  | "CHANGE_DUPLICATE";

/** Reports one deterministic rejection from an untrusted resolver proposal. */
export interface ProposalRejection {
  /** A stable, machine-readable identifier for the violated validation rule. */
  readonly code: ProposalRejectionCode;

  /** The offending preference id, when the change supplied an identifiable string id. */
  readonly id?: string;

  /** An actionable explanation naming the validation rule that failed. */
  readonly message: string;
}

/**
 * Separates validated preference changes from every rejected proposal entry.
 *
 * Validation does not decide whether a partially valid result may proceed; that belongs to policy.
 */
export interface ProposalValidationResult {
  /** Frozen changes that passed every structural, manifest, type, and value rule. */
  readonly changes: readonly PreferenceChange[];

  /** Frozen descriptions of all rejected proposal entries. */
  readonly rejections: readonly ProposalRejection[];
}

type InspectedChange =
  | { readonly id?: string; readonly rejection: ProposalRejection }
  | { readonly id: string; readonly value: unknown };

type ValueValidationResult =
  | { readonly value: PreferenceChange["value"] }
  | { readonly rejection: ProposalRejection };

const changeKeys = new Set<PropertyKey>(["id", "value"]);

function hasExactKeys(value: object, expected: ReadonlySet<PropertyKey>): boolean {
  const keys = Reflect.ownKeys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function reject(code: ProposalRejectionCode, message: string, id?: string): ProposalRejection {
  return Object.freeze({
    code,
    message,
    ...(id === undefined ? {} : { id }),
  });
}

function result(
  changes: readonly PreferenceChange[],
  rejections: readonly ProposalRejection[],
): ProposalValidationResult {
  return Object.freeze({
    changes: Object.freeze([...changes]),
    rejections: Object.freeze([...rejections]),
  });
}

function malformedProposal(): ProposalValidationResult {
  return result(
    [],
    [
      reject(
        "PROPOSAL_MALFORMED",
        'Proposal must be an object containing its own data property "changes" as an array.',
      ),
    ],
  );
}

function inspectChange(value: unknown, index: number): InspectedChange {
  if (!isRecord(value)) {
    return {
      rejection: reject(
        "CHANGE_MALFORMED",
        `Proposal change at index ${index} must be an object containing only "id" and "value".`,
      ),
    };
  }

  const idProperty = readOwnDataProperty(value, "id");
  if (!idProperty.found || typeof idProperty.value !== "string") {
    return {
      rejection: reject(
        "ID_INVALID",
        `Proposal change at index ${index} requires its own data property "id" to be a string.`,
      ),
    };
  }

  const id = idProperty.value;
  const valueProperty = readOwnDataProperty(value, "value");
  if (!hasExactKeys(value, changeKeys) || !valueProperty.found) {
    return {
      id,
      rejection: reject(
        "CHANGE_MALFORMED",
        `Proposal change for preference "${id}" must contain only its own data properties "id" and "value".`,
        id,
      ),
    };
  }

  return { id, value: valueProperty.value };
}

function rejectTypeMismatch(
  id: string,
  expectedType: PreferenceDefinition["type"],
): ProposalRejection {
  return reject(
    "VALUE_TYPE_MISMATCH",
    `Preference "${id}" requires a ${expectedType} value; proposal values are never coerced.`,
    id,
  );
}

function validateValue(
  definition: PreferenceDefinition,
  id: string,
  value: unknown,
): ValueValidationResult {
  if (definition.type === "boolean") {
    return typeof value === "boolean"
      ? { value }
      : { rejection: rejectTypeMismatch(id, definition.type) };
  }

  if (definition.type === "number") {
    if (typeof value !== "number") {
      return { rejection: rejectTypeMismatch(id, definition.type) };
    }
    if (!Number.isFinite(value)) {
      return {
        rejection: reject(
          "VALUE_NOT_FINITE",
          `Preference "${id}" requires a finite numeric value.`,
          id,
        ),
      };
    }
    if (
      (definition.minimum !== undefined && value < definition.minimum) ||
      (definition.maximum !== undefined && value > definition.maximum)
    ) {
      return {
        rejection: reject(
          "VALUE_RANGE_VIOLATION",
          `Preference "${id}" requires a value within its inclusive minimum and maximum.`,
          id,
        ),
      };
    }
    return { value };
  }

  if (typeof value !== "string") {
    return { rejection: rejectTypeMismatch(id, definition.type) };
  }
  if (definition.enum !== undefined && !definition.enum.includes(value)) {
    return {
      rejection: reject(
        "VALUE_ENUM_VIOLATION",
        `Preference "${id}" requires an exact member of its declared enum.`,
        id,
      ),
    };
  }

  return { value };
}

function validateProposalSafely(
  manifest: PreferencesManifest,
  input: unknown,
): ProposalValidationResult {
  if (!isRecord(input)) {
    return malformedProposal();
  }

  const changesProperty = readOwnDataProperty(input, "changes");
  if (!changesProperty.found || !Array.isArray(changesProperty.value)) {
    return malformedProposal();
  }

  const proposedChanges = changesProperty.value;
  const inspected: InspectedChange[] = [];
  for (let index = 0; index < proposedChanges.length; index += 1) {
    inspected.push(inspectChange(proposedChanges[index], index));
  }
  const idCounts = new Map<string, number>();
  for (const change of inspected) {
    if ("id" in change && change.id !== undefined) {
      idCounts.set(change.id, (idCounts.get(change.id) ?? 0) + 1);
    }
  }

  const changes: PreferenceChange[] = [];
  const rejections: ProposalRejection[] = [];
  for (const change of inspected) {
    if ("rejection" in change) {
      rejections.push(change.rejection);
      continue;
    }

    const { id, value } = change;
    // Counts include malformed entries with identifiable ids, so only exactly one may proceed.
    if (idCounts.get(id) !== 1) {
      rejections.push(
        reject(
          "CHANGE_DUPLICATE",
          `Preference "${id}" appears more than once; every duplicate occurrence is rejected.`,
          id,
        ),
      );
      continue;
    }

    const definition = manifest.get(id);
    if (definition === undefined) {
      rejections.push(
        reject("ID_UNKNOWN", `Preference "${id}" is not exposed by the manifest.`, id),
      );
      continue;
    }

    const valueValidation = validateValue(definition, id, value);
    if ("rejection" in valueValidation) {
      rejections.push(valueValidation.rejection);
      continue;
    }

    changes.push(Object.freeze({ id, value: valueValidation.value }));
  }

  return result(changes, rejections);
}

/**
 * Converts arbitrary resolver output into validated changes and typed rejections.
 *
 * The function performs exact structural checks, manifest whitelisting, primitive type checks,
 * finite-number checks, enum membership, inclusive range checks, and duplicate detection without
 * coercing values or mutating its inputs.
 *
 * @param manifest - The trusted, normalized preference manifest defining the validation rules.
 * @param input - Arbitrary and potentially hostile resolver output.
 * @returns Frozen validated changes alongside every frozen rejection; malformed input never throws.
 */
export function validateProposal(
  manifest: PreferencesManifest,
  input: unknown,
): ProposalValidationResult {
  try {
    return validateProposalSafely(manifest, input);
  } catch {
    // This is last-resort defense-in-depth for hostile exotic objects, not a substitute for
    // correct validation. Any exception reaching this point indicates a defect in the validator.
    return malformedProposal();
  }
}
