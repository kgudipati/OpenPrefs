import { definePreferences, type PreferencesAdapter } from "../../src/index";
import type {
  ServerPreferenceId,
  ServerSettings,
  ServerSettingsClient,
} from "../apps/serverBacked/settingsApi";

/** Manifest layered over the server-backed host application's existing settings. */
export const serverBackedPreferences = definePreferences({
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
});

function isServerPreferenceId(id: string): id is ServerPreferenceId {
  return serverBackedPreferences.has(id);
}

/** Creates glue for the server-backed host application's existing async API client. */
export function createServerBackedAdapter(client: ServerSettingsClient): PreferencesAdapter {
  return {
    async read(ids) {
      return client.get(ids.filter(isServerPreferenceId));
    },

    async apply(changes) {
      let update: Partial<ServerSettings> = {};
      const failed: { readonly id: string; readonly reason: string }[] = [];

      for (const { id, value } of changes) {
        switch (id) {
          case "notifyDirectMessages":
          case "notifyMentions":
          case "notifyComments":
          case "notifyFollows":
          case "notifyMarketing":
            if (typeof value === "boolean") {
              update = { ...update, [id]: value };
            } else {
              failed.push({ id, reason: "The host received a non-boolean notification value." });
            }
            break;
          case "digestFrequencyHours":
            if (typeof value === "number") {
              update = { ...update, digestFrequencyHours: value };
            } else {
              failed.push({ id, reason: "The host received a non-numeric digest frequency." });
            }
            break;
          default:
            failed.push({ id, reason: "The host does not expose this setting." });
        }
      }

      const response = await client.update(update);
      return { failed: [...failed, ...response.rejected] };
    },
  };
}
