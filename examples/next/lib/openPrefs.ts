import "server-only";

import {
  createOpenPrefs,
  definePreferences,
  type PreferencesAdapter,
  type PreferencesResolver,
} from "openprefs";
import { readSettings, updateSettings } from "./settings";

/** Manifest selected by the host application for natural-language control. */
export const preferences = definePreferences({
  theme: {
    type: "string",
    label: "Appearance",
    description: "Application color theme or appearance mode.",
    enum: ["light", "dark", "system"],
  },
  compactMode: {
    type: "boolean",
    label: "Compact mode",
    description: "Whether the application uses a compact, dense layout.",
  },
  marketingNotifications: {
    type: "boolean",
    label: "Marketing notifications",
    description: "Whether marketing and promotional notifications are sent.",
    openPrefs: { confirmation: "required" },
  },
  usageAnalytics: {
    type: "boolean",
    label: "Usage analytics",
    description: "Whether anonymous usage analytics and telemetry are shared.",
    openPrefs: { sensitive: true },
  },
  profileVisibility: {
    type: "string",
    label: "Profile visibility",
    description: "Who can see the profile: public, connections, or private.",
    enum: ["public", "connections", "private"],
  },
});

const adapter: PreferencesAdapter<typeof preferences> = {
  read() {
    return readSettings();
  },
  apply(changes) {
    for (const change of changes) {
      switch (change.id) {
        case "theme":
          updateSettings({ theme: change.value });
          break;
        case "compactMode":
          updateSettings({ compactMode: change.value });
          break;
        case "marketingNotifications":
          updateSettings({ marketingNotifications: change.value });
          break;
        case "usageAnalytics":
          updateSettings({ usageAnalytics: change.value });
          break;
        case "profileVisibility":
          updateSettings({ profileVisibility: change.value });
          break;
      }
    }
    return { ok: true };
  },
};

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

const serverResolver: PreferencesResolver = {
  async resolve({ text }) {
    const normalized = text.toLowerCase();
    const changes: { id: string; value: boolean | string | number }[] = [];
    const enables = includesAny(normalized, ["enable", " on", "allow"]);
    const disables = includesAny(normalized, ["disable", " off", "stop", "no "]);

    const themeValues = ["light", "dark", "system"];
    if (
      normalized.includes("theme") ||
      (normalized.includes("mode") && themeValues.some((value) => normalized.includes(value)))
    ) {
      const values = themeValues.filter((value) => normalized.includes(value));
      if (values.length !== 1 || values[0] === undefined) {
        return { status: "needs_clarification", question: "Which theme should be used?" };
      }
      changes.push({ id: "theme", value: values[0] });
    }
    if (normalized.includes("compact") || normalized.includes("dense")) {
      changes.push({ id: "compactMode", value: !disables });
    }
    if (normalized.includes("marketing") || normalized.includes("promotion")) {
      if (enables === disables) {
        return {
          status: "needs_clarification",
          question: "Should marketing notifications be on or off?",
        };
      }
      changes.push({ id: "marketingNotifications", value: enables });
    }
    if (normalized.includes("analytics") || normalized.includes("telemetry")) {
      if (enables === disables) {
        return {
          status: "needs_clarification",
          question: "Should usage analytics be on or off?",
        };
      }
      changes.push({ id: "usageAnalytics", value: enables });
    }
    if (normalized.includes("profile")) {
      const values = ["public", "connections", "private"].filter((value) =>
        normalized.includes(value),
      );
      if (values.length !== 1 || values[0] === undefined) {
        return {
          status: "needs_clarification",
          question: "Should the profile be public, connections-only, or private?",
        };
      }
      changes.push({ id: "profileVisibility", value: values[0] });
    }

    return changes.length === 0 ? { status: "unsupported" } : { status: "resolved", changes };
  },
};

/** Server-only OpenPrefs instance used by the route handler. */
export const openPrefs = createOpenPrefs({ preferences, adapter, resolver: serverResolver });
