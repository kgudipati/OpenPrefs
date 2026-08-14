import type { PreferenceChange } from "../proposal/types";

/** Describes one preference change that an adapter could not apply. */
export interface ApplyFailure {
  /** The stable preference id whose change failed. */
  readonly id: string;

  /**
   * A host-provided explanation of why the change failed.
   *
   * This string is untrusted adapter output. Hosts MUST escape it before rendering. OpenPrefs does
   * not sanitize it because presentation and output encoding belong to the host.
   */
  readonly reason: string;
}

/**
 * Reports the per-change failures produced by a preferences adapter.
 *
 * An absent or empty `failed` list means every submitted change applied. Additional fields are
 * permitted so existing host APIs can return their native success metadata.
 */
export interface ApplyResult {
  /** Additional adapter-owned outcome metadata ignored by OpenPrefs. */
  readonly [key: string]: unknown;

  /** The submitted changes that the host could not apply. */
  readonly failed?: readonly ApplyFailure[];
}

/**
 * Connects OpenPrefs to a host application's existing preference operations.
 *
 * Applying changes is required. Reading current values is optional progressive enhancement used
 * for resolver context and confirmation previews; the adapter owns neither policy nor validation.
 */
export interface PreferencesAdapter {
  /**
   * Reads the current values known for requested preference ids.
   *
   * @param ids - Manifest-exposed preference ids whose current values may help resolution.
   * @returns A record containing any current values the host can provide.
   */
  read?(ids: readonly string[]): Promise<Record<string, unknown>>;

  /**
   * Invokes the host application's existing preference mutation logic.
   *
   * If this method throws after partially applying changes, OpenPrefs reports every submitted
   * change as failed because the exception communicates no per-change outcome. Adapters that can
   * apply changes independently SHOULD catch failures internally and return a partial `failed`
   * list instead of throwing.
   *
   * @param changes - Changes already whitelisted, validated, policy-approved, and confirmed.
   * @returns Per-change failures; an absent or empty failure list reports complete success.
   */
  apply(changes: readonly PreferenceChange[]): Promise<ApplyResult>;
}
