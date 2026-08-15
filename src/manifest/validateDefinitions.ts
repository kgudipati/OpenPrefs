import { ManifestError } from "../errors/manifestError";
import { isRecord } from "../internal/guards";
import { createPreferencesManifest, type PreferencesManifest } from "./manifest";
import type {
  BooleanPreferenceDefinition,
  NumberPreferenceDefinition,
  OpenPrefsMetadata,
  PreferenceDefinition,
  PreferenceDefinitions,
  StringPreferenceDefinition,
} from "./types";

const preferenceIdPattern = /^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*$/;
const booleanKeys = new Set(["type", "label", "description", "default", "openPrefs"]);
const stringKeys = new Set(["type", "label", "description", "enum", "default", "openPrefs"]);
const numberKeys = new Set([
  "type",
  "label",
  "description",
  "minimum",
  "maximum",
  "default",
  "openPrefs",
]);
const openPrefsKeys = new Set(["sensitive", "confirmation"]);

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(value, key);
}

function throwDefinitionError(
  code: ConstructorParameters<typeof ManifestError>[0],
  id: string,
  rule: string,
): never {
  throw new ManifestError(code, `Preference "${id}" ${rule}.`, id);
}

function assertKnownKeys(
  definition: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  id: string,
): void {
  for (const key of Object.keys(definition)) {
    if (!allowedKeys.has(key)) {
      throwDefinitionError(
        "DEFINITION_KEY_UNKNOWN",
        id,
        `contains unrecognized key "${key}"; remove it or correct the spelling`,
      );
    }
  }
}

function normalizeOpenPrefs(value: unknown, id: string): Readonly<OpenPrefsMetadata> | undefined {
  if (!isRecord(value)) {
    throwDefinitionError("OPEN_PREFS_INVALID", id, 'must define "openPrefs" as an object');
  }

  for (const key of Object.keys(value)) {
    if (!openPrefsKeys.has(key)) {
      throwDefinitionError(
        "OPEN_PREFS_KEY_UNKNOWN",
        id,
        `contains unrecognized openPrefs key "${key}"; remove it or correct the spelling`,
      );
    }
  }

  const sensitive = value.sensitive;
  if (hasOwn(value, "sensitive") && typeof sensitive !== "boolean") {
    throwDefinitionError("SENSITIVE_INVALID", id, 'requires "openPrefs.sensitive" to be a boolean');
  }

  const confirmation = value.confirmation;
  if (hasOwn(value, "confirmation") && confirmation !== "required") {
    throwDefinitionError(
      "CONFIRMATION_INVALID",
      id,
      'requires "openPrefs.confirmation" to be exactly "required"',
    );
  }

  return Object.freeze({
    ...(typeof sensitive === "boolean" ? { sensitive } : {}),
    ...(confirmation === "required" ? { confirmation } : {}),
  });
}

function normalizeBoolean(
  definition: Record<string, unknown>,
  label: string | undefined,
  description: string,
  openPrefs: Readonly<OpenPrefsMetadata> | undefined,
  id: string,
): Readonly<BooleanPreferenceDefinition> {
  assertKnownKeys(definition, booleanKeys, id);
  const defaultValue = definition.default;
  if (hasOwn(definition, "default") && typeof defaultValue !== "boolean") {
    throwDefinitionError("DEFAULT_TYPE_INVALID", id, "requires its default to be a boolean");
  }

  return Object.freeze({
    type: "boolean",
    ...(label === undefined ? {} : { label }),
    description,
    ...(typeof defaultValue === "boolean" ? { default: defaultValue } : {}),
    ...(openPrefs === undefined ? {} : { openPrefs }),
  });
}

