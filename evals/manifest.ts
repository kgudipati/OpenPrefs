import { preferenceDefinitions } from "../examples/typescript/src/preferenceDefinitions.js";
import { definePreferences } from "../src/index.js";
import type { EvalState } from "./harness/types.js";

/**
 * The 28-preference eval manifest, extending the Phase 6 example across four realistic domains.
 */
export const evalManifest = definePreferences({
  ...preferenceDefinitions,
  accentColor: {
    type: "string",
    description: "Interface accent color used for controls and highlights.",
    enum: ["blue", "green", "purple", "orange"],
    default: "blue",
  },
  sidebarPosition: {
    type: "string",
    description: "Side of the interface where the navigation sidebar appears.",
    enum: ["left", "right"],
    default: "left",
  },
  highContrast: {
    type: "boolean",
    description: "Whether high-contrast interface colors are enabled for readability.",
    default: false,
  },
  screenReaderHints: {
    type: "boolean",
    description: "Whether additional labels and navigation hints are exposed to screen readers.",
    default: false,
  },
  keyboardNavigation: {
    type: "boolean",
    description: "Whether enhanced keyboard-only navigation and focus indicators are enabled.",
    default: false,
  },
  colorVisionMode: {
    type: "string",
    description: "Color-vision accessibility filter used throughout the interface.",
    enum: ["none", "deuteranopia", "protanopia", "tritanopia"],
    default: "none",
  },
  autoplayMedia: {
    type: "boolean",
    description: "Whether videos and animated media begin playing automatically.",
    default: true,
  },
  directMessageNotifications: {
    type: "boolean",
    description: "Whether notifications are sent for direct messages and DMs.",
    default: true,
  },
  mentionNotifications: {
    type: "boolean",
    description: "Whether notifications are sent when another person mentions the user.",
    default: true,
  },
  groupNotifications: {
    type: "boolean",
    description: "Whether notifications are sent for group and channel activity.",
    default: true,
  },
  notificationSound: {
    type: "boolean",
    description: "Whether notification alerts play an audible sound.",
    default: true,
  },
  notificationBadges: {
    type: "boolean",
    description: "Whether unread notification badges and message counters are shown.",
    default: true,
  },
  readReceipts: {
    type: "boolean",
    description: "Whether other people can see when their messages have been read.",
    default: true,
  },
  activityStatus: {
    type: "boolean",
    description: "Whether other people can see the user's online presence and activity status.",
    default: true,
  },
  crashReports: {
    type: "boolean",
    description: "Whether sensitive crash diagnostics are uploaded to improve reliability.",
    default: true,
    openPrefs: { sensitive: true },
  },
  thirdPartyDataSharing: {
    type: "boolean",
    description: "Whether account activity data may be shared with third-party partners.",
    default: false,
    openPrefs: { sensitive: true, confirmation: "required" },
  },
});

/** Complete host-owned starting state used unless a case overrides selected values. */
export const startingState: EvalState = Object.freeze({
  theme: "system",
  textSize: "medium",
  density: "comfortable",
  reducedMotion: false,
  marketingNotifications: true,
  productUpdateNotifications: true,
  securityNotifications: true,
  notificationVolume: 6,
  usageAnalytics: true,
  personalizedAds: true,
  profileVisibility: "connections",
  locationSharing: true,
  accentColor: "blue",
  sidebarPosition: "left",
  highContrast: false,
  screenReaderHints: false,
  keyboardNavigation: false,
  colorVisionMode: "none",
  autoplayMedia: true,
  directMessageNotifications: true,
  mentionNotifications: true,
  groupNotifications: true,
  notificationSound: true,
  notificationBadges: true,
  readReceipts: true,
  activityStatus: true,
  crashReports: true,
  thirdPartyDataSharing: false,
});
