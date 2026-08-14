/** Complete state owned by the example application's existing settings module. */
export interface AppSettings {
  readonly theme: "light" | "dark" | "system";
  readonly textSize: "small" | "medium" | "large";
  readonly density: "comfortable" | "compact";
  readonly reducedMotion: boolean;
  readonly marketingNotifications: boolean;
  readonly productUpdateNotifications: boolean;
  readonly securityNotifications: boolean;
  readonly notificationVolume: number;
  readonly usageAnalytics: boolean;
  readonly personalizedAds: boolean;
  readonly profileVisibility: "public" | "connections" | "private";
  readonly locationSharing: boolean;
}

const defaults: AppSettings = {
  theme: "system",
  textSize: "medium",
  density: "comfortable",
  reducedMotion: false,
  marketingNotifications: true,
  productUpdateNotifications: true,
  securityNotifications: true,
  notificationVolume: 6,
  usageAnalytics: false,
  personalizedAds: false,
  profileVisibility: "connections",
  locationSharing: false,
};

/** Host-owned settings store used before OpenPrefs is introduced. */
export class AppSettingsStore {
  #state: AppSettings = defaults;

  /** Returns a detached snapshot of the application's current settings. */
  getState(): AppSettings {
    return { ...this.#state };
  }

  /** Changes the application theme through the existing host path. */
  setTheme(value: AppSettings["theme"]): void {
    this.#state = { ...this.#state, theme: value };
  }

  /** Changes the interface text size through the existing host path. */
  setTextSize(value: AppSettings["textSize"]): void {
    this.#state = { ...this.#state, textSize: value };
  }

  /** Changes layout density through the existing host path. */
  setDensity(value: AppSettings["density"]): void {
    this.#state = { ...this.#state, density: value };
  }

  /** Changes reduced-motion behavior through the existing host path. */
  setReducedMotion(value: boolean): void {
    this.#state = { ...this.#state, reducedMotion: value };
  }

  /** Changes marketing notification delivery through the existing host path. */
  setMarketingNotifications(value: boolean): void {
    this.#state = { ...this.#state, marketingNotifications: value };
  }

  /** Changes product-update notification delivery through the existing host path. */
  setProductUpdateNotifications(value: boolean): void {
    this.#state = { ...this.#state, productUpdateNotifications: value };
  }

  /** Changes security notification delivery through the existing host path. */
  setSecurityNotifications(value: boolean): void {
    this.#state = { ...this.#state, securityNotifications: value };
  }

  /** Changes notification volume through the existing host path. */
  setNotificationVolume(value: number): void {
    this.#state = { ...this.#state, notificationVolume: value };
  }

  /** Changes anonymous analytics sharing through the existing host path. */
  setUsageAnalytics(value: boolean): void {
    this.#state = { ...this.#state, usageAnalytics: value };
  }

  /** Changes advertising personalization through the existing host path. */
  setPersonalizedAds(value: boolean): void {
    this.#state = { ...this.#state, personalizedAds: value };
  }

  /** Changes profile visibility through the existing host path. */
  setProfileVisibility(value: AppSettings["profileVisibility"]): void {
    this.#state = { ...this.#state, profileVisibility: value };
  }

  /** Changes location sharing through the existing host path. */
  setLocationSharing(value: boolean): void {
    this.#state = { ...this.#state, locationSharing: value };
  }
}

/** Singleton settings instance owned by the example application. */
export const settingsStore = new AppSettingsStore();
