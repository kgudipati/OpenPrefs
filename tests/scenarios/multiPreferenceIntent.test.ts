import { describe, expect, it } from "vitest";
import { createOpenPrefs, type PreferenceChange } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import {
  createServerBackedAdapter,
  serverBackedPreferences,
} from "../adapters/serverBackedAdapter";
import { createMessyApp } from "../apps/messyApp/app";
import { FakeSettingsServer, ServerSettingsClient } from "../apps/serverBacked/settingsApi";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

const directMessagesOnly: readonly PreferenceChange[] = [
  { id: "notifyDirectMessages", value: true },
  { id: "notifyMentions", value: false },
  { id: "notifyComments", value: false },
  { id: "notifyFollows", value: false },
  { id: "notifyMarketing", value: false },
];

describe("section 27: multi-preference intent", () => {
  it("turns one notification on and four off in the server-backed app", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));
    const openPrefs = createOpenPrefs({
      preferences: serverBackedPreferences,
      adapter: createServerBackedAdapter(client),
      resolver: new ScriptedResolver({
        "only notify me for DMs": { status: "resolved", changes: directMessagesOnly },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("only notify me for DMs")).resolves.toEqual({
      status: "applied",
      applied: directMessagesOnly,
    });
    await expect(
      client.get([
        "notifyDirectMessages",
        "notifyMentions",
        "notifyComments",
        "notifyFollows",
        "notifyMarketing",
      ]),
    ).resolves.toEqual({
      notifyDirectMessages: true,
      notifyMentions: false,
      notifyComments: false,
      notifyFollows: false,
      notifyMarketing: false,
    });
  });

  it("turns one notification on and four off in the messy app", async () => {
    const app = createMessyApp();
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter: createMessyAppAdapter(app),
      resolver: new ScriptedResolver({
        "only notify me for DMs": { status: "resolved", changes: directMessagesOnly },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("only notify me for DMs")).resolves.toEqual({
      status: "applied",
      applied: directMessagesOnly,
    });
    await expect(
      app.remote.get([
        "notifyDirectMessages",
        "notifyMentions",
        "notifyComments",
        "notifyFollows",
        "notifyMarketing",
      ]),
    ).resolves.toEqual({
      notifyDirectMessages: true,
      notifyMentions: false,
      notifyComments: false,
      notifyFollows: false,
      notifyMarketing: false,
    });
  });
});
