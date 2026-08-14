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
import { resetSyncSettings } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("section 31: unsupported input", () => {
  it("does not invent a sync-store preference", async () => {
    resetSyncSettings();
    const adapter = createSyncStoreAdapter();
    const apply = vi.spyOn(adapter, "apply");
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter,
      resolver: new ScriptedResolver({ "book me a flight": { status: "unsupported" } }),
    });

    await expect(openPrefs.request("book me a flight")).resolves.toEqual({
      status: "unsupported",
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not invent a server-backed preference", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));
    const adapter = createServerBackedAdapter(client);
    const apply = vi.spyOn(adapter, "apply");
    const openPrefs = createOpenPrefs({
      preferences: serverBackedPreferences,
      adapter,
      resolver: new ScriptedResolver({ "book me a flight": { status: "unsupported" } }),
    });

    await expect(openPrefs.request("book me a flight")).resolves.toEqual({
      status: "unsupported",
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not invent a messy-app preference", async () => {
    const app = createMessyApp();
    const adapter = createMessyAppAdapter(app);
    const apply = vi.spyOn(adapter, "apply");
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter,
      resolver: new ScriptedResolver({ "book me a flight": { status: "unsupported" } }),
    });

    await expect(openPrefs.request("book me a flight")).resolves.toEqual({
      status: "unsupported",
    });
    expect(apply).not.toHaveBeenCalled();
  });
});
