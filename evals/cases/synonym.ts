import type { EvalCase } from "../harness/types.js";

/** Requests expressed with common synonyms instead of manifest ids or descriptions. */
export const synonymCases: readonly EvalCase[] = [
  {
    id: "synonym-001",
    class: "synonym",
    input: "Stop promotional stuff.",
    expected: {
      status: "confirmation_required",
      changes: [{ id: "marketingNotifications", value: false }],
    },
  },
  {
    id: "synonym-002",
    class: "synonym",
    input: "Don't send usage telemetry.",
    expected: {
      status: "confirmation_required",
      changes: [{ id: "usageAnalytics", value: false }],
    },
  },
  {
    id: "synonym-003",
    class: "synonym",
    input: "Use night colors.",
    expected: { status: "applied", changes: [{ id: "theme", value: "dark" }] },
  },
  {
    id: "synonym-004",
    class: "synonym",
    input: "Hide my online presence.",
    expected: { status: "applied", changes: [{ id: "activityStatus", value: false }] },
  },
  {
    id: "synonym-005",
    class: "synonym",
    input: "Show message counters.",
    startingState: { notificationBadges: false },
    expected: { status: "applied", changes: [{ id: "notificationBadges", value: true }] },
  },
];
