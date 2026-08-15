import {
  setDirectMessageNotifications,
  setProfileVisibility,
  setTextSize,
  setTheme,
} from "./settingsStore";

/** Metadata consumed by the application's existing settings-page renderer. */
export const settingsControls = [
  {
    id: "theme",
    label: "Color theme",
    help: "Choose a light, dark, or system-matched application appearance.",
    values: ["light", "dark", "system"],
    onChange: setTheme,
  },
  {
    id: "textSize",
    label: "Text size",
    help: "Choose small, medium, or large text throughout the interface.",
    values: ["small", "medium", "large"],
    onChange: setTextSize,
  },
  {
    id: "directMessageNotifications",
    label: "Direct message notifications",
    help: "Send a notification when someone sends you a direct message.",
    onChange: setDirectMessageNotifications,
  },
  {
    id: "profileVisibility",
    label: "Profile visibility",
    help: "Choose whether anyone, your connections, or only you can view your profile.",
    values: ["public", "connections", "private"],
    onChange: setProfileVisibility,
  },
] as const;
