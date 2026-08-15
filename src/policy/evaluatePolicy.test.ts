import { describe, expect, expectTypeOf, it } from "vitest";
import { definePreferences } from "../manifest/definePreferences";
import type { PreferenceChange } from "../proposal/types";
import type { ProposalRejection } from "../validation/validateProposal";
import { evaluatePolicy } from "./evaluatePolicy";
import { resolvePolicy } from "./resolvePolicy";
import type { OpenPrefsPolicy, PolicyDecision } from "./types";

const definitions = {
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
} as const;

const manifest = definePreferences(definitions);
const labeledManifest = definePreferences(
  Object.fromEntries(
    Object.entries(definitions).map(([id, definition]) => [
      id,
      { ...definition, label: `Label for ${id}` },
    ]),
  ),
);

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

const emptyProposalRejection: ProposalRejection = {
  code: "ID_UNKNOWN",
  id: "missing",
  message: 'Preference "missing" is not exposed by the manifest.',
};

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

function nonRedundantCurrent(
  changes: readonly PreferenceChange[],
): Readonly<Record<string, false>> {
  return Object.fromEntries(changes.map(({ id }) => [id, false]));
}

function expectedDecision(
  testCase: MatrixCase,
  changes: readonly PreferenceChange[],
): PolicyDecision {
  const sensitiveUnderSensitiveMode =
    testCase.mode === "sensitive" &&
    (testCase.marking === "sensitive" || testCase.marking === "both");
  const explicitlyRequired = testCase.marking === "required" || testCase.marking === "both";
  const requiresConfirmation =
    testCase.mode === "always" || sensitiveUnderSensitiveMode || explicitlyRequired;
  if (requiresConfirmation) {
    return {
      outcome: "confirmation_required",
      changes,
      requiredBy: changes.map(({ id }) => id),
      exceedsChangeLimit: testCase.position === "over",
    };
  }

  if (testCase.position === "over") {
    return {
      outcome: "rejected",
      reason: "too_many_changes",
      changes,
      count: testCase.count,
      limit: 2,
    };
  }

  return { outcome: "apply", changes };
}

