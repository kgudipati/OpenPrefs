/**
 * Represents one preference mutation that has passed deterministic proposal validation.
 *
 * Validated changes contain only a manifest-exposed id and an exact primitive value. Runtime
 * instances returned by proposal validation are frozen.
 */
export interface PreferenceChange {
  /** The stable id of the manifest-exposed preference. */
  readonly id: string;

  /** The validated value, preserved without coercion. */
  readonly value: boolean | string | number;
}

/**
 * Describes the resolver's untrusted proposal envelope.
 *
 * Resolvers may attach envelope fields such as `status`; proposal validation ignores those fields
 * and validates only the `changes` data property. The fields of each proposed change remain
 * unknown until they cross the validation boundary.
 */
export interface SettingsProposal {
  /** Additional resolver-owned envelope fields that proposal validation ignores. */
  readonly [key: string]: unknown;

  /** The untrusted preference changes selected by a resolver. */
  readonly changes: readonly {
    readonly id: unknown;
    readonly value: unknown;
  }[];
}
