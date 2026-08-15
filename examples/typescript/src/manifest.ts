import { definePreferences } from "openprefs";

/** Preferences that the existing example application chooses to expose to OpenPrefs. */
export const preferences = definePreferences({
  theme: {
    type: "string",
    description: "Application color theme or appearance mode.",
    enum: ["light", "dark", "system"],
    default: "system",
  },
  textSize: {
    type: "string",
    description: "Interface text size, ordered from small through medium to large.",
    enum: ["small", "medium", "large"],
    default: "medium",
  },
  density: {
    type: "string",
    description: "Layout spacing density for comfortable or compact screens.",
    enum: ["comfortable", "compact"],
    default: "comfortable",
  },
  reducedMotion: {
    type: "boolean",
    description: "Whether interface animations and motion effects are reduced.",
    default: false,
  },
  marketingNotifications: {
    type: "boolean",
    description: "Whether marketing, promotional, and advertising notifications are sent.",
    default: true,
    openPrefs: { confirmation: "required" },
  },
  productUpdateNotifications: {
    type: "boolean",
    description: "Whether notifications about product news, releases, and updates are sent.",
    default: true,
  },
  securityNotifications: {
    type: "boolean",
    description: "Whether security alert notifications are sent.",
    default: true,
  },
  notificationVolume: {
    type: "number",
    description: "Notification sound volume from zero to ten.",
    minimum: 0,
    maximum: 10,
    default: 6,
  },
  usageAnalytics: {
    type: "boolean",
    description: "Whether anonymous usage analytics, telemetry, and diagnostics are shared.",
    default: false,
    openPrefs: { sensitive: true },
  },
  personalizedAds: {
    type: "boolean",
    description: "Whether advertising is personalized using activity data.",
    default: false,
  },
  profileVisibility: {
    type: "string",
    description: "Who can see the user profile: public, connections, or private.",
    enum: ["public", "connections", "private"],
    default: "connections",
  },
  locationSharing: {
    type: "boolean",
    description: "Whether approximate location is shared with the application.",
    default: false,
  },
});
