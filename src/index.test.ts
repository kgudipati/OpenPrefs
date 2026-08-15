/// <reference types="vite/client" />

import { describe, expect, expectTypeOf, it } from "vitest";
import type { AlreadySatisfiedResult } from "./index";
import * as packageEntry from "./index";

const sourceFiles = import.meta.glob<string>("./**/*.ts", {
  eager: true,
  import: "default",
  query: "?raw",
});

describe("package entry point", () => {
  it("exports exactly the deliberate runtime API", () => {
    expect(Object.keys(packageEntry).sort()).toEqual([
      "ManifestError",
      "PolicyError",
      "createOpenPrefs",
      "definePreferences",
      "evaluatePolicy",
      "parsePreferencesJson",
      "resolvePolicy",
      "validateProposal",
    ]);
  });

  it("exports already_satisfied as a type without widening the runtime API", () => {
    expectTypeOf<AlreadySatisfiedResult>().toEqualTypeOf<{
      readonly status: "already_satisfied";
    }>();
  });

  it("does not import example code from the publishable source tree", () => {
    for (const source of Object.values(sourceFiles)) {
      const imports = source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g);
      for (const match of imports) {
        expect(match[1]).not.toContain("examples");
      }
    }
  });
});
