import { definePreferences, type PreferencesAdapter, type PreferencesState } from "../../src/index";
import { syncSettingsStore } from "../apps/syncStore/store";

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

/** Creates glue for the synchronous host application's existing singleton store. */
export function createSyncStoreAdapter(): PreferencesAdapter<typeof syncStorePreferences> {
  return {
    read(ids) {
      const state = syncSettingsStore.getState();
      const current: PreferencesState<typeof syncStorePreferences> = {};
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

    apply(changes) {
      for (const change of changes) {
        switch (change.id) {
          case "theme":
            syncSettingsStore.setTheme(change.value);
            break;
          case "fontSize":
            syncSettingsStore.setFontSize(change.value);
            break;
          case "compactMode":
            syncSettingsStore.setCompactMode(change.value);
            break;
        }
      }
      return { ok: true };
    },
  };
}
