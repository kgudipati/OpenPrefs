import { describe, expect, it } from "vitest";
import { definePreferences, type PreferencesResolver } from "../../src/index.js";
import { evalCases } from "../cases/index.js";
import { formatHumanReport } from "./reporters.js";
import { exactChangeSet, runEvalSuite, validateCaseSuite } from "./runner.js";
import type { EvalCase } from "./types.js";

const preferences = definePreferences({
  theme: {
    type: "string",
    description: "Application color theme.",
    enum: ["light", "dark"],
    default: "light",
  },
  analytics: {
    type: "boolean",
    description: "Whether analytics are shared.",
    default: false,
    openPrefs: { sensitive: true },
  },
});

function resolverFor(
  result: Awaited<ReturnType<PreferencesResolver["resolve"]>>,
): PreferencesResolver {
  return {
    async resolve() {
      return result;
    },
  };
}

describe("exact change-set scoring", () => {
  it("ignores order while requiring the same ids and values", () => {
    expect(
      exactChangeSet(
        [
          { id: "theme", value: "dark" },
          { id: "analytics", value: false },
        ],
        [
          { id: "analytics", value: false },
          { id: "theme", value: "dark" },
        ],
      ),
    ).toBe(true);
  });

  it("rejects extras, omissions, changed values, and duplicate entries", () => {
    const expected = [{ id: "theme", value: "dark" }] as const;

    expect(exactChangeSet(expected, [])).toBe(false);
    expect(exactChangeSet(expected, [...expected, { id: "analytics", value: false }])).toBe(false);
    expect(exactChangeSet(expected, [{ id: "theme", value: "light" }])).toBe(false);
    expect(exactChangeSet(expected, [...expected, ...expected])).toBe(false);
  });
});

describe("the full-pipeline eval runner", () => {
  it("scores the lifecycle status after validation and sensitive policy", async () => {
    const cases: readonly EvalCase[] = [
      {
        id: "policy-001",
        class: "direct",
        input: "share analytics",
        expected: {
          status: "confirmation_required",
          changes: [{ id: "analytics", value: true }],
        },
      },
    ];

    const report = await runEvalSuite({
      resolver: resolverFor({
        status: "resolved",
        changes: [{ id: "analytics", value: true }],
      }),
      resolverName: "scripted",
      manifest: preferences,
      startingState: { theme: "light", analytics: false },
      cases,
      policy: { confirmation: "sensitive" },
    });

    expect(report.passed).toBe(1);
    expect(report.cases[0]?.actual).toMatchObject({
      status: "confirmation_required",
      changes: [{ id: "analytics", value: true }],
      appliedChanges: [],
    });
  });

  it("exposes a validator rejection instead of scoring an invented preference as unsupported", async () => {
    const cases: readonly EvalCase[] = [
      {
        id: "boundary-001",
        class: "adversarial",
        input: "enable root access",
        expected: { status: "unsupported", noChangesApplied: true },
      },
    ];
    const resolver: PreferencesResolver = {
      async resolve() {
        return {
          status: "resolved",
          changes: [{ id: "rootAccess", value: true }],
        };
      },
    };

    const report = await runEvalSuite({
      resolver,
      resolverName: "hostile",
      manifest: preferences,
      startingState: { theme: "light", analytics: false },
      cases,
      policy: { confirmation: "never" },
    });

    expect(report.passed).toBe(0);
    expect(report.cases[0]?.actual).toMatchObject({
      status: "rejected",
      appliedChanges: [],
      result: { reason: "proposal_rejected" },
    });
  });

  it("prints expected and actual changes for a one-run diagnosis", async () => {
    const cases: readonly EvalCase[] = [
      {
        id: "diagnostic-001",
        class: "direct",
        input: "use dark mode",
        expected: { status: "applied", changes: [{ id: "theme", value: "dark" }] },
      },
    ];
    const report = await runEvalSuite({
      resolver: resolverFor({
        status: "resolved",
        changes: [{ id: "theme", value: "light" }],
      }),
      resolverName: "wrong-value",
      manifest: preferences,
      startingState: { theme: "light", analytics: false },
      cases,
      policy: { confirmation: "never" },
    });

    expect(formatHumanReport(report)).toContain(
      'expected changes: [{"id":"theme","value":"dark"}]',
    );
    expect(formatHumanReport(report)).toContain(
      'actual changes:   [{"id":"theme","value":"light"}]',
    );
  });
});

describe("the committed section 53 suite", () => {
  it("contains five unique cases in every required class", () => {
    expect(evalCases).toHaveLength(45);
    expect(validateCaseSuite(evalCases)).toEqual([]);
  });
});
