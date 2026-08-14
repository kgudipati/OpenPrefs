import { PolicyError } from "../errors/policyError";
import type { OpenPrefsPolicy } from "./types";

const defaultPolicy: OpenPrefsPolicy = Object.freeze({
  confirmation: "always",
  maxChangesPerRequest: 10,
});

/**
 * Resolves optional developer policy settings to a complete policy.
 *
 * @param policy - The confirmation mode and request limit overrides to validate.
 * @returns A frozen policy containing explicit values for every supported setting.
 * @throws {PolicyError} When a setting is not one of the supported policy values.
 */
export function resolvePolicy(policy?: Partial<OpenPrefsPolicy>): OpenPrefsPolicy {
  const configuredConfirmation: unknown = policy?.confirmation;
  const confirmation =
    configuredConfirmation === undefined ? defaultPolicy.confirmation : configuredConfirmation;
  if (confirmation !== "always" && confirmation !== "sensitive" && confirmation !== "never") {
    throw new PolicyError(
      "POLICY_CONFIRMATION_INVALID",
      'Policy "confirmation" must be exactly "always", "sensitive", or "never".',
    );
  }

  const configuredMaxChanges: unknown = policy?.maxChangesPerRequest;
  const maxChangesPerRequest =
    configuredMaxChanges === undefined ? defaultPolicy.maxChangesPerRequest : configuredMaxChanges;
  if (
    typeof maxChangesPerRequest !== "number" ||
    !Number.isInteger(maxChangesPerRequest) ||
    maxChangesPerRequest <= 0
  ) {
    throw new PolicyError(
      "POLICY_MAX_CHANGES_INVALID",
      'Policy "maxChangesPerRequest" must be a positive integer.',
    );
  }

  return Object.freeze({ confirmation, maxChangesPerRequest });
}
