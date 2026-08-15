import type { EvalCase } from "../harness/types.js";

/** Intents the manifest cannot express and for which no preference may be invented. */
export const unsupportedCases: readonly EvalCase[] = [
  {
    id: "unsupported-001",
    class: "unsupported",
    input: "Change the app language to French.",
    expected: { status: "unsupported", noChangesApplied: true },
  },
  {
    id: "unsupported-002",
    class: "unsupported",
    input: "Start my calendar weeks on Monday.",
    expected: { status: "unsupported", noChangesApplied: true },
  },
  {
    id: "unsupported-003",
    class: "unsupported",
    input: "Auto-save my documents every five minutes.",
    expected: { status: "unsupported", noChangesApplied: true },
  },
  {
    id: "unsupported-004",
    class: "unsupported",
    input: "Export all of my settings to a file.",
    expected: { status: "unsupported", noChangesApplied: true },
  },
  {
    id: "unsupported-005",
    class: "unsupported",
    input: "Change my account password.",
    expected: { status: "unsupported", noChangesApplied: true },
  },
];
