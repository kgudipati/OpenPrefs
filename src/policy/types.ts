import type { PreferenceChange } from "../proposal/types";
import type { ProposalRejection } from "../validation/validateProposal";

/** Defines the complete, resolved policy used to evaluate validated preference changes. */
export interface OpenPrefsPolicy {
  /** Controls the global confirmation requirement before preferences may be applied. */
  readonly confirmation: "always" | "sensitive" | "never";

  /** Caps the number of validated changes that one request may contain. */
  readonly maxChangesPerRequest: number;
}

/** Identifies why policy refused to let a request proceed. */
export type PolicyRejectionReason =
  | "proposal_rejected"
  | "unknown_preference"
  | "too_many_changes"
  | "no_changes";

/**
 * Describes whether validated preference changes may proceed or need user confirmation.
 *
 * Rejected decisions retain the relevant validation or limit details so hosts can explain why
 * the entire request was refused. Every array in a returned decision is frozen.
 */
export type PolicyDecision =
  | {
      /** Allows the host to apply every validated change without further confirmation. */
      readonly outcome: "apply";

      /** The complete set of validated changes allowed by policy. */
      readonly changes: readonly PreferenceChange[];
    }
  | {
      /** Requires the host to obtain confirmation before applying any change. */
      readonly outcome: "confirmation_required";

      /** The complete set of validated changes awaiting confirmation. */
      readonly changes: readonly PreferenceChange[];

      /** Preference ids whose global or preference-level rules triggered confirmation. */
      readonly requiredBy: readonly string[];
    }
  | {
      /** Refuses the entire request because proposal validation rejected at least one entry. */
      readonly outcome: "rejected";

      /** The stable reason for refusing the entire request. */
      readonly reason: "proposal_rejected";

      /** Validated entries withheld to avoid silently applying only a subset of the proposal. */
      readonly changes: readonly PreferenceChange[];

      /** Every proposal rejection that caused policy to refuse the request. */
      readonly rejections: readonly ProposalRejection[];
    }
  | {
      /** Refuses the entire request because its validated change count exceeds the limit. */
      readonly outcome: "rejected";

      /** The stable reason for refusing the entire request. */
      readonly reason: "too_many_changes";

      /** The validated changes withheld because the request exceeded the limit. */
      readonly changes: readonly PreferenceChange[];

      /** The number of validated changes in the request. */
      readonly count: number;

      /** The configured maximum number of changes allowed in one request. */
      readonly limit: number;
    }
  | {
      /** Refuses a request containing a preference that the manifest does not expose. */
      readonly outcome: "rejected";

      /** The stable reason for refusing a change that bypassed manifest validation. */
      readonly reason: "unknown_preference";

      /** The complete change set withheld because at least one preference is unknown. */
      readonly changes: readonly PreferenceChange[];
    }
  | {
      /** Refuses a request that contains no validated changes. */
      readonly outcome: "rejected";

      /** The stable reason for refusing the empty request. */
      readonly reason: "no_changes";

      /** The empty validated change set. */
      readonly changes: readonly PreferenceChange[];
    };
