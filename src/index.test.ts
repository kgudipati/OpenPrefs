import { describe, expect, it } from "vitest";
import * as packageEntry from "./index";

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
});
