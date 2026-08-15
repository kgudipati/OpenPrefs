import { describe, expect, expectTypeOf, it } from "vitest";
import { definePreferences } from "./definePreferences";
import type { PreferencesState, PreferenceValue } from "./types";

describe("definePreferences", () => {
  it("accepts every supported preference definition", () => {
    const manifest = definePreferences({
      "notifications.directMessages": {
        type: "boolean",
        label: "Direct message notifications",
        description: "Whether direct messages trigger notifications.",
        default: true,
        openPrefs: { confirmation: "required", sensitive: false },
      },
      displayName: {
        type: "string",
        label: "Display name",
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
        label: "Text scale",
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
    expect(manifest.get("notifications.directMessages")?.label).toBe(
      "Direct message notifications",
    );
    expect(manifest.get("displayName")?.label).toBe("Display name");
    expect(manifest.get("textScale")?.label).toBe("Text scale");
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

    type EnumPreferenceValue = PreferenceValue<{
      type: "string";
      description: "The density setting.";
      enum: readonly ["compact", "comfortable"];
    }>;
    type StringPreferenceValue = PreferenceValue<{
      type: "string";
      description: "The display name.";
    }>;

    expectTypeOf<PreferencesState<typeof manifest>>().toEqualTypeOf<{
      theme?: "light" | "dark";
    }>();
    expectTypeOf<EnumPreferenceValue>().toEqualTypeOf<"compact" | "comfortable">();
    expectTypeOf<EnumPreferenceValue>().not.toEqualTypeOf<string>();
    expectTypeOf<StringPreferenceValue>().toEqualTypeOf<string>();
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
});