describe("evaluatePolicy", () => {
  it.each(matrix)(
    "returns the exact decision for non-redundant mode=$mode marking=$marking count=$position",
    (testCase) => {
      const changes = changesFor(testCase.marking, testCase.count);
      const current = nonRedundantCurrent(changes);
      const policy = resolvePolicy({
        confirmation: testCase.mode,
        maxChangesPerRequest: 2,
      });

      const decision = evaluatePolicy({ manifest, policy, changes, rejections: [], current });
      const labeledDecision = evaluatePolicy({
        manifest: labeledManifest,
        policy,
        changes,
        rejections: [],
        current,
      });

      expect(decision).toEqual(expectedDecision(testCase, changes));
      expect(labeledDecision).toEqual(decision);
    },
  );

  it("protects strongest-requirement-wins: global never cannot suppress preference confirmation", () => {
    const changes: PreferenceChange[] = [{ id: "required.one", value: true }];

    const decision = evaluatePolicy({
      manifest,
      policy: resolvePolicy({ confirmation: "never" }),
      changes,
      rejections: [],
    });

    expect(decision).toEqual({
      outcome: "confirmation_required",
      changes,
      requiredBy: ["required.one"],
      exceedsChangeLimit: false,
    });
  });

  it("gives all global modes distinct behavior profiles across unmarked and sensitive preferences", () => {
    const outcomeFor = (mode: OpenPrefsPolicy["confirmation"], marking: "unmarked" | "sensitive") =>
      evaluatePolicy({
        manifest,
        policy: resolvePolicy({ confirmation: mode }),
        changes: changesFor(marking, 1),
        rejections: [],
      }).outcome;

    const profiles = modes.map((mode) => ({
      mode,
      outcomes: [outcomeFor(mode, "unmarked"), outcomeFor(mode, "sensitive")],
    }));

    expect(profiles).toEqual([
      { mode: "always", outcomes: ["confirmation_required", "confirmation_required"] },
      { mode: "sensitive", outcomes: ["apply", "confirmation_required"] },
      { mode: "never", outcomes: ["apply", "apply"] },
    ]);
    expect(new Set(profiles.map(({ outcomes }) => outcomes.join(":"))).size).toBe(3);
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
      policy: resolvePolicy({ confirmation: "never", maxChangesPerRequest: 2 }),
      changes,
      rejections: [],
    });

    expect(decision).toEqual({
      outcome: "confirmation_required",
      changes,
      requiredBy: ["required.one", "both.one"],
      exceedsChangeLimit: true,
    });
  });

  it("fails closed when a change names a preference outside the manifest", () => {
    const changes: PreferenceChange[] = [{ id: "missing", value: true }];

    const decision = evaluatePolicy({
      manifest,
      policy: resolvePolicy({ confirmation: "never" }),
      changes,
      rejections: [],
      current: { missing: true },
    });

    expect(decision).toEqual({
      outcome: "rejected",
      reason: "unknown_preference",
      changes,
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
      current: Object.fromEntries(changes.map(({ id, value }) => [id, value])),
    });

    expect(decision).toEqual({
      outcome: "rejected",
      reason: "proposal_rejected",
      changes,
      rejections,
    });
  });

  it.each(modes)(
    "returns already_satisfied for zero changes and zero rejections in %s mode",
    (confirmation) => {
      expect(
        evaluatePolicy({
          manifest,
          policy: resolvePolicy({ confirmation }),
          changes: [],
          rejections: [],
        }),
      ).toEqual({ outcome: "already_satisfied" });
    },
  );

  it.each(modes)(
    "returns already_satisfied when every change strictly equals current in %s mode",
    (confirmation) => {
      const changes = changesFor("unmarked", 2);

      expect(
        evaluatePolicy({
          manifest,
          policy: resolvePolicy({ confirmation }),
          changes,
          rejections: [],
          current: Object.fromEntries(changes.map(({ id, value }) => [id, value])),
        }),
      ).toEqual({ outcome: "already_satisfied" });
    },
  );

  it("uses strict equality when comparing changes with current values", () => {
    const changes = changesFor("unmarked", 1);

    expect(
      evaluatePolicy({
        manifest,
        policy: resolvePolicy({ confirmation: "never" }),
        changes,
        rejections: [],
        current: { "unmarked.one": 1 },
      }),
    ).toEqual({ outcome: "apply", changes });
  });

  it.each(modes)(
    "rejects zero changes when validation produced rejections in %s mode",
    (confirmation) => {
      expect(
        evaluatePolicy({
          manifest,
          policy: resolvePolicy({ confirmation }),
          changes: [],
          rejections: [emptyProposalRejection],
        }),
      ).toEqual({
        outcome: "rejected",
        reason: "proposal_rejected",
        changes: [],
        rejections: [emptyProposalRejection],
      });
    },
  );

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
    expect(decision.outcome).toBe("apply");
    if (decision.outcome !== "apply") {
      return;
    }
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.changes)).toBe(true);
    expect(decision.changes).not.toBe(changes);
    expect(changes).toEqual([{ id: "unmarked.one", value: true }]);
    expect(rejections).toEqual([]);
  });

  it("keeps rejected decisions discriminated by reason-specific fields", () => {
    type RejectedDecision = Extract<PolicyDecision, { readonly outcome: "rejected" }>;
    type ProposalRejectedDecision = Extract<
      RejectedDecision,
      { readonly reason: "proposal_rejected" }
    >;
    type TooManyChangesDecision = Extract<
      RejectedDecision,
      { readonly reason: "too_many_changes" }
    >;
    type UnknownPreferenceDecision = Extract<
      RejectedDecision,
      { readonly reason: "unknown_preference" }
    >;

    expectTypeOf<ProposalRejectedDecision>().toEqualTypeOf<{
      readonly outcome: "rejected";
      readonly reason: "proposal_rejected";
      readonly changes: readonly PreferenceChange[];
      readonly rejections: readonly ProposalRejection[];
    }>();
    expectTypeOf<TooManyChangesDecision>().toEqualTypeOf<{
      readonly outcome: "rejected";
      readonly reason: "too_many_changes";
      readonly changes: readonly PreferenceChange[];
      readonly count: number;
      readonly limit: number;
    }>();
    expectTypeOf<UnknownPreferenceDecision>().toEqualTypeOf<{
      readonly outcome: "rejected";
      readonly reason: "unknown_preference";
      readonly changes: readonly PreferenceChange[];
    }>();
  });
});
