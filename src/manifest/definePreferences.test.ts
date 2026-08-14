import { describe, expect, expectTypeOf, it } from "vitest";
import { ManifestError, type ManifestErrorCode } from "../errors/manifestError";
import { definePreferences } from "./definePreferences";
import type { PreferencesState, PreferenceValue } from "./types";

function callDefinePreferences(input: unknown): unknown {
  return Reflect.apply(definePreferences, undefined, [input]);
}

function expectManifestError(action: () => unknown, code: ManifestErrorCode, id?: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ManifestError);
    if (!(error instanceof ManifestError)) {
      return;
    }
    expect(error.name).toBe("ManifestError");
    expect(error.code).toBe(code);
    expect(error.id).toBe(id);
    if (id !== undefined) {
      expect(error.message).toContain(`"${id}"`);
    }
    return;
  }
  throw new Error(`Expected manifest validation to fail with ${code}.`);
}

describe("definePreferences", () => {
  it("accepts every supported preference definition", () => {
    const manifest = definePreferences({
      "notifications.directMessages": {
        type: "boolean",
        description: "Whether direct messages trigger notifications.",
        default: true,
        openPrefs: { confirmation: "required", sensitive: false },
      },
      displayName: {
        type: "string",
        description: "The public display name.",
        default: "Ada",
      },
      theme: {
        type: "string",
        description: "The visual color theme.",
        enum: ["light", "dark", "system"],
        default: "system",
      },
      textScale: {
        type: "number",
        description: "The interface text scale.",
        minimum: 0.5,
        maximum: 2,
        default: 1,
      },
      zoom: {
        type: "number",
        description: "The canvas zoom level.",
        openPrefs: { sensitive: true },
      },
    });

    expect(manifest.ids()).toEqual([
      "notifications.directMessages",
      "displayName",
      "theme",
      "textScale",
      "zoom",
    ]);
    expect(manifest.has("theme")).toBe(true);
    expect(manifest.has("toString")).toBe(false);
    expect(manifest.get("theme")).toEqual({
      type: "string",
      description: "The visual color theme.",
      enum: ["light", "dark", "system"],
      default: "system",
    });
    expect(manifest.get("missing")).toBeUndefined();
  });

  it("preserves enum literal types without const assertions", () => {
    const manifest = definePreferences({
      theme: {
        type: "string",
        description: "The visual color theme.",
        enum: ["light", "dark"],
      },
    });

    expectTypeOf<PreferencesState<typeof manifest>>().toEqualTypeOf<{
      theme?: "light" | "dark";
    }>();
    expectTypeOf<
      PreferenceValue<{
        type: "string";
        description: "The density setting.";
        enum: readonly ["compact", "comfortable"];
      }>
    >().toEqualTypeOf<"compact" | "comfortable">();
  });

  it("copies and deeply freezes the normalized manifest", () => {
    const enumValues = ["light", "dark"];
    const manifest = definePreferences({
      theme: {
        type: "string",
        description: "The visual color theme.",
        enum: enumValues,
        default: "light",
        openPrefs: { sensitive: true },
      },
    });
    enumValues[0] = "changed outside";

    const definition = manifest.get("theme");
    if (definition?.type !== "string" || definition.enum === undefined) {
      throw new Error("Expected a string enum definition.");
    }
    if (definition.openPrefs === undefined) {
      throw new Error("Expected OpenPrefs metadata.");
    }

    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.ids())).toBe(true);
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.enum)).toBe(true);
    expect(Object.isFrozen(definition.openPrefs)).toBe(true);
    expect(Reflect.set(manifest, "has", () => false)).toBe(false);
    expect(Reflect.set(manifest.ids(), 0, "changed")).toBe(false);
    expect(Reflect.set(definition, "description", "changed")).toBe(false);
    expect(Reflect.set(definition.enum, 0, "changed")).toBe(false);
    expect(Reflect.set(definition.openPrefs, "sensitive", false)).toBe(false);
    expect(manifest.get("theme")).toEqual({
      type: "string",
      description: "The visual color theme.",
      enum: ["light", "dark"],
      default: "light",
      openPrefs: { sensitive: true },
    });
  });

  it("rejects invalid manifest containers", () => {
    expectManifestError(() => callDefinePreferences(null), "MANIFEST_INVALID");
    expectManifestError(() => definePreferences({}), "MANIFEST_EMPTY");
  });

  it.each(["", ".theme", "theme.", "theme..mode", "theme-mode", "1theme", "theme._mode"])(
    "rejects invalid preference id %j",
    (id) => {
      expectManifestError(
        () =>
          callDefinePreferences({
            [id]: { type: "boolean", description: "A preference." },
          }),
        "PREFERENCE_ID_INVALID",
        id,
      );
    },
  );

  it("rejects definitions that are not objects", () => {
    expectManifestError(
      () => callDefinePreferences({ theme: null }),
      "DEFINITION_INVALID",
      "theme",
    );
    expectManifestError(() => callDefinePreferences({ theme: [] }), "DEFINITION_INVALID", "theme");
  });

  it.each([
    ["unsupported type", { type: "object", description: "A preference." }, "TYPE_UNSUPPORTED"],
    ["missing description", { type: "boolean" }, "DESCRIPTION_INVALID"],
    ["empty description", { type: "boolean", description: "   " }, "DESCRIPTION_INVALID"],
    ["non-string description", { type: "boolean", description: 3 }, "DESCRIPTION_INVALID"],
    [
      "unknown boolean key",
      { type: "boolean", description: "A preference.", minimum: 0 },
      "DEFINITION_KEY_UNKNOWN",
    ],
    [
      "unknown string key",
      { type: "string", description: "A preference.", maximum: 1 },
      "DEFINITION_KEY_UNKNOWN",
    ],
    [
      "unknown number key",
      { type: "number", description: "A preference.", enum: ["one"] },
      "DEFINITION_KEY_UNKNOWN",
    ],
    [
      "incorrect boolean default",
      { type: "boolean", description: "A preference.", default: "yes" },
      "DEFAULT_TYPE_INVALID",
    ],
    [
      "incorrect string default",
      { type: "string", description: "A preference.", default: false },
      "DEFAULT_TYPE_INVALID",
    ],
    [
      "incorrect number default",
      { type: "number", description: "A preference.", default: "one" },
      "DEFAULT_TYPE_INVALID",
    ],
    [
      "non-finite number default",
      { type: "number", description: "A preference.", default: Number.NaN },
      "DEFAULT_TYPE_INVALID",
    ],
    ["empty enum", { type: "string", description: "A preference.", enum: [] }, "ENUM_INVALID"],
    [
      "non-array enum",
      { type: "string", description: "A preference.", enum: "one" },
      "ENUM_INVALID",
    ],
    [
      "non-string enum member",
      { type: "string", description: "A preference.", enum: ["one", 2] },
      "ENUM_INVALID",
    ],
    [
      "duplicate enum member",
      { type: "string", description: "A preference.", enum: ["one", "one"] },
      "ENUM_DUPLICATE",
    ],
    [
      "default outside enum",
      { type: "string", description: "A preference.", enum: ["one"], default: "two" },
      "DEFAULT_ENUM_INVALID",
    ],
    [
      "invalid minimum",
      { type: "number", description: "A preference.", minimum: "zero" },
      "MINIMUM_INVALID",
    ],
    [
      "non-finite minimum",
      { type: "number", description: "A preference.", minimum: Number.NEGATIVE_INFINITY },
      "MINIMUM_INVALID",
    ],
    [
      "invalid maximum",
      { type: "number", description: "A preference.", maximum: "ten" },
      "MAXIMUM_INVALID",
    ],
    [
      "non-finite maximum",
      { type: "number", description: "A preference.", maximum: Number.POSITIVE_INFINITY },
      "MAXIMUM_INVALID",
    ],
    [
      "reversed bounds",
      { type: "number", description: "A preference.", minimum: 10, maximum: 1 },
      "RANGE_INVALID",
    ],
    [
      "default below minimum",
      { type: "number", description: "A preference.", minimum: 1, default: 0 },
      "DEFAULT_RANGE_INVALID",
    ],
    [
      "default above maximum",
      { type: "number", description: "A preference.", maximum: 1, default: 2 },
      "DEFAULT_RANGE_INVALID",
    ],
    [
      "non-object OpenPrefs metadata",
      { type: "boolean", description: "A preference.", openPrefs: true },
      "OPEN_PREFS_INVALID",
    ],
    [
      "explicitly undefined OpenPrefs metadata",
      { type: "boolean", description: "A preference.", openPrefs: undefined },
      "OPEN_PREFS_INVALID",
    ],
    [
      "unknown OpenPrefs key",
      { type: "boolean", description: "A preference.", openPrefs: { senstive: true } },
      "OPEN_PREFS_KEY_UNKNOWN",
    ],
    [
      "invalid sensitive metadata",
      { type: "boolean", description: "A preference.", openPrefs: { sensitive: "yes" } },
      "SENSITIVE_INVALID",
    ],
    [
      "invalid confirmation metadata",
      { type: "boolean", description: "A preference.", openPrefs: { confirmation: "optional" } },
      "CONFIRMATION_INVALID",
    ],
  ] satisfies readonly (readonly [string, unknown, ManifestErrorCode])[])(
    "rejects %s with its rule-specific code",
    (_name, definition, code) => {
      expectManifestError(
        () => callDefinePreferences({ preference: definition }),
        code,
        "preference",
      );
    },
  );

  it("accepts empty and individually populated OpenPrefs metadata", () => {
    const manifest = definePreferences({
      empty: {
        type: "boolean",
        description: "An unannotated preference.",
        openPrefs: {},
      },
      confirmation: {
        type: "boolean",
        description: "A preference requiring confirmation.",
        openPrefs: { confirmation: "required" },
      },
    });

    expect(manifest.get("empty")?.openPrefs).toEqual({});
    expect(manifest.get("confirmation")?.openPrefs).toEqual({ confirmation: "required" });
  });
});
