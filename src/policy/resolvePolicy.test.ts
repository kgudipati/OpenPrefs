import { describe, expect, expectTypeOf, it } from "vitest";
import type { PolicyError } from "../errors/policyError";
import { resolvePolicy } from "./resolvePolicy";
import type { OpenPrefsPolicy } from "./types";

describe("resolvePolicy", () => {
  it("fills every default and returns a complete frozen policy", () => {
    const policy = resolvePolicy();

    expect(policy).toEqual({ confirmation: "always", maxChangesPerRequest: 10 });
    expect(Object.isFrozen(policy)).toBe(true);
    expectTypeOf(policy).toEqualTypeOf<OpenPrefsPolicy>();
  });

  it("preserves supported developer overrides while filling omitted settings", () => {
    expect(resolvePolicy({ confirmation: "sensitive" })).toEqual({
      confirmation: "sensitive",
      maxChangesPerRequest: 10,
    });
    expect(resolvePolicy({ confirmation: "never", maxChangesPerRequest: 4 })).toEqual({
      confirmation: "never",
      maxChangesPerRequest: 4,
    });
    expect(resolvePolicy({ maxChangesPerRequest: 1 })).toEqual({
      confirmation: "always",
      maxChangesPerRequest: 1,
    });
  });

  it.each(["sometimes", null, true, 1])(
    "throws an actionable stable error for unrecognized confirmation mode %s",
    (confirmation) => {
      const action = () => Reflect.apply(resolvePolicy, undefined, [{ confirmation }]);

      expect(action).toThrowError(
        expect.objectContaining<Partial<PolicyError>>({
          code: "POLICY_CONFIRMATION_INVALID",
          message: 'Policy "confirmation" must be exactly "always", "sensitive", or "never".',
        }),
      );
    },
  );

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, null, "10"])(
    "throws an actionable stable error for invalid change limit %s",
    (maxChangesPerRequest) => {
      const action = () => Reflect.apply(resolvePolicy, undefined, [{ maxChangesPerRequest }]);

      expect(action).toThrowError(
        expect.objectContaining<Partial<PolicyError>>({
          code: "POLICY_MAX_CHANGES_INVALID",
          message: 'Policy "maxChangesPerRequest" must be a positive integer.',
        }),
      );
    },
  );
});
