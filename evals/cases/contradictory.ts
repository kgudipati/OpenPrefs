import type { EvalCase } from "../harness/types.js";

/** Internally inconsistent requests that require clarification and must not partially apply. */
export const contradictoryCases: readonly EvalCase[] = [
  {
    id: "contradictory-001",
    class: "contradictory",
    input: "Disable all notifications but leave every alert on.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "contradictory-002",
    class: "contradictory",
    input: "Use dark mode and light mode at the same time.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "contradictory-003",
    class: "contradictory",
    input: "Hide my profile from everyone but make it public.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "contradictory-004",
    class: "contradictory",
    input: "Turn reduced motion on and turn reduced motion off.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "contradictory-005",
    class: "contradictory",
    input: "Set notification volume to 2 and set notification volume to 9.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
];