function normalizeString(
  definition: Record<string, unknown>,
  label: string | undefined,
  description: string,
  openPrefs: Readonly<OpenPrefsMetadata> | undefined,
  id: string,
): Readonly<StringPreferenceDefinition> {
  assertKnownKeys(definition, stringKeys, id);

  const enumValue = definition.enum;
  let normalizedEnum: readonly string[] | undefined;
  if (hasOwn(definition, "enum")) {
    if (!Array.isArray(enumValue) || enumValue.length === 0 || !enumValue.every(isString)) {
      throwDefinitionError(
        "ENUM_INVALID",
        id,
        "requires its enum to be a non-empty array of strings",
      );
    }
    if (new Set(enumValue).size !== enumValue.length) {
      throwDefinitionError("ENUM_DUPLICATE", id, "requires its enum values to be unique");
    }
    normalizedEnum = Object.freeze([...enumValue]);
  }

  const defaultValue = definition.default;
  if (hasOwn(definition, "default") && typeof defaultValue !== "string") {
    throwDefinitionError("DEFAULT_TYPE_INVALID", id, "requires its default to be a string");
  }
  if (
    typeof defaultValue === "string" &&
    normalizedEnum !== undefined &&
    !normalizedEnum.includes(defaultValue)
  ) {
    throwDefinitionError("DEFAULT_ENUM_INVALID", id, "requires its default to be a member of enum");
  }

  return Object.freeze({
    type: "string",
    ...(label === undefined ? {} : { label }),
    description,
    ...(normalizedEnum === undefined ? {} : { enum: normalizedEnum }),
    ...(typeof defaultValue === "string" ? { default: defaultValue } : {}),
    ...(openPrefs === undefined ? {} : { openPrefs }),
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeNumber(
  definition: Record<string, unknown>,
  label: string | undefined,
  description: string,
  openPrefs: Readonly<OpenPrefsMetadata> | undefined,
  id: string,
): Readonly<NumberPreferenceDefinition> {
  assertKnownKeys(definition, numberKeys, id);

  const minimum = definition.minimum;
  if (hasOwn(definition, "minimum") && !isFiniteNumber(minimum)) {
    throwDefinitionError("MINIMUM_INVALID", id, "requires its minimum to be a finite number");
  }
  const maximum = definition.maximum;
  if (hasOwn(definition, "maximum") && !isFiniteNumber(maximum)) {
    throwDefinitionError("MAXIMUM_INVALID", id, "requires its maximum to be a finite number");
  }
  if (isFiniteNumber(minimum) && isFiniteNumber(maximum) && minimum > maximum) {
    throwDefinitionError(
      "RANGE_INVALID",
      id,
      "requires minimum to be less than or equal to maximum",
    );
  }

  const defaultValue = definition.default;
  if (hasOwn(definition, "default") && !isFiniteNumber(defaultValue)) {
    throwDefinitionError("DEFAULT_TYPE_INVALID", id, "requires its default to be a finite number");
  }
  if (
    isFiniteNumber(defaultValue) &&
    ((isFiniteNumber(minimum) && defaultValue < minimum) ||
      (isFiniteNumber(maximum) && defaultValue > maximum))
  ) {
    throwDefinitionError(
      "DEFAULT_RANGE_INVALID",
      id,
      "requires its default to fall within minimum and maximum",
    );
  }

  return Object.freeze({
    type: "number",
    ...(label === undefined ? {} : { label }),
    description,
    ...(isFiniteNumber(minimum) ? { minimum } : {}),
    ...(isFiniteNumber(maximum) ? { maximum } : {}),
    ...(isFiniteNumber(defaultValue) ? { default: defaultValue } : {}),
    ...(openPrefs === undefined ? {} : { openPrefs }),
  });
}

function normalizeDefinition(value: unknown, id: string): PreferenceDefinition {
  if (!isRecord(value)) {
    throwDefinitionError("DEFINITION_INVALID", id, "must be an object definition");
  }

  const type = value.type;
  if (type !== "boolean" && type !== "string" && type !== "number") {
    throwDefinitionError(
      "TYPE_UNSUPPORTED",
      id,
      'requires type to be exactly "boolean", "string", or "number"',
    );
  }

  const description = value.description;
  if (typeof description !== "string" || description.trim().length === 0) {
    throwDefinitionError("DESCRIPTION_INVALID", id, "requires a present, non-empty description");
  }

  const labelValue = value.label;
  if (
    hasOwn(value, "label") &&
    (typeof labelValue !== "string" || labelValue.trim().length === 0)
  ) {
    throwDefinitionError("LABEL_INVALID", id, "requires its label to be a non-empty string");
  }
  const label = typeof labelValue === "string" ? labelValue : undefined;

  const openPrefs = hasOwn(value, "openPrefs")
    ? normalizeOpenPrefs(value.openPrefs, id)
    : undefined;
  if (type === "boolean") {
    return normalizeBoolean(value, label, description, openPrefs, id);
  }
  if (type === "string") {
    return normalizeString(value, label, description, openPrefs, id);
  }
  return normalizeNumber(value, label, description, openPrefs, id);
}

/**
 * Validates, normalizes, and freezes a record of preference definitions.
 *
 * @param definitions - The programmer-authored definitions to validate.
 * @returns An immutable manifest retaining the input's literal type information.
 * @throws {ManifestError} When the manifest or any definition violates a manifest rule.
 */
export function validateDefinitions<const Definitions extends PreferenceDefinitions>(
  definitions: Definitions,
): PreferencesManifest<Definitions>;
export function validateDefinitions(definitions: Record<string, unknown>): PreferencesManifest;
// The implementation erases Definitions because it also accepts untrusted JSON records; the strict
// overload remains sound because normalization preserves every validated id and value definition.
export function validateDefinitions(definitions: Record<string, unknown>): PreferencesManifest {
  if (!isRecord(definitions)) {
    throw new ManifestError(
      "MANIFEST_INVALID",
      "Preferences manifest must be a record of preference ids to definitions.",
    );
  }

  const entries = Object.entries(definitions);
  if (entries.length === 0) {
    throw new ManifestError(
      "MANIFEST_EMPTY",
      "Preferences manifest must expose at least one preference.",
    );
  }

  const normalizedDefinitions: Record<string, PreferenceDefinition> = {};
  const ids: string[] = [];
  for (const [id, definition] of entries) {
    if (!preferenceIdPattern.test(id)) {
      throw new ManifestError(
        "PREFERENCE_ID_INVALID",
        `Preference "${id}" must use non-empty dot-separated alphanumeric segments that each start with a letter.`,
        id,
      );
    }
    normalizedDefinitions[id] = normalizeDefinition(definition, id);
    ids.push(id);
  }

  return createPreferencesManifest<PreferenceDefinitions>(normalizedDefinitions, ids);
}
