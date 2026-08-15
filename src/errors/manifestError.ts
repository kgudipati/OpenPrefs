/**
 * Identifies the manifest validation rule that failed.
 *
 * Codes are stable, machine-readable values suitable for tests and developer tooling.
 */
export type ManifestErrorCode =
  | "MANIFEST_INVALID"
  | "MANIFEST_EMPTY"
  | "PREFERENCE_ID_INVALID"
  | "DEFINITION_INVALID"
  | "DEFINITION_KEY_UNKNOWN"
  | "TYPE_UNSUPPORTED"
  | "LABEL_INVALID"
  | "DESCRIPTION_INVALID"
  | "ENUM_INVALID"
  | "ENUM_DUPLICATE"
  | "DEFAULT_TYPE_INVALID"
  | "DEFAULT_ENUM_INVALID"
  | "DEFAULT_RANGE_INVALID"
  | "MINIMUM_INVALID"
  | "MAXIMUM_INVALID"
  | "RANGE_INVALID"
  | "OPEN_PREFS_INVALID"
  | "OPEN_PREFS_KEY_UNKNOWN"
  | "SENSITIVE_INVALID"
  | "CONFIRMATION_INVALID"
  | "JSON_DOCUMENT_INVALID"
  | "VERSION_UNSUPPORTED"
  | "PREFERENCES_INVALID";

/**
 * Reports a malformed preference manifest.
 *
 * A manifest error includes a stable validation {@link ManifestErrorCode} and, when the rule
 * applies to one definition, the offending preference id.
 */
export class ManifestError extends Error {
  /** A stable identifier for the violated validation rule. */
  readonly code: ManifestErrorCode;

  /** The offending preference id, when the error belongs to a definition. */
  readonly id?: string;

  /** Identifies this error as an OpenPrefs manifest validation error. */
  override readonly name = "ManifestError";

  /**
   * Creates a manifest validation error.
   *
   * @param code - The stable code for the violated rule.
   * @param message - An actionable explanation of the violation.
   * @param id - The offending preference id, when applicable.
   */
  constructor(code: ManifestErrorCode, message: string, id?: string) {
    super(message);
    this.code = code;
    if (id !== undefined) {
      this.id = id;
    }
  }
}
