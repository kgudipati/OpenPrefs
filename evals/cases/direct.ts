import type { EvalCase } from "../harness/types.js";

/** Direct requests that name one preference and an exact target value. */
export const directCases: readonly EvalCase[] = [
  {
    id: "direct-001",
    class: "direct",
    input: "Turn on dark mode.",
    expected: { status: "applied", changes: [{ id: "theme", value: "dark" }] },
  },
  {
    id: "direct-002",
    class: "direct",
    input: "Turn off read receipts.",
    expected: { status: "applied", changes: [{ id: "readReceipts", value: false }] },
  },
  {
    id: "direct-003",
    class: "direct",
    input: "Set notification volume to 3.",
    expected: { status: "applied", changes: [{ id: "notificationVolume", value: 3 }] },
  },
  {
    id: "direct-004",
    class: "direct",
    input: "Enable keyboard navigation.",
    expected: { status: "applied", changes: [{ id: "keyboardNavigation", value: true }] },
  },
  {
    id: "direct-005",
    class: "direct",
    input: "Make my profile private.",
    expected: {
      status: "applied",
      changes: [{ id: "profileVisibility", value: "private" }],
    },
  },
];
