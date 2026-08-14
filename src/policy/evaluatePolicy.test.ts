import { describe, expect, it } from "vitest";
import { definePreferences } from "../manifest/definePreferences";
import type { PreferenceChange } from "../proposal/types";
import type { ProposalRejection } from "../validation/validateProposal";
import { evaluatePolicy } from "./evaluatePolicy";
import { resolvePolicy } from "./resolvePolicy";
import type { OpenPrefsPolicy, PolicyDecision } from "./types";

const manifest = definePreferences({
  "unmarked.one": {
    type: "boolean",
    description: "The first unmarked preference.",
  },
  "unmarked.two": {
    type: "boolean",
    description: "The second unmarked preference.",
  },
  "unmarked.three": {
    type: "boolean",
    description: "The third unmarked preference.",
  },
  "sensitive.one": {
    type: "boolean",
    description: "The first sensitive preference.",
    openPrefs: { sensitive: true },
  },
  "sensitive.two": {
    type: "boolean",
    description: "The second sensitive preference.",
    openPrefs: { sensitive: true },
  },
  "sensitive.three": {
    type: "boolean",
    description: "The third sensitive preference.",
    openPrefs: { sensitive: true },
  },
  "required.one": {
    type: "boolean",
    description: "The first confirmation-required preference.",
    openPrefs: { confirmation: "required" },
  },
  "required.two": {
    type: "boolean",
    description: "The second confirmation-required preference.",
    openPrefs: { confirmation: "required" },
  },
  "required.three": {
    type: "boolean",
    description: "The third confirmation-required preference.",
    openPrefs: { confirmation: "required" },
  },
  "both.one": {
    type: "boolean",
    description: "The first sensitive and confirmation-required preference.",
    openPrefs: { confirmation: "required", sensitive: true },
  },
  "both.two": {
    type: "boolean",
    description: "The second sensitive and confirmation-required preference.",
    openPrefs: { confirmation: "required", sensitive: true },
  },
  "both.three": {
    type: "boolean",
    description: "The third sensitive and confirmation-required preference.",
    openPrefs: { confirmation: "required", sensitive: true },
  },
});

const modes = ["always", "sensitive", "never"] as const;
const markings = ["unmarked", "sensitive", "required", "both"] as const;
const counts = [
  { position: "under", value: 1 },
  { position: "at", value: 2 },
  { position: "over", value: 3 },
] as const;
const idsByMarking = {
  unmarked: ["unmarked.one", "unmarked.two", "unmarked.three"],
  sensitive: ["sensitive.one", "sensitive.two", "sensitive.three"],
  required: ["required.one", "required.two", "required.three"],
  both: ["both.one", "both.two", "both.three"],
} as const;

interface MatrixCase {
  readonly mode: OpenPrefsPolicy["confirmation"];
  readonly marking: (typeof markings)[number];
  readonly position: (typeof counts)[number]["position"];
  readonly count: number;
}

const matrix: readonly MatrixCase[] = modes.flatMap((mode) =>
  markings.flatMap((marking) =>
    counts.map(({ position, value: count }) => ({ mode, marking, position, count })),
  ),
);

function changesFor(marking: MatrixCase["marking"], count: number): PreferenceChange[] {
  return idsByMarking[marking].slice(0, count).map((id) => ({ id, value: true }));
}

function expectedDecision(
  testCase: MatrixCase,
  changes: readonly PreferenceChange[],
): PolicyDecision {
  if (testCase.position === "over") {
    return {
      outcome: "rejected",
      reason: "too_many_changes",
      changes,
      count: testCase.count,
      limit: 2,
    };
  }

  const requiresConfirmation = testCase.mode === "always" || testCase.marking !== "unmarked";
  if (requiresConfirmation) {
    return {
      outcome: "confirmation_required",
      changes,
      requiredBy: changes.map(({ id }) => id),
    };
  }

  return { outcome: "apply", changes };
}

describe("evaluatePolicy", () => {
  it.each(matrix)(
    "returns the exact decision for mode=$mode marking=$marking count=$position",
    (testCase) => {
      const changes = changesFor(testCase.marking, testCase.count);
      const policy = resolvePolicy({
        confirmation: testCase.mode,
        maxChangesPerRequest: 2,
      });

      const decision = evaluatePolicy({ manifest, policy, changes, rejections: [] });

      expect(decision).toEqual(expectedDecision(testCase, changes));
    },
  );

  it("protects strongest-requirement-wins: global never cannot suppress preference confirmation", () => {
    const changes: PreferenceChange[] = [
      { id: "sensitive.one", value: true },
      { id: "required.one", value: true },
    ];

    const decision = evaluatePolicy({
      manifest,
      policy: resolvePolicy({ confirmation: "never" }),
      changes,
      rejections: [],
    });

    expect(decision).toEqual({
      outcome: "confirmation_required",
      changes,
      requiredBy: ["sensitive.one", "required.one"],
    });
  });

  it("lists only the preference ids that triggered confirmation", () => {
    const changes: PreferenceChange[] = [
      { id: "unmarked.one", value: true },
      { id: "sensitive.one", value: true },
      { id: "required.one", value: true },
      { id: "both.one", value: true },
    ];

    const decision = evaluatePolicy({
      manifest,
      policy: resolvePolicy({ confirmation: "never" }),
      changes,
      rejections: [],
    });

    expect(decision).toEqual({
      outcome: "confirmation_required",
      changes,
      requiredBy: ["sensitive.one", "required.one", "both.one"],
    });
  });

  it("rejects the whole proposal before applying change limits or confirmation rules", () => {
    const changes = changesFor("unmarked", 3);
    const rejections: ProposalRejection[] = [
      {
        code: "ID_UNKNOWN",
        id: "missing",
        message: 'Preference "missing" is not exposed by the manifest.',
      },
    ];

    const decision = evaluatePolicy({
      manifest,
      policy: resolvePolicy({ confirmation: "always", maxChangesPerRequest: 1 }),
      changes,
      rejections,
    });

    expect(decision).toEqual({
      outcome: "rejected",
      reason: "proposal_rejected",
      changes,
      rejections,
    });
  });

  it("rejects a request with no changes", () => {
    expect(
      evaluatePolicy({
        manifest,
        policy: resolvePolicy({ confirmation: "never" }),
        changes: [],
        rejections: [],
      }),
    ).toEqual({ outcome: "rejected", reason: "no_changes", changes: [] });
  });

  it("returns frozen copies without mutating policy inputs", () => {
    const changes = changesFor("unmarked", 1);
    const rejections: ProposalRejection[] = [];
    const input = {
      manifest,
      policy: resolvePolicy({ confirmation: "never" }),
      changes,
      rejections,
    };

    const decision = evaluatePolicy(input);

    expect(decision).toEqual({ outcome: "apply", changes });
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.changes)).toBe(true);
    expect(decision.changes).not.toBe(changes);
    expect(changes).toEqual([{ id: "unmarked.one", value: true }]);
    expect(rejections).toEqual([]);
  });
});
