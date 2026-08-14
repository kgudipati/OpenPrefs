import type { PreferencesManifest } from "../manifest/manifest";
import type { PreferenceChangeFor, PreferencesState } from "../manifest/types";

/** Supplies natural-language intent and trusted preference context to a resolver. */
export interface ResolveInput<Manifest extends PreferencesManifest = PreferencesManifest> {
  /** The user's unmodified natural-language request. */
  readonly text: string;

  /** The complete whitelist of preferences the resolver may select from. */
  readonly preferences: Manifest;

  /** Current host values when the adapter can provide them safely. */
  readonly current?: Readonly<PreferencesState<Manifest>>;
}

/**
 * Describes every semantic outcome a resolver may return without performing a mutation.
 *
 * Resolved changes remain untrusted until OpenPrefs validates them against the manifest. A
 * resolver must ask for clarification or report unsupported intent rather than invent a setting.
 */
export type ResolveResult<Manifest extends PreferencesManifest = PreferencesManifest> =
  | {
      /** Reports that the resolver selected a candidate preference proposal. */
      readonly status: "resolved";

      /** Untrusted candidate changes that must cross the validation boundary. */
      readonly changes: readonly PreferenceChangeFor<Manifest>[];
    }
  | {
      /** Reports that the resolver needs more information before proposing a change. */
      readonly status: "needs_clarification";

      /** A focused question the host can present to the user. */
      readonly question: string;
    }
  | {
      /** Reports that the user's intent cannot be expressed by the manifest. */
      readonly status: "unsupported";
    };

/**
 * Converts natural-language intent into data-only preference proposals.
 *
 * OpenPrefs provides this contract but no implementation, model runtime, or inference SDK.
 */
export interface PreferencesResolver<Manifest extends PreferencesManifest = PreferencesManifest> {
  /**
   * Resolves user intent against only the preference capabilities supplied by OpenPrefs.
   *
   * @param input - Natural-language text, the manifest whitelist, and optional current values.
   * @returns A proposed change set, a clarification question, or an unsupported outcome.
   */
  readonly resolve: (input: ResolveInput<Manifest>) => Promise<ResolveResult<Manifest>>;
}
