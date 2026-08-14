import type { ApplyFailure } from "../adapter/types";
import type { PreferenceChange, SettingsProposal } from "../proposal/types";
import type { ProposalRejection } from "../validation/validateProposal";

/** Reports that every submitted preference change was applied. */
export interface AppliedResult {
  /** Discriminates complete execution success. */
  readonly status: "applied";

  /** Every preference change the adapter applied. */
  readonly applied: readonly PreferenceChange[];
}

/**
 * Reports a total or partial execution failure without hiding successful changes.
 *
 * An empty `failed` list means no preference change was attempted. A populated `failed` list means
 * the adapter was invoked, even when its thrown or malformed outcome prevents per-change accuracy.
 */
export interface FailedResult {
  /** Discriminates a failed or partially failed lifecycle outcome. */
  readonly status: "failed";

  /** A boundary-level explanation of the failure. */
  readonly error: string;

  /** Preference changes the adapter reported as successfully applied. */
  readonly applied: readonly PreferenceChange[];

  /** Preference changes the adapter reported as failed, with their host-provided reasons. */
  readonly failed: readonly ApplyFailure[];
}

/** Describes a known preference value transition for a confirmation preview. */
export interface PreferenceChangePreview {
  /** The stable manifest-exposed preference id. */
  readonly id: string;

  /** The current value returned by the optional adapter read operation. */
  readonly before: unknown;

  /** The validated value proposed for the preference. */
  readonly after: PreferenceChange["value"];
}

/** Reports a validated proposal that policy requires the host to confirm before execution. */
export interface ConfirmationRequiredResult {
  /** Discriminates a request awaiting explicit confirmation. */
  readonly status: "confirmation_required";

  /** A data-only proposal the host may pass back to `confirm`. */
  readonly proposal: SettingsProposal;

  /** Preference ids whose policy or metadata triggered confirmation. */
  readonly requiredBy: readonly string[];

  /** Known before-and-after values that can be rendered without another adapter read. */
  readonly preview?: readonly PreferenceChangePreview[];
}

/** Reports that resolution needs more user input before a preference can be selected. */
export interface NeedsClarificationResult {
  /** Discriminates a request that needs more information. */
  readonly status: "needs_clarification";

  /**
   * The resolver-provided question for the user.
   *
   * This string is untrusted model output. Hosts MUST escape it before rendering. OpenPrefs does
   * not sanitize it because presentation and output encoding belong to the host.
   */
  readonly question: string;
}

/** Reports that the manifest cannot express the user's request. */
export interface UnsupportedResult {
  /** Discriminates unsupported natural-language intent. */
  readonly status: "unsupported";
}

/** Reports a proposal refused because one or more entries failed deterministic validation. */
export interface ProposalRejectedResult {
  /** Discriminates a policy refusal. */
  readonly status: "rejected";

  /** Identifies proposal validation as the reason for refusal. */
  readonly reason: "proposal_rejected";

  /** Valid changes withheld because the proposal is applied atomically at the policy boundary. */
  readonly changes: readonly PreferenceChange[];

  /** Every validation diagnostic produced for the untrusted proposal. */
  readonly rejections: readonly ProposalRejection[];
}

/** Reports a proposal refused because it exceeds the configured request limit. */
export interface TooManyChangesRejectedResult {
  /** Discriminates a policy refusal. */
  readonly status: "rejected";

  /** Identifies the configured change limit as the reason for refusal. */
  readonly reason: "too_many_changes";

  /** Validated changes withheld because the proposal exceeds the limit. */
  readonly changes: readonly PreferenceChange[];

  /** The validated number of proposed changes. */
  readonly count: number;

  /** The maximum number of changes permitted by policy. */
  readonly limit: number;
}

/**
 * Reports a proposal refused because a change names an unexposed preference.
 *
 * This result is unreachable through the standard lifecycle because proposal validation rejects
 * unknown ids first. The mapping remains as defense-in-depth for the policy boundary.
 */
export interface UnknownPreferenceRejectedResult {
  /** Discriminates a policy refusal. */
  readonly status: "rejected";

  /** Identifies manifest membership as the reason for refusal. */
  readonly reason: "unknown_preference";

  /** The complete change set withheld at the policy boundary. */
  readonly changes: readonly PreferenceChange[];
}

/** Reports an empty proposal refused because it contains nothing to apply. */
export interface NoChangesRejectedResult {
  /** Discriminates a policy refusal. */
  readonly status: "rejected";

  /** Identifies the empty change set as the reason for refusal. */
  readonly reason: "no_changes";

  /** The empty validated change set. */
  readonly changes: readonly PreferenceChange[];
}

/** Represents every policy refusal and preserves its reason-specific diagnostics. */
export type RejectedResult =
  | ProposalRejectedResult
  | TooManyChangesRejectedResult
  | UnknownPreferenceRejectedResult
  | NoChangesRejectedResult;

/**
 * Represents every expected outcome of an OpenPrefs request, confirmation, or direct apply call.
 *
 * Callers can exhaustively discriminate this union by `status`; expected boundary failures never
 * require exception handling.
 */
export type OpenPrefsResult =
  | AppliedResult
  | ConfirmationRequiredResult
  | NeedsClarificationResult
  | UnsupportedResult
  | RejectedResult
  | FailedResult;
