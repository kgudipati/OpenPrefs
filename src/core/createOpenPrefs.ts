import type { PreferencesAdapter } from "../adapter/types";
import { isRecord } from "../internal/guards";
import { isPreferencesManifest, type PreferencesManifest } from "../manifest/manifest";
import { resolvePolicy } from "../policy/resolvePolicy";
import type { OpenPrefsPolicy } from "../policy/types";
import type { PreferenceChange, SettingsProposal } from "../proposal/types";
import type { PreferencesResolver } from "../resolver/types";
import { runProposal, runRequest } from "./lifecycle";
import type { OpenPrefsResult } from "./results";

/** Configures the trusted host boundaries used by one OpenPrefs instance. */
export interface CreateOpenPrefsOptions<
  Manifest extends PreferencesManifest = PreferencesManifest,
> {
  /** The normalized whitelist of preferences OpenPrefs may propose. */
  readonly preferences: Manifest;

  /** The host application's existing preference read and mutation operations. */
  readonly adapter: PreferencesAdapter<NoInfer<Manifest>> | PreferencesAdapter;

  /** The application-supplied natural-language resolver implementation. */
  readonly resolver: PreferencesResolver<NoInfer<Manifest>> | PreferencesResolver;

  /** Optional confirmation and request-limit policy overrides. */
  readonly policy?: Partial<OpenPrefsPolicy>;
}

/** Provides the complete headless OpenPrefs request lifecycle. */
export interface OpenPrefs {
  /**
   * Resolves natural-language intent and runs it through validation, policy, and execution.
   *
   * @param text - The user's natural-language preference request.
   * @returns A typed lifecycle result; the returned promise never rejects.
   */
  request(text: string): Promise<OpenPrefsResult>;

  /**
   * Revalidates and authorizes a previously returned proposal before execution.
   *
   * Because confirmation is stateless, calling this method asserts that the user approved this
   * exact proposal. OpenPrefs cannot verify that a confirmation UI was shown. Wiring `confirm()`
   * to anything other than explicit user approval disables every confirmation policy.
   *
   * @param proposal - Untrusted proposal data returned to the host for confirmation.
   * @returns A typed lifecycle result; the returned promise never rejects.
   */
  confirm(proposal: SettingsProposal): Promise<OpenPrefsResult>;

  /**
   * Submits programmatic changes through validation and policy without invoking the resolver.
   *
   * @param changes - Untrusted preference changes selected by the host.
   * @returns A typed lifecycle result; the returned promise never rejects.
   */
  apply(changes: readonly PreferenceChange[]): Promise<OpenPrefsResult>;
}

interface ValidatedConfiguration<Manifest extends PreferencesManifest> {
  readonly preferences: Manifest;
  readonly adapter: PreferencesAdapter<Manifest> | PreferencesAdapter;
  readonly resolver: PreferencesResolver<Manifest> | PreferencesResolver;
  readonly policy: OpenPrefsPolicy;
}

function validateConfiguration<Manifest extends PreferencesManifest>(
  options: CreateOpenPrefsOptions<Manifest>,
): ValidatedConfiguration<Manifest> {
  if (!isRecord(options)) {
    throw new TypeError("OpenPrefs configuration must be an object.");
  }

  const { preferences, adapter, resolver, policy } = options;
  if (!isPreferencesManifest(preferences)) {
    throw new TypeError('OpenPrefs configuration requires a manifest in "preferences".');
  }
  if (!isRecord(adapter) || typeof adapter.apply !== "function") {
    throw new TypeError('OpenPrefs configuration requires an adapter with an "apply" method.');
  }
  if (adapter.read !== undefined && typeof adapter.read !== "function") {
    throw new TypeError('OpenPrefs adapter "read" must be a function when provided.');
  }
  if (!isRecord(resolver) || typeof resolver.resolve !== "function") {
    throw new TypeError('OpenPrefs configuration requires a resolver with a "resolve" method.');
  }

  return { preferences, adapter, resolver, policy: resolvePolicy(policy) };
}

/**
 * Creates an OpenPrefs lifecycle over a host manifest, resolver, adapter, and policy.
 *
 * Configuration errors throw immediately because they are programmer errors. Every runtime
 * request, confirmation, and direct apply outcome is instead returned as typed data.
 *
 * @param options - Trusted host configuration defining preferences and integration boundaries.
 * @returns A frozen, stateless lifecycle API whose asynchronous methods never reject.
 * @throws {TypeError} When the manifest, adapter, resolver, or configuration shape is invalid.
 */
export function createOpenPrefs<const Manifest extends PreferencesManifest>(
  options: CreateOpenPrefsOptions<Manifest>,
): OpenPrefs {
  const configuration = validateConfiguration(options);

  return Object.freeze({
    request(text: string): Promise<OpenPrefsResult> {
      return runRequest({ ...configuration, text });
    },

    confirm(proposal: SettingsProposal): Promise<OpenPrefsResult> {
      return runProposal({ ...configuration, proposal, confirmed: true });
    },

    apply(changes: readonly PreferenceChange[]): Promise<OpenPrefsResult> {
      return runProposal({
        ...configuration,
        proposal: { changes },
        confirmed: false,
      });
    },
  });
}
