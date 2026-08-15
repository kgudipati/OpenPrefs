/** Settings state owned by the existing Next.js application. */
export interface AppSettings {
  readonly theme: "light" | "dark" | "system";
  readonly compactMode: boolean;
  readonly marketingNotifications: boolean;
  readonly usageAnalytics: boolean;
  readonly profileVisibility: "public" | "connections" | "private";
}

let state: AppSettings = {
  theme: "system",
  compactMode: false,
  marketingNotifications: true,
  usageAnalytics: false,
  profileVisibility: "connections",
};

/** Returns the server-owned settings snapshot. */
export function readSettings(): AppSettings {
  return { ...state };
}

/**
 * Applies settings through the application's pre-existing mutation path.
 *
 * Both conventional controls and the OpenPrefs adapter call this function.
 */
export function updateSettings(changes: Partial<AppSettings>): AppSettings {
  state = { ...state, ...changes };
  return readSettings();
}
