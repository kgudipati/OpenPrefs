import type { PreferencesManifest } from "../manifest/manifest";
import type { PreferenceChange } from "../proposal/types";
import type { ProposalRejection } from "../validation/validateProposal";
import type { OpenPrefsPolicy, PolicyDecision } from "./types";

function freezeChanges(changes: readonly PreferenceChange[]): readonly PreferenceChange[] {
  return Object.freeze([...changes]);
}

/**
 * Decides whether a validated request is refused, needs confirmation, or may be applied.
 *
 * Preference-level sensitivity and explicit confirmation are mandatory floors: global policy can
 * add confirmation but can never suppress either requirement. The function performs no I/O and
 * does not mutate the manifest, policy, changes, or rejections it receives.
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

  if (changes.length > policy.maxChangesPerRequest) {
    return Object.freeze({
      outcome: "rejected",
      reason: "too_many_changes",
      changes: decisionChanges,
      count: changes.length,
      limit: policy.maxChangesPerRequest,
    });
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
    const metadata = manifest.get(change.id)?.openPrefs;
    const globallyRequired =
      policy.confirmation === "always" ||
      (policy.confirmation === "sensitive" && metadata?.sensitive === true);
    const preferenceRequired =
      metadata?.confirmation === "required" || metadata?.sensitive === true;

    if (globallyRequired || preferenceRequired) {
      requiredBy.push(change.id);
    }
  }

  if (requiredBy.length > 0) {
    return Object.freeze({
      outcome: "confirmation_required",
      changes: decisionChanges,
      requiredBy: Object.freeze(requiredBy),
    });
  }

  return Object.freeze({ outcome: "apply", changes: decisionChanges });
}
