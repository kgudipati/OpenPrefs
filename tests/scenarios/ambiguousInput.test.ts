import { describe, expect, it, vi } from "vitest";
import { createOpenPrefs } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import {
  createServerBackedAdapter,
  serverBackedPreferences,
} from "../adapters/serverBackedAdapter";
import { createSyncStoreAdapter, syncStorePreferences } from "../adapters/syncStoreAdapter";
import { createMessyApp } from "../apps/messyApp/app";
import { FakeSettingsServer, ServerSettingsClient } from "../apps/serverBacked/settingsApi";
import { resetSyncSettings, syncSettingsStore } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

const clarification = {
  status: "needs_clarification" as const,
  question: "Which setting should change?",
};

describe("section 30: ambiguous input", () => {
  it("does not mutate the sync-store app", async () => {
    resetSyncSettings();
    const adapter = createSyncStoreAdapter();
    const apply = vi.spyOn(adapter, "apply");
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter,
      resolver: new ScriptedResolver({ "change the app": clarification }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("change the app")).resolves.toEqual(clarification);
    expect(apply).not.toHaveBeenCalled();
    expect(syncSettingsStore.getState()).toEqual({
      theme: "system",
      fontSize: "medium",
      compactMode: false,
    });
  });

  it("does not mutate the server-backed app", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));
    const adapter = createServerBackedAdapter(client);
    const apply = vi.spyOn(adapter, "apply");
    const openPrefs = createOpenPrefs({
      preferences: serverBackedPreferences,
      adapter,
      resolver: new ScriptedResolver({ "change the app": clarification }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("change the app")).resolves.toEqual(clarification);
    expect(apply).not.toHaveBeenCalled();
    await expect(client.get(["digestFrequencyHours"])).resolves.toEqual({
      digestFrequencyHours: 24,
    });
  });

  it("does not mutate the messy app", async () => {
    const app = createMessyApp();
    const adapter = createMessyAppAdapter(app);
    const apply = vi.spyOn(adapter, "apply");
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter,
      resolver: new ScriptedResolver({ "change the app": clarification }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("change the app")).resolves.toEqual(clarification);
    expect(apply).not.toHaveBeenCalled();
    expect(app.store.getState().theme).toBe("system");
  });
});
