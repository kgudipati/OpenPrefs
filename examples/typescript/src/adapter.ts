import type { PreferencesAdapter } from "openprefs";
import type { preferences } from "./manifest.js";
import { settingsStore } from "./settings.js";

/** Bridges OpenPrefs to the same setters the application already uses. */
export const settingsAdapter: PreferencesAdapter<typeof preferences> = {
  read() {
    return settingsStore.getState();
  },
  apply(changes) {
    for (const change of changes) {
      switch (change.id) {
        case "theme":
          settingsStore.setTheme(change.value);
          break;
        case "textSize":
          settingsStore.setTextSize(change.value);
          break;
        case "density":
          settingsStore.setDensity(change.value);
          break;
        case "reducedMotion":
          settingsStore.setReducedMotion(change.value);
          break;
        case "marketingNotifications":
          settingsStore.setMarketingNotifications(change.value);
          break;
        case "productUpdateNotifications":
          settingsStore.setProductUpdateNotifications(change.value);
          break;
        case "securityNotifications":
          settingsStore.setSecurityNotifications(change.value);
          break;
        case "notificationVolume":
          settingsStore.setNotificationVolume(change.value);
          break;
        case "usageAnalytics":
          settingsStore.setUsageAnalytics(change.value);
          break;
        case "personalizedAds":
          settingsStore.setPersonalizedAds(change.value);
          break;
        case "profileVisibility":
          settingsStore.setProfileVisibility(change.value);
          break;
        case "locationSharing":
          settingsStore.setLocationSharing(change.value);
          break;
      }
    }
    return { ok: true };
  },
};
