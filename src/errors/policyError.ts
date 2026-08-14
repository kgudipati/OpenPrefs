/** Identifies the policy configuration rule that failed. */
export type PolicyErrorCode = "POLICY_CONFIRMATION_INVALID" | "POLICY_MAX_CHANGES_INVALID";

/**
 * Reports a malformed policy configuration.
 *
 * A policy error includes a stable {@link PolicyErrorCode} so developer tooling can distinguish
 * configuration failures without parsing its actionable message.
 */
export class PolicyError extends Error {
  /** A stable identifier for the violated policy configuration rule. */
  readonly code: PolicyErrorCode;

  /** Identifies this error as an OpenPrefs policy configuration error. */
  override readonly name = "PolicyError";

  /**
   * Creates a policy configuration error.
   *
   * @param code - The stable code for the violated configuration rule.
   * @param message - An actionable explanation of the violation.
   */
  constructor(code: PolicyErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
