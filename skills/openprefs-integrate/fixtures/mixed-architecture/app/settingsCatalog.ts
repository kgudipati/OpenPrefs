/** User-facing copy consumed by settings controls implemented in separate feature modules. */
export const settingsCopy = {
  theme: {
    label: "Color theme",
    help: "Use a light, dark, or system-matched application appearance.",
  },
  textSize: {
    label: "Reading text size",
    help: "Choose small, medium, or large text in the reader.",
  },
  profileVisibility: {
    label: "Profile visibility",
    help: "Choose whether anyone, your connections, or only you can view your profile.",
  },
  highContrast: {
    label: "High contrast",
    help: "Increase interface contrast for accessibility.",
  },
} as const;

/** The legacy tracking toggle is visible but supplies only a machine key. */
export const legacyTrackingControl = { key: "trackingEnabled", kind: "toggle" } as const;
