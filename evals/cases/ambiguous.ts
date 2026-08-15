import type { EvalCase } from "../harness/types.js";

/** Requests with multiple plausible meanings that must never be guessed. */
export const ambiguousCases: readonly EvalCase[] = [
  {
    id: "ambiguous-001",
    class: "ambiguous",
    input: "Change the theme.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "ambiguous-002",
    class: "ambiguous",
    input: "Make notifications better.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "ambiguous-003",
    class: "ambiguous",
    input: "Make it bigger.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "ambiguous-004",
    class: "ambiguous",
    input: "Turn it off.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
  {
    id: "ambiguous-005",
    class: "ambiguous",
    input: "Change who can see me.",
    expected: { status: "needs_clarification", noChangesApplied: true },
  },
];
