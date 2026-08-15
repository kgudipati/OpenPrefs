import type { PreferencesManifest } from "../manifest/manifest";
import type { PreferenceChangeFor, PreferencesState } from "../manifest/types";

// This erased invariant brand prevents an adapter typed for one manifest from satisfying another
// manifest's boundary while leaving the default loose adapter structurally implementable.
declare const adapterManifest: unique symbol;

type AdapterState<Manifest extends PreferencesManifest> =
  string extends PreferenceChangeFor<Manifest>["id"]
    ? Readonly<Record<string, unknown>>
    : Readonly<PreferencesState<Manifest>>;

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
 * Explicitly acknowledges whether a preferences adapter applied submitted changes.
 *
 * The index signatures deliberately permit a host to return its native result object with an
 * `ok` acknowledgement instead of mapping away host-specific metadata. A failed acknowledgement
 * must name every submitted change the host could not apply.
 *
 * The failure branch MUST remain first and the success branch last. TypeScript reports a widened
 * `ok: boolean` against the last union member, so this order keeps that diagnostic focused on the
 * expected `ok: true` literal instead of incorrectly suggesting that `failed` is missing.
 */
export type ApplyResult =
  | {
      /** Affirms that at least one submitted change failed. */
      readonly ok: false;

      /** The submitted changes that the host could not apply. */
      readonly failed: readonly ApplyFailure[];

      /** Additional host-owned result metadata ignored by OpenPrefs. */
      readonly [key: string]: unknown;
    }
  | {
      /** Affirms that every submitted change was applied. */
      readonly ok: true;

      /** Additional host-owned result metadata ignored by OpenPrefs. */
      readonly [key: string]: unknown;
    };

/**
 * Connects OpenPrefs to a host application's existing preference operations.
 *
 * Applying changes is required. Reading current values is optional progressive enhancement used
 * for resolver context, all-no-op detection, and confirmation previews; the adapter owns neither
 * policy nor validation.
 */
export interface PreferencesAdapter<Manifest extends PreferencesManifest = PreferencesManifest> {
  /** Retains the manifest type invariant without adding a runtime property. */
  readonly [adapterManifest]?: (manifest: Manifest) => Manifest;

  /**
   * Reads the current values known for requested preference ids.
   *
   * OpenPrefs currently supplies every manifest id before resolution. Adapters MAY return any
   * subset, omitting values that are expensive, unavailable, or inappropriate to expose to a
   * resolver. Permanent read-capability metadata is deferred to a future JSON Schema `writeOnly`
   * mechanism; omission currently means only that no usable current value was returned.
   *
   * @param ids - Every manifest-exposed preference id for the current request.
   * @returns A record containing any subset of current values the host can provide.
   */
  readonly read?: (
    ids: readonly string[],
  ) => AdapterState<Manifest> | Promise<AdapterState<Manifest>>;

  /**
   * Invokes the host application's existing preference mutation logic.
   *
   * If this method throws after partially applying changes, OpenPrefs reports every submitted
   * change as failed because the exception communicates no per-change outcome. Adapters that can
   * apply changes independently SHOULD catch failures internally and return a partial `failed`
   * list instead of throwing.
   *
   * @param changes - Changes already whitelisted, validated, policy-approved, and confirmed.
   * @returns An explicit success acknowledgement or a non-empty list of per-change failures.
   */
  readonly apply: (
    changes: readonly PreferenceChangeFor<Manifest>[],
  ) => ApplyResult | Promise<ApplyResult>;
}
