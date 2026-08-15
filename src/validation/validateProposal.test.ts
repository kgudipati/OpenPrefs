import { describe, expect, expectTypeOf, it } from "vitest";
import { definePreferences } from "../manifest/definePreferences";
import type { PreferenceChange, SettingsProposal } from "../proposal/types";
import {
  type ProposalRejectionCode,
  type ProposalValidationResult,
  validateProposal,
} from "./validateProposal";

const manifest = definePreferences({
  enabled: {
    type: "boolean",
    description: "Whether the feature is enabled.",
  },
  label: {
    type: "string",
    description: "The visible label.",
  },
  theme: {
    type: "string",
    description: "The visual theme.",
    enum: ["light", "dark"],
  },
  volume: {
    type: "number",
    description: "The output volume.",
    minimum: 0,
    maximum: 10,
  },
  zoom: {
    type: "number",
    description: "The zoom level.",
  },
});

interface AdversarialCase {
  readonly name: string;
  readonly input: unknown;
  readonly codes: readonly ProposalRejectionCode[];
}

const adversarialCases: readonly AdversarialCase[] = [
  { name: "null proposal", input: null, codes: ["PROPOSAL_MALFORMED"] },
  { name: "undefined proposal", input: undefined, codes: ["PROPOSAL_MALFORMED"] },
  { name: "numeric proposal", input: 7, codes: ["PROPOSAL_MALFORMED"] },
  { name: "string proposal", input: "changes", codes: ["PROPOSAL_MALFORMED"] },
  { name: "array proposal", input: [], codes: ["PROPOSAL_MALFORMED"] },
  { name: "empty object", input: {}, codes: ["PROPOSAL_MALFORMED"] },
  {
    name: "non-array changes field",
    input: { changes: "enabled" },
    codes: ["PROPOSAL_MALFORMED"],
  },
  {
    name: "null change",
    input: { changes: [null] },
    codes: ["CHANGE_MALFORMED"],
  },
  {
    name: "nested array change",
    input: { changes: [[{ id: "enabled", value: true }]] },
    codes: ["CHANGE_MALFORMED"],
  },
  {
    name: "missing id",
    input: { changes: [{ value: true }] },
    codes: ["ID_INVALID"],
  },
  {
    name: "non-string id",
    input: { changes: [{ id: 1, value: true }] },
    codes: ["ID_INVALID"],
  },
  {
    name: "asterisk proto id",
    input: { changes: [{ id: "**proto**", value: true }] },
    codes: ["ID_UNKNOWN"],
  },
  {
    name: "dunder proto id",
    input: { changes: [{ id: "__proto__", value: true }] },
    codes: ["ID_UNKNOWN"],
  },
  {
    name: "constructor id",
    input: { changes: [{ id: "constructor", value: true }] },
    codes: ["ID_UNKNOWN"],
  },
  {
    name: "prototype id",
    input: { changes: [{ id: "prototype", value: true }] },
    codes: ["ID_UNKNOWN"],
  },
  {
    name: "valid id with wrong value type",
    input: { changes: [{ id: "label", value: false }] },
    codes: ["VALUE_TYPE_MISMATCH"],
  },
  ...["true", "yes", 1, 0].map((value) => ({
    name: `boolean preference with ${JSON.stringify(value)}`,
    input: { changes: [{ id: "enabled", value }] },
    codes: ["VALUE_TYPE_MISMATCH"] as const,
  })),
  {
    name: 'number preference with "14"',
    input: { changes: [{ id: "zoom", value: "14" }] },
    codes: ["VALUE_TYPE_MISMATCH"],
  },
  ...[Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map((value) => ({
    name: `number preference with ${String(value)}`,
    input: { changes: [{ id: "zoom", value }] },
    codes: ["VALUE_NOT_FINITE"] as const,
  })),
  {
    name: "enum preference with non-member",
    input: { changes: [{ id: "theme", value: "sepia" }] },
    codes: ["VALUE_ENUM_VIOLATION"],
  },
  {
    name: "enum preference with member in wrong case",
    input: { changes: [{ id: "theme", value: "DARK" }] },
    codes: ["VALUE_ENUM_VIOLATION"],
  },
  {
    name: "bounded number one below minimum",
    input: { changes: [{ id: "volume", value: -1 }] },
    codes: ["VALUE_RANGE_VIOLATION"],
  },
  {
    name: "bounded number one above maximum",
    input: { changes: [{ id: "volume", value: 11 }] },
    codes: ["VALUE_RANGE_VIOLATION"],
  },
  {
    name: "change with extra key",
    input: { changes: [{ id: "enabled", value: true, confidence: 1 }] },
    codes: ["CHANGE_MALFORMED"],
  },
  {
    name: "change with missing value",
    input: { changes: [{ id: "enabled" }] },
    codes: ["CHANGE_MALFORMED"],
  },
  {
    name: "same id twice with same value",
    input: {
      changes: [
        { id: "enabled", value: true },
        { id: "enabled", value: true },
      ],
    },
    codes: ["CHANGE_DUPLICATE", "CHANGE_DUPLICATE"],
  },
  {
    name: "same id twice with different values",
    input: {
      changes: [
        { id: "enabled", value: true },
        { id: "enabled", value: false },
      ],
    },
    codes: ["CHANGE_DUPLICATE", "CHANGE_DUPLICATE"],
  },
];

describe("validateProposal", () => {
  it("produces identical validation with or without a presentational label", () => {
    const labeledManifest = definePreferences({
      enabled: {
        type: "boolean",
        label: "Feature enabled",
        description: "Whether the feature is enabled.",
      },
    });
    const unlabeledManifest = definePreferences({
      enabled: {
        type: "boolean",
        description: "Whether the feature is enabled.",
      },
    });
    const proposal = { changes: [{ id: "enabled", value: true }] };

    expect(validateProposal(labeledManifest, proposal)).toEqual(
      validateProposal(unlabeledManifest, proposal),
    );
  });

  it("validates boolean, string, enum, and numeric changes without coercion", () => {
    const input = {
      changes: [
        { id: "enabled", value: true },
        { id: "label", value: "OpenPrefs" },
        { id: "theme", value: "dark" },
        { id: "zoom", value: 1.5 },
      ],
    };

    const validation = validateProposal(manifest, input);

    expect(validation).toEqual({ changes: input.changes, rejections: [] });
    expect(input).toEqual({
      changes: [
        { id: "enabled", value: true },
        { id: "label", value: "OpenPrefs" },
        { id: "theme", value: "dark" },
        { id: "zoom", value: 1.5 },
      ],
    });
    expect(validation.changes[0]).not.toBe(input.changes[0]);
  });

  it("accepts inclusive minimum and maximum boundary values", () => {
    const atMinimum = validateProposal(manifest, {
      changes: [{ id: "volume", value: 0 }],
    });
    const atMaximum = validateProposal(manifest, {
      changes: [{ id: "volume", value: 10 }],
    });

    expect(atMinimum).toEqual({ changes: [{ id: "volume", value: 0 }], rejections: [] });
    expect(atMaximum).toEqual({ changes: [{ id: "volume", value: 10 }], rejections: [] });
  });

  it("accepts an empty proposal without inventing a change", () => {
    expect(validateProposal(manifest, { changes: [] })).toEqual({
      changes: [],
      rejections: [],
    });
  });

  it("validates changes inside a resolver envelope and ignores additional proposal keys", () => {
    const validation = validateProposal(manifest, {
      status: "resolved",
      changes: [{ id: "enabled", value: true }],
      explanation: "The user requested this preference.",
    });

    expect(validation).toEqual({
      changes: [{ id: "enabled", value: true }],
      rejections: [],
    });
  });

  it("returns every valid change and every rejection in proposal order", () => {
    const validation = validateProposal(manifest, {
      changes: [
        { id: "enabled", value: true },
        null,
        { id: "missing", value: "value" },
        { id: "zoom", value: "2" },
        { id: "theme", value: "sepia" },
        { id: "volume", value: 11 },
        { id: "label", value: "kept" },
      ],
    });

    expect(validation.changes).toEqual([
      { id: "enabled", value: true },
      { id: "label", value: "kept" },
    ]);
    expect(validation.rejections.map(({ code }) => code)).toEqual([
      "CHANGE_MALFORMED",
      "ID_UNKNOWN",
      "VALUE_TYPE_MISMATCH",
      "VALUE_ENUM_VIOLATION",
      "VALUE_RANGE_VIOLATION",
    ]);
  });

  it.each(adversarialCases)("never throws or admits a change for $name", ({ input, codes }) => {
    let validation: ProposalValidationResult | undefined;

    expect(() => {
      validation = validateProposal(manifest, input);
    }).not.toThrow();
    expect(validation?.changes).toEqual([]);
    expect(validation?.rejections.map(({ code }) => code)).toEqual(codes);
  });

  it("turns hostile property access into a malformed proposal rejection", () => {
    const input = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error("hostile proxy");
        },
      },
    );

    expect(() => validateProposal(manifest, input)).not.toThrow();
    expect(validateProposal(manifest, input)).toEqual({
      changes: [],
      rejections: [
        expect.objectContaining({
          code: "PROPOSAL_MALFORMED",
        }),
      ],
    });
  });

  it("rejects a changes accessor while allowing other proposal envelope keys", () => {
    let accessed = false;
    const input = Object.defineProperty({ status: "resolved" }, "changes", {
      enumerable: true,
      get() {
        accessed = true;
        throw new Error("accessor must not run");
      },
    });

    const validation = validateProposal(manifest, input);

    expect(accessed).toBe(false);
    expect(validation.changes).toEqual([]);
    expect(validation.rejections[0]?.code).toBe("PROPOSAL_MALFORMED");
  });

  it("does not invoke attacker-controlled array map or iterator methods", () => {
    class HostileChanges extends Array<unknown> {
      override map<Value>(
        _callback: (value: unknown, index: number, array: unknown[]) => Value,
        _thisArg?: unknown,
      ): Value[] {
        throw new Error("map must not run");
      }

      override [Symbol.iterator](): ArrayIterator<unknown> {
        throw new Error("iterator must not run");
      }
    }
    const hostileChanges = new HostileChanges(null);

    expect(() => validateProposal(manifest, { changes: hostileChanges })).not.toThrow();
    expect(validateProposal(manifest, { changes: hostileChanges })).toEqual({
      changes: [],
      rejections: [expect.objectContaining({ code: "CHANGE_MALFORMED" })],
    });
  });

  it("conservatively rejects both changes when a malformed entry identifies a duplicate id", () => {
    const validation = validateProposal(manifest, {
      changes: [
        { id: "theme", value: "dark", confidence: 1 },
        { id: "theme", value: "light" },
      ],
    });

    expect(validation.changes).toEqual([]);
    expect(validation.rejections).toEqual([
      expect.objectContaining({ code: "CHANGE_MALFORMED", id: "theme" }),
      expect.objectContaining({ code: "CHANGE_DUPLICATE", id: "theme" }),
    ]);
  });

  it("freezes trusted outputs without freezing or mutating resolver input", () => {
    const input = { changes: [{ id: "enabled", value: true }] };

    const validation = validateProposal(manifest, input);

    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.changes)).toBe(false);
    expect(Object.isFrozen(input.changes[0])).toBe(false);
    expect(Object.isFrozen(validation)).toBe(true);
    expect(Object.isFrozen(validation.changes)).toBe(true);
    expect(Object.isFrozen(validation.changes[0])).toBe(true);
    expect(Object.isFrozen(validation.rejections)).toBe(true);
    expect(Reflect.set(validation.changes[0] ?? {}, "value", false)).toBe(false);
  });

  it("exposes minimal trusted and untrusted proposal types", () => {
    expectTypeOf<PreferenceChange>().toEqualTypeOf<{
      readonly id: string;
      readonly value: boolean | string | number;
    }>();
    expectTypeOf<SettingsProposal>().toEqualTypeOf<{
      readonly [key: string]: unknown;
      readonly changes: readonly {
        readonly id: unknown;
        readonly value: unknown;
      }[];
    }>();
  });
});
