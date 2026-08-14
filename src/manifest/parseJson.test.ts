import { describe, expect, it } from "vitest";
import type { ManifestError } from "../errors/manifestError";
import { definePreferences } from "./definePreferences";
import { parsePreferencesJson } from "./parseJson";

describe("parsePreferencesJson", () => {
  it("normalizes portable JSON equivalently to TypeScript definitions", () => {
    const definitions = {
      notifications: {
        type: "boolean",
        description: "Whether notifications are enabled.",
        default: true,
      },
      theme: {
        type: "string",
        description: "The visual color theme.",
        enum: ["light", "dark"],
        default: "dark",
        openPrefs: { sensitive: false },
      },
      textScale: {
        type: "number",
        description: "The interface text scale.",
        minimum: 0.5,
        maximum: 2,
        default: 1,
      },
    };
    const fromJson = parsePreferencesJson({ version: 1, preferences: definitions });
    const fromTypeScript = definePreferences({
      notifications: {
        type: "boolean",
        description: "Whether notifications are enabled.",
        default: true,
      },
      theme: {
        type: "string",
        description: "The visual color theme.",
        enum: ["light", "dark"],
        default: "dark",
        openPrefs: { sensitive: false },
      },
      textScale: {
        type: "number",
        description: "The interface text scale.",
        minimum: 0.5,
        maximum: 2,
        default: 1,
      },
    });

    expect(fromJson.ids()).toEqual(fromTypeScript.ids());
    for (const id of fromJson.ids()) {
      expect(fromJson.get(id)).toEqual(fromTypeScript.get(id));
    }
  });

  it.each([
    [null, "JSON_DOCUMENT_INVALID"],
    [[], "JSON_DOCUMENT_INVALID"],
    [{ version: 2, preferences: {} }, "VERSION_UNSUPPORTED"],
    [{ preferences: {} }, "VERSION_UNSUPPORTED"],
    [{ version: 1 }, "PREFERENCES_INVALID"],
    [{ version: 1, preferences: [] }, "PREFERENCES_INVALID"],
    [{ version: 1, preferences: {} }, "MANIFEST_EMPTY"],
  ] as const)("rejects an invalid portable document with %s", (input, code) => {
    expect(() => parsePreferencesJson(input)).toThrowError(
      expect.objectContaining<Partial<ManifestError>>({ code }),
    );
  });

  it("applies definition validation to portable JSON", () => {
    expect(() =>
      parsePreferencesJson({
        version: 1,
        preferences: {
          theme: {
            type: "string",
            description: "The visual color theme.",
            enum: ["light", "light"],
          },
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ManifestError>>({
        code: "ENUM_DUPLICATE",
        id: "theme",
      }),
    );
  });
});
