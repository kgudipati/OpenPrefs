import type { PreferencesManifest } from "../manifest/manifest";
import type { OpenPrefsMetadata } from "../manifest/types";
import type { PreferenceChange } from "../proposal/types";
import type { ProposalRejection } from "../validation/validateProposal";
import type { OpenPrefsPolicy, PolicyDecision } from "./types";

function freezeChanges(changes: readonly PreferenceChange[]): readonly PreferenceChange[] {
  return Object.freeze([...changes]);
}

/**
 * Decides whether a validated request is refused, needs confirmation, or may be applied.
 *
 * Global policy gates sensitivity, while an explicit preference-level confirmation requirement is
 * an unconditional floor. The function performs no I/O and does not mutate the manifest, policy,
 * changes, or rejections it receives.
 *
 * @param input - The trusted manifest, resolved policy, validated changes, and validation failures.
 * @returns A frozen decision that covers the entire request without executing any change.
 */
export function evaluatePolicy(input: {
  readonly manifest: PreferencesManifest;
  readonly policy: OpenPrefsPolicy;
  readonly changes: readonly PreferenceChange[];
  readonly rejections: readonly ProposalRejection[];
}): PolicyDecision {
  const { manifest, policy, changes, rejections } = input;
  const decisionChanges = freezeChanges(changes);

  if (rejections.length > 0) {
    return Object.freeze({
      outcome: "rejected",
      reason: "proposal_rejected",
      changes: decisionChanges,
      rejections: Object.freeze([...rejections]),
    });
  }

  const metadataById = new Map<string, OpenPrefsMetadata | undefined>();
  for (const change of changes) {
    const definition = manifest.get(change.id);
    if (definition === undefined) {
      return Object.freeze({
        outcome: "rejected",
        reason: "unknown_preference",
        changes: decisionChanges,
      });
    }
    metadataById.set(change.id, definition.openPrefs);
  }

  if (changes.length === 0) {
    return Object.freeze({
      outcome: "rejected",
      reason: "no_changes",
      changes: decisionChanges,
    });
  }

  const requiredBy: string[] = [];
  for (const change of changes) {
    const metadata = metadataById.get(change.id);
    const requiresConfirmation =
      policy.confirmation === "always" ||
      (policy.confirmation === "sensitive" && metadata?.sensitive === true) ||
      metadata?.confirmation === "required";

    if (requiresConfirmation) {
      requiredBy.push(change.id);
    }
  }

  // Compute confirmation before enforcing the change limit: large proposals may proceed through an
  // already-required review, but the limit must still prevent them from applying silently.
  const exceedsChangeLimit = changes.length > policy.maxChangesPerRequest;
  if (requiredBy.length > 0) {
    return Object.freeze({
      outcome: "confirmation_required",
      changes: decisionChanges,
      requiredBy: Object.freeze(requiredBy),
      exceedsChangeLimit,
    });
  }

  if (exceedsChangeLimit) {
    return Object.freeze({
      outcome: "rejected",
      reason: "too_many_changes",
      changes: decisionChanges,
      count: changes.length,
      limit: policy.maxChangesPerRequest,
    });
  }

  return Object.freeze({ outcome: "apply", changes: decisionChanges });
}
