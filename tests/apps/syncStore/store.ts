/** Themes supported by the synchronous host store. */
export type Theme = "light" | "dark" | "system";

/** Font sizes supported by the synchronous host store. */
export type FontSize = "small" | "medium" | "large";

/** Complete state owned by the synchronous host store. */
export interface SyncSettingsState {
  readonly theme: Theme;
  readonly fontSize: FontSize;
  readonly compactMode: boolean;
}

/** Listener notified after the synchronous host store changes. */
export type SyncSettingsListener = (state: SyncSettingsState) => void;

const defaults: SyncSettingsState = {
  theme: "system",
  fontSize: "medium",
  compactMode: false,
};

let state: SyncSettingsState = defaults;
const listeners = new Set<SyncSettingsListener>();

function publish(): void {
  const snapshot = syncSettingsStore.getState();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

/**
 * Synchronous singleton settings store used by the fake host application.
 *
 * The shape deliberately resembles a small Zustand store without depending on Zustand.
 */
export const syncSettingsStore = {
  /** Returns the current settings snapshot. */
  getState(): SyncSettingsState {
    return { ...state };
  },

  /** Replaces the application theme. */
  setTheme(value: Theme): void {
    state = { ...state, theme: value };
    publish();
  },

  /** Replaces the application font size. */
  setFontSize(value: FontSize): void {
    state = { ...state, fontSize: value };
    publish();
  },

  /** Replaces the compact-mode flag. */
  setCompactMode(value: boolean): void {
    state = { ...state, compactMode: value };
    publish();
  },

  /** Registers a change listener and returns its unsubscribe function. */
  subscribe(listener: SyncSettingsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Restores deterministic host state between standalone and integration tests. */
export function resetSyncSettings(overrides: Partial<SyncSettingsState> = {}): void {
  state = { ...defaults, ...overrides };
  listeners.clear();
}
