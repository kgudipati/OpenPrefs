/** Theme values used by the messy host application's synchronous store. */
export type MessyTheme = "light" | "dark" | "system";

/** Font-size values serialized by the messy host application. */
export type MessyFontSize = "small" | "medium" | "large";

/** State owned by the messy application's synchronous settings store. */
export interface MessyStoreState {
  readonly theme: MessyTheme;
  readonly compactMode: boolean;
  readonly reducedMotion: boolean;
}

/** Minimal localStorage-shaped persistence owned by the messy host. */
export class FakeLocalStorage {
  readonly #values = new Map<string, string>();

  /** Returns a serialized value or null when the key is absent. */
  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  /** Persists an already serialized value. */
  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

/** Synchronous store used by one part of the messy host application. */
export class MessySettingsStore {
  #state: MessyStoreState = {
    theme: "system",
    compactMode: false,
    reducedMotion: false,
  };

  /** Returns the current synchronous settings snapshot. */
  getState(): MessyStoreState {
    return { ...this.#state };
  }

  /** Changes the theme through the host's existing setter. */
  setTheme(value: MessyTheme): void {
    this.#state = { ...this.#state, theme: value };
  }

  /** Changes compact mode through the host's existing setter. */
  setCompactMode(value: boolean): void {
    this.#state = { ...this.#state, compactMode: value };
  }

  /** Changes reduced motion through the host's existing setter. */
  setReducedMotion(value: boolean): void {
    this.#state = { ...this.#state, reducedMotion: value };
  }
}

const fontSizeKey = "reader.font-size";
const showTipsKey = "onboarding.show-tips";
const sidebarWidthKey = "layout.sidebar-width";

/** Reads and parses the host's serialized font-size preference. */
export function readFontSize(storage: FakeLocalStorage): MessyFontSize {
  const value = storage.getItem(fontSizeKey);
  return value === "small" || value === "large" ? value : "medium";
}

/** Serializes the host's font-size preference. */
export function writeFontSize(storage: FakeLocalStorage, value: MessyFontSize): void {
  storage.setItem(fontSizeKey, value);
}

/** Reads and parses the host's serialized tips flag. */
export function readShowTips(storage: FakeLocalStorage): boolean {
  return storage.getItem(showTipsKey) !== "false";
}

/** Serializes the host's tips flag. */
export function writeShowTips(storage: FakeLocalStorage, value: boolean): void {
  storage.setItem(showTipsKey, String(value));
}

/** Reads and parses the host's serialized sidebar width. */
export function readSidebarWidth(storage: FakeLocalStorage): number {
  const parsed = Number(storage.getItem(sidebarWidthKey));
  return Number.isFinite(parsed) && parsed >= 180 && parsed <= 480 ? parsed : 280;
}

/** Serializes the host's sidebar width. */
export function writeSidebarWidth(storage: FakeLocalStorage, value: number): void {
  storage.setItem(sidebarWidthKey, String(value));
}

/** Remote preference ids understood by the messy host's legacy API. */
export type MessyRemotePreferenceId =
  | "notifyDirectMessages"
  | "notifyMentions"
  | "notifyComments"
  | "notifyFollows"
  | "notifyMarketing"
  | "digestFrequencyHours"
  | "diagnosticUploadsEnabled";

/** Remote settings stored by the messy host application's legacy API. */
export interface MessyRemoteSettings {
  readonly notifyDirectMessages: boolean;
  readonly notifyMentions: boolean;
  readonly notifyComments: boolean;
  readonly notifyFollows: boolean;
  readonly notifyMarketing: boolean;
  readonly digestFrequencyHours: number;
  readonly diagnosticUploadsEnabled: boolean;
}

const remoteDefaults: MessyRemoteSettings = {
  notifyDirectMessages: true,
  notifyMentions: true,
  notifyComments: true,
  notifyFollows: true,
  notifyMarketing: true,
  digestFrequencyHours: 24,
  diagnosticUploadsEnabled: false,
};

/** Async client for the messy host's unrelated remote preference subsystem. */
export class MessyRemotePreferencesClient {
  #state: MessyRemoteSettings = remoteDefaults;

  /**
   * Reads remote preferences exposed by the legacy GET endpoint.
   *
   * Diagnostic uploads are deliberately omitted because the real-shaped endpoint is write-only.
   */
  async get(ids: readonly MessyRemotePreferenceId[]): Promise<Partial<MessyRemoteSettings>> {
    await Promise.resolve();
    let result: Partial<MessyRemoteSettings> = {};
    for (const id of ids) {
      if (id === "diagnosticUploadsEnabled") {
        continue;
      }
      result = { ...result, ...this.readableValueFor(id) };
    }
    return result;
  }

  /** Updates remote preferences through the existing legacy endpoint. */
  async update(changes: Partial<MessyRemoteSettings>): Promise<void> {
    await Promise.resolve();
    this.#state = { ...this.#state, ...changes };
  }

  private readableValueFor(
    id: Exclude<MessyRemotePreferenceId, "diagnosticUploadsEnabled">,
  ): Partial<MessyRemoteSettings> {
    switch (id) {
      case "notifyDirectMessages":
        return { notifyDirectMessages: this.#state.notifyDirectMessages };
      case "notifyMentions":
        return { notifyMentions: this.#state.notifyMentions };
      case "notifyComments":
        return { notifyComments: this.#state.notifyComments };
      case "notifyFollows":
        return { notifyFollows: this.#state.notifyFollows };
      case "notifyMarketing":
        return { notifyMarketing: this.#state.notifyMarketing };
      case "digestFrequencyHours":
        return { digestFrequencyHours: this.#state.digestFrequencyHours };
    }
  }
}

/** Value exposed by the messy host's context provider. */
export interface AccessibilitySettingsContext {
  readonly highContrast: boolean;
  readonly readingGuide: boolean;
  setHighContrast(value: boolean): void;
  setReadingGuide(value: boolean): void;
}

/** Creates a React-Context-shaped getter without requiring React. */
export function createAccessibilityContextGetter(): () => AccessibilitySettingsContext {
  let highContrast = false;
  let readingGuide = false;
  return () => ({
    highContrast,
    readingGuide,
    setHighContrast(value: boolean): void {
      highContrast = value;
    },
    setReadingGuide(value: boolean): void {
      readingGuide = value;
    },
  });
}

/** Independently constructed pieces of the deliberately incoherent fake application. */
export interface MessyApp {
  readonly store: MessySettingsStore;
  readonly storage: FakeLocalStorage;
  readonly remote: MessyRemotePreferencesClient;
  readonly getAccessibilityContext: () => AccessibilitySettingsContext;
}

/** Creates a fresh messy host application for a standalone or integration test. */
export function createMessyApp(): MessyApp {
  return {
    store: new MessySettingsStore(),
    storage: new FakeLocalStorage(),
    remote: new MessyRemotePreferencesClient(),
    getAccessibilityContext: createAccessibilityContextGetter(),
  };
}
