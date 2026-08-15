import type { EvalCase } from "../harness/types.js";

/** Subjective goals with an exact, product-authored multi-preference interpretation. */
export const goalOrientedCases: readonly EvalCase[] = [
  {
    id: "goal-oriented-001",
    class: "goalOriented",
    input: "Make the app less distracting.",
    expected: {
      status: "applied",
      changes: [
        { id: "reducedMotion", value: true },
        { id: "autoplayMedia", value: false },
        { id: "notificationSound", value: false },
        { id: "notificationBadges", value: false },
      ],
    },
  },
  {
    id: "goal-oriented-002",
    class: "goalOriented",
    input: "Give me maximum privacy.",
    startingState: { thirdPartyDataSharing: true },
    expected: {
      status: "confirmation_required",
      changes: [
        { id: "usageAnalytics", value: false },
        { id: "personalizedAds", value: false },
        { id: "profileVisibility", value: "private" },
        { id: "locationSharing", value: false },
        { id: "readReceipts", value: false },
        { id: "activityStatus", value: false },
        { id: "crashReports", value: false },
        { id: "thirdPartyDataSharing", value: false },
      ],
    },
  },
  {
    id: "goal-oriented-003",
    class: "goalOriented",
    input: "Make the app easy to read in bright sunlight.",
    expected: {
      status: "applied",
      changes: [
        { id: "theme", value: "light" },
        { id: "textSize", value: "large" },
        { id: "highContrast", value: true },
      ],
    },
  },
  {
    id: "goal-oriented-004",
    class: "goalOriented",
    input: "Set things up for using a screen reader.",
    expected: {
      status: "applied",
      changes: [
        { id: "screenReaderHints", value: true },
        { id: "keyboardNavigation", value: true },
        { id: "autoplayMedia", value: false },
      ],
    },
  },
  {
    id: "goal-oriented-005",
    class: "goalOriented",
    input: "Set up a quiet, focused work mode without silencing direct messages.",
    startingState: { directMessageNotifications: false },
    expected: {
      status: "confirmation_required",
      changes: [
        { id: "directMessageNotifications", value: true },
        { id: "mentionNotifications", value: false },
        { id: "groupNotifications", value: false },
        { id: "marketingNotifications", value: false },
        { id: "productUpdateNotifications", value: false },
        { id: "notificationSound", value: false },
        { id: "notificationBadges", value: false },
      ],
    },
  },
];
