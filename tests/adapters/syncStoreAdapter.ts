import { definePreferences, type PreferenceChange, type PreferencesAdapter } from "../../src/index";
import { type FontSize, syncSettingsStore, type Theme } from "../apps/syncStore/store";

/** Manifest layered over the synchronous host application's existing settings. */
export const syncStorePreferences = definePreferences({
  theme: {
    type: "string",
    description: "The application color theme.",
    enum: ["light", "dark", "system"],
  },
  fontSize: {
    type: "string",
    description: "The application text size.",
    enum: ["small", "medium", "large"],
  },
  compactMode: {
    type: "boolean",
    description: "Whether the application uses a compact, low-clutter layout.",
  },
});

function isTheme(value: PreferenceChange["value"]): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function isFontSize(value: PreferenceChange["value"]): value is FontSize {
  return value === "small" || value === "medium" || value === "large";
}

/** Creates glue for the synchronous host application's existing singleton store. */
export function createSyncStoreAdapter(): PreferencesAdapter {
  return {
    async read(ids) {
      const state = syncSettingsStore.getState();
      const current: Record<string, unknown> = {};
      for (const id of ids) {
        switch (id) {
          case "theme":
            current.theme = state.theme;
            break;
          case "fontSize":
            current.fontSize = state.fontSize;
            break;
          case "compactMode":
            current.compactMode = state.compactMode;
            break;
        }
      }
      return current;
    },

    async apply(changes) {
      const failed: { readonly id: string; readonly reason: string }[] = [];
      for (const { id, value } of changes) {
        switch (id) {
          case "theme":
            if (isTheme(value)) {
              syncSettingsStore.setTheme(value);
            } else {
              failed.push({ id, reason: "The host received an invalid theme." });
            }
            break;
          case "fontSize":
            if (isFontSize(value)) {
              syncSettingsStore.setFontSize(value);
            } else {
              failed.push({ id, reason: "The host received an invalid font size." });
            }
            break;
          case "compactMode":
            if (typeof value === "boolean") {
              syncSettingsStore.setCompactMode(value);
            } else {
              failed.push({ id, reason: "The host received an invalid compact-mode value." });
            }
            break;
          default:
            failed.push({ id, reason: "The host does not expose this setting." });
        }
      }
      return { failed };
    },
  };
}
