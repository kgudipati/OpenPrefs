import { describe, expect, it } from "vitest";
import { createOpenPrefs } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import {
  createServerBackedAdapter,
  serverBackedPreferences,
} from "../adapters/serverBackedAdapter";
import { createSyncStoreAdapter, syncStorePreferences } from "../adapters/syncStoreAdapter";
import { createMessyApp, readShowTips } from "../apps/messyApp/app";
import { FakeSettingsServer, ServerSettingsClient } from "../apps/serverBacked/settingsApi";
import { resetSyncSettings, syncSettingsStore } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("section 28: goal-oriented intent", () => {
  it("uses the sync-store app's compact layout to reduce distraction", async () => {
    resetSyncSettings();
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter: createSyncStoreAdapter(),
      resolver: new ScriptedResolver({
        "make the app less distracting": {
          status: "resolved",
          changes: [{ id: "compactMode", value: true }],
        },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("make the app less distracting")).resolves.toMatchObject({
      status: "applied",
    });
    expect(syncSettingsStore.getState().compactMode).toBe(true);
  });

  it("reduces low-value notifications in the server-backed app", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));
    const openPrefs = createOpenPrefs({
      preferences: serverBackedPreferences,
      adapter: createServerBackedAdapter(client),
      resolver: new ScriptedResolver({
        "make the app less distracting": {
          status: "resolved",
          changes: [
            { id: "notifyFollows", value: false },
            { id: "notifyMarketing", value: false },
            { id: "digestFrequencyHours", value: 48 },
          ],
        },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("make the app less distracting")).resolves.toMatchObject({
      status: "applied",
    });
    await expect(
      client.get(["notifyFollows", "notifyMarketing", "digestFrequencyHours"]),
    ).resolves.toEqual({
      notifyFollows: false,
      notifyMarketing: false,
      digestFrequencyHours: 48,
    });
  });

  it("crosses three existing mechanisms in the messy app", async () => {
    const app = createMessyApp();
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter: createMessyAppAdapter(app),
      resolver: new ScriptedResolver({
        "make the app less distracting": {
          status: "resolved",
          changes: [
            { id: "reducedMotion", value: true },
            { id: "showTips", value: false },
            { id: "notifyMarketing", value: false },
          ],
        },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("make the app less distracting")).resolves.toMatchObject({
      status: "applied",
    });
    expect(app.store.getState().reducedMotion).toBe(true);
    expect(readShowTips(app.storage)).toBe(false);
    await expect(app.remote.get(["notifyMarketing"])).resolves.toEqual({
      notifyMarketing: false,
    });
  });
});
