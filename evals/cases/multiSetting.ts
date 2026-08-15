import type { EvalCase } from "../harness/types.js";

/** Single intents whose complete expression requires several preference mutations. */
export const multiSettingCases: readonly EvalCase[] = [
  {
    id: "multi-setting-001",
    class: "multiSetting",
    input: "Only notify me for DMs.",
    expected: {
      status: "confirmation_required",
      changes: [
        { id: "directMessageNotifications", value: true },
        { id: "mentionNotifications", value: false },
        { id: "groupNotifications", value: false },
        { id: "marketingNotifications", value: false },
        { id: "productUpdateNotifications", value: false },
        { id: "securityNotifications", value: false },
      ],
    },
  },
  {
    id: "multi-setting-002",
    class: "multiSetting",
    input: "Keep only security alerts on.",
    expected: {
      status: "confirmation_required",
      changes: [
        { id: "securityNotifications", value: true },
        { id: "directMessageNotifications", value: false },
        { id: "mentionNotifications", value: false },
        { id: "groupNotifications", value: false },
        { id: "marketingNotifications", value: false },
        { id: "productUpdateNotifications", value: false },
      ],
    },
  },
  {
    id: "multi-setting-003",
    class: "multiSetting",
    input: "Stop product news and promotional updates.",
    expected: {
      status: "confirmation_required",
      changes: [
        { id: "productUpdateNotifications", value: false },
        { id: "marketingNotifications", value: false },
      ],
    },
  },
  {
    id: "multi-setting-004",
    class: "multiSetting",
    input: "Mute notification sounds and hide the unread badges.",
    expected: {
      status: "applied",
      changes: [
        { id: "notificationSound", value: false },
        { id: "notificationBadges", value: false },
      ],
    },
  },
  {
    id: "multi-setting-005",
    class: "multiSetting",
    input: "Enable keyboard help, screen reader hints, and high contrast.",
    expected: {
      status: "applied",
      changes: [
        { id: "keyboardNavigation", value: true },
        { id: "screenReaderHints", value: true },
        { id: "highContrast", value: true },
      ],
    },
  },
];
