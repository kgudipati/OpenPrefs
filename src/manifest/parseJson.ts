import { ManifestError } from "../errors/manifestError";
import { createPreferencesManifest, type PreferencesManifest } from "./manifest";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the portable version 1 JSON representation of a preferences manifest.
 *
 * This function accepts an already parsed JSON value, then applies the same normalization and
 * validation rules as {@link definePreferences}.
 *
 * @param input - The unknown value produced by a JSON parser or equivalent source.
 * @returns A normalized, deeply frozen preferences manifest.
 * @throws {ManifestError} When the document shape, version, or definitions are invalid.
 */
export function parsePreferencesJson(input: unknown): PreferencesManifest {
  if (!isRecord(input)) {
    throw new ManifestError(
      "JSON_DOCUMENT_INVALID",
      'Portable preferences JSON must be an object with "version" and "preferences".',
    );
  }

  if (input.version !== 1) {
    throw new ManifestError(
      "VERSION_UNSUPPORTED",
      `Portable preferences JSON requires version 1; received ${String(input.version)}.`,
    );
  }
  if (!isRecord(input.preferences)) {
    throw new ManifestError(
      "PREFERENCES_INVALID",
      'Portable preferences JSON requires "preferences" to be a record of definitions.',
    );
  }

  return createPreferencesManifest(input.preferences);
}
