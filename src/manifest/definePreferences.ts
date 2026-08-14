import { createPreferencesManifest, type PreferencesManifest } from "./manifest";
import type { PreferenceDefinitions } from "./types";

/**
 * Defines the semantic preferences exposed by a host application.
 *
 * The const type parameter preserves literal ids and enum members without requiring callers to
 * write `as const`.
 *
 * @param definitions - A record of stable preference ids to supported definitions.
 * @returns A normalized, deeply frozen manifest.
 * @throws {ManifestError} When a definition violates the manifest contract.
 */
export function definePreferences<const Definitions extends PreferenceDefinitions>(
  definitions: Definitions,
): PreferencesManifest<Definitions> {
  return createPreferencesManifest(definitions);
}
