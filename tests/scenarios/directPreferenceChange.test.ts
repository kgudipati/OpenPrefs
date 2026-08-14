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

describe("section 26: direct preference change", () => {
  it("changes the sync-store app through its existing setter", async () => {
    resetSyncSettings();
    const resolver = new ScriptedResolver({
      "use dark mode": {
        status: "resolved",
        changes: [{ id: "theme", value: "dark" }],
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter: createSyncStoreAdapter(),
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("use dark mode")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "theme", value: "dark" }],
    });
    expect(syncSettingsStore.getState().theme).toBe("dark");
  });

  it("changes the server-backed app through its existing API client", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));
    const resolver = new ScriptedResolver({
      "send a digest every 8 hours": {
        status: "resolved",
        changes: [{ id: "digestFrequencyHours", value: 8 }],
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: serverBackedPreferences,
      adapter: createServerBackedAdapter(client),
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("send a digest every 8 hours")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "digestFrequencyHours", value: 8 }],
    });
    await expect(client.get(["digestFrequencyHours"])).resolves.toEqual({
      digestFrequencyHours: 8,
    });
  });

  it("changes the messy app through its serialized storage helper", async () => {
    const app = createMessyApp();
    const resolver = new ScriptedResolver({
      "hide onboarding tips": {
        status: "resolved",
        changes: [{ id: "showTips", value: false }],
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter: createMessyAppAdapter(app),
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("hide onboarding tips")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "showTips", value: false }],
    });
    expect(readShowTips(app.storage)).toBe(false);
  });
});
