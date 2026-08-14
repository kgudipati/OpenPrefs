/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";
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

  it("does not import example code from the publishable source tree", () => {
    for (const source of Object.values(sourceFiles)) {
      const imports = source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g);
      for (const match of imports) {
        expect(match[1]).not.toContain("examples");
      }
    }
  });
});
