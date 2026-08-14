import { definePreferences, type PreferencesAdapter } from "../../src/index";
import {
  type MessyApp,
  type MessyFontSize,
  type MessyRemotePreferenceId,
  type MessyTheme,
  readFontSize,
  readShowTips,
  readSidebarWidth,
  writeFontSize,
  writeShowTips,
  writeSidebarWidth,
} from "../apps/messyApp/app";

/** Manifest layered over all four of the messy host application's settings mechanisms. */
export const messyAppPreferences = definePreferences({
  theme: {
    type: "string",
    description: "The application color theme.",
    enum: ["light", "dark", "system"],
  },
  compactMode: {
    type: "boolean",
    description: "Whether the application uses a compact layout.",
  },
  reducedMotion: {
    type: "boolean",
    description: "Whether nonessential motion is reduced.",
  },
  fontSize: {
    type: "string",
    description: "The reading text size.",
    enum: ["small", "medium", "large"],
  },
  showTips: {
    type: "boolean",
    description: "Whether onboarding tips appear in the interface.",
  },
  sidebarWidth: {
    type: "number",
    description: "The sidebar width in pixels.",
    minimum: 180,
    maximum: 480,
  },
  notifyDirectMessages: {
    type: "boolean",
    description: "Whether direct-message notifications are enabled.",
  },
  notifyMentions: {
    type: "boolean",
    description: "Whether mention notifications are enabled.",
  },
  notifyComments: {
    type: "boolean",
    description: "Whether comment notifications are enabled.",
  },
  notifyFollows: {
    type: "boolean",
    description: "Whether new-follower notifications are enabled.",
  },
  notifyMarketing: {
    type: "boolean",
    description: "Whether product and marketing notifications are enabled.",
  },
  digestFrequencyHours: {
    type: "number",
    description: "The number of hours between notification digests.",
    minimum: 1,
    maximum: 168,
  },
  diagnosticUploadsEnabled: {
    type: "boolean",
    description: "Whether diagnostic data may be uploaded.",
    openPrefs: { sensitive: true, confirmation: "required" },
  },
  highContrast: {
    type: "boolean",
    description: "Whether the accessibility context uses high contrast.",
  },
  readingGuide: {
    type: "boolean",
    description: "Whether the accessibility context shows a reading guide.",
  },
});

const remoteIds: ReadonlySet<string> = new Set([
  "notifyDirectMessages",
  "notifyMentions",
  "notifyComments",
  "notifyFollows",
  "notifyMarketing",
  "digestFrequencyHours",
  "diagnosticUploadsEnabled",
]);

function isRemoteId(id: string): id is MessyRemotePreferenceId {
  return remoteIds.has(id);
}

function isTheme(value: unknown): value is MessyTheme {
  return value === "light" || value === "dark" || value === "system";
}

function isFontSize(value: unknown): value is MessyFontSize {
  return value === "small" || value === "medium" || value === "large";
}

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : "The host setting update failed.";
}

/**
 * Creates glue for the messy host application's four unrelated settings mechanisms.
 *
 * This intentionally ugly switch is section 38 glue. Do not "clean it up" into a shared settings
 * abstraction or migrate the host application's existing architecture to suit OpenPrefs.
 */
export function createMessyAppAdapter(app: MessyApp): PreferencesAdapter {
  return {
    async read(ids) {
      const current: Record<string, unknown> = {};
      const store = app.store.getState();
      const context = app.getAccessibilityContext();
      const requestedRemoteIds: MessyRemotePreferenceId[] = [];

      for (const id of ids) {
        switch (id) {
          case "theme":
            current.theme = store.theme;
            break;
          case "compactMode":
            current.compactMode = store.compactMode;
            break;
          case "reducedMotion":
            current.reducedMotion = store.reducedMotion;
            break;
          case "fontSize":
            current.fontSize = readFontSize(app.storage);
            break;
          case "showTips":
            current.showTips = readShowTips(app.storage);
            break;
          case "sidebarWidth":
            current.sidebarWidth = readSidebarWidth(app.storage);
            break;
          case "highContrast":
            current.highContrast = context.highContrast;
            break;
          case "readingGuide":
            current.readingGuide = context.readingGuide;
            break;
          default:
            if (isRemoteId(id)) {
              requestedRemoteIds.push(id);
            }
        }
      }

      const remote = await app.remote.get(requestedRemoteIds);
      return { ...current, ...remote };
    },

    async apply(changes) {
      const failed: { readonly id: string; readonly reason: string }[] = [];

      for (const { id, value } of changes) {
        try {
          switch (id) {
            case "theme":
              if (!isTheme(value)) {
                throw new TypeError("The host received an invalid theme.");
              }
              app.store.setTheme(value);
              break;
            case "compactMode":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid compact-mode value.");
              }
              app.store.setCompactMode(value);
              break;
            case "reducedMotion":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid reduced-motion value.");
              }
              app.store.setReducedMotion(value);
              break;
            case "fontSize":
              if (!isFontSize(value)) {
                throw new TypeError("The host received an invalid font size.");
              }
              writeFontSize(app.storage, value);
              break;
            case "showTips":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid tips value.");
              }
              writeShowTips(app.storage, value);
              break;
            case "sidebarWidth":
              if (typeof value !== "number") {
                throw new TypeError("The host received an invalid sidebar width.");
              }
              writeSidebarWidth(app.storage, value);
              break;
            case "notifyDirectMessages":
            case "notifyMentions":
            case "notifyComments":
            case "notifyFollows":
            case "notifyMarketing":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid notification value.");
              }
              await app.remote.update({ [id]: value });
              break;
            case "digestFrequencyHours":
              if (typeof value !== "number") {
                throw new TypeError("The host received an invalid digest frequency.");
              }
              await app.remote.update({ digestFrequencyHours: value });
              break;
            case "diagnosticUploadsEnabled":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid diagnostic-upload value.");
              }
              await app.remote.update({ diagnosticUploadsEnabled: value });
              break;
            case "highContrast":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid high-contrast value.");
              }
              app.getAccessibilityContext().setHighContrast(value);
              break;
            case "readingGuide":
              if (typeof value !== "boolean") {
                throw new TypeError("The host received an invalid reading-guide value.");
              }
              app.getAccessibilityContext().setReadingGuide(value);
              break;
            default:
              throw new Error("The host does not expose this setting.");
          }
        } catch (error) {
          failed.push({ id, reason: failureReason(error) });
        }
      }

      return { failed };
    },
  };
}
