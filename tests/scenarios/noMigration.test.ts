import { describe, expect, it } from "vitest";
import { createOpenPrefs } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import {
  createServerBackedAdapter,
  serverBackedPreferences,
} from "../adapters/serverBackedAdapter";
import { createSyncStoreAdapter, syncStorePreferences } from "../adapters/syncStoreAdapter";
import { createMessyApp, readFontSize, readShowTips, writeFontSize } from "../apps/messyApp/app";
import { FakeSettingsServer, ServerSettingsClient } from "../apps/serverBacked/settingsApi";
import { resetSyncSettings, syncSettingsStore } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("sections 2 and 66: attaching OpenPrefs does not migrate the host", () => {
  it("leaves the synchronous store independently functional", async () => {
    resetSyncSettings();

    {
      const resolver = new ScriptedResolver({
        "use dark mode": {
          status: "resolved",
          changes: [{ id: "theme", value: "dark" }],
        },
        "inspect current settings": { status: "unsupported" },
      });
      const adapter = createSyncStoreAdapter();
      const openPrefs = createOpenPrefs({
        preferences: syncStorePreferences,
        adapter,
        resolver,
        policy: { confirmation: "never" },
      });

      syncSettingsStore.setTheme("light");
      expect(syncSettingsStore.getState().theme).toBe("light");

      await openPrefs.request("use dark mode");
      expect(syncSettingsStore.getState().theme).toBe("dark");

      syncSettingsStore.setFontSize("large");
      await openPrefs.request("inspect current settings");
      expect(resolver.inputs[1]?.current?.fontSize).toBe("large");
    }

    syncSettingsStore.setCompactMode(true);
    expect(syncSettingsStore.getState()).toEqual({
      theme: "dark",
      fontSize: "large",
      compactMode: true,
    });
  });

  it("leaves the server-backed API client independently functional", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));

    {
      const resolver = new ScriptedResolver({
        "digest every 6 hours": {
          status: "resolved",
          changes: [{ id: "digestFrequencyHours", value: 6 }],
        },
        "inspect current settings": { status: "unsupported" },
      });
      const adapter = createServerBackedAdapter(client);
      const openPrefs = createOpenPrefs({
        preferences: serverBackedPreferences,
        adapter,
        resolver,
        policy: { confirmation: "never" },
      });

      await client.update({ notifyMarketing: false });
      await expect(client.get(["notifyMarketing"])).resolves.toEqual({ notifyMarketing: false });

      await openPrefs.request("digest every 6 hours");
      await expect(client.get(["digestFrequencyHours"])).resolves.toEqual({
        digestFrequencyHours: 6,
      });

      await client.update({ notifyMentions: false });
      await openPrefs.request("inspect current settings");
      expect(resolver.inputs[1]?.current?.notifyMentions).toBe(false);
    }

    await client.update({ notifyComments: false });
    await expect(client.get(["notifyComments"])).resolves.toEqual({ notifyComments: false });
  });

  it("leaves every messy-app mechanism independently functional", async () => {
    const app = createMessyApp();

    {
      const resolver = new ScriptedResolver({
        "hide onboarding tips": {
          status: "resolved",
          changes: [{ id: "showTips", value: false }],
        },
        "inspect current settings": { status: "unsupported" },
      });
      const adapter = createMessyAppAdapter(app);
      const openPrefs = createOpenPrefs({
        preferences: messyAppPreferences,
        adapter,
        resolver,
        policy: { confirmation: "never" },
      });

      app.store.setTheme("light");
      expect(app.store.getState().theme).toBe("light");

      await openPrefs.request("hide onboarding tips");
      expect(readShowTips(app.storage)).toBe(false);

      writeFontSize(app.storage, "large");
      await openPrefs.request("inspect current settings");
      expect(resolver.inputs[1]?.current?.fontSize).toBe("large");
    }

    app.getAccessibilityContext().setHighContrast(true);
    await app.remote.update({ notifyFollows: false });
    expect(app.getAccessibilityContext().highContrast).toBe(true);
    expect(readFontSize(app.storage)).toBe("large");
    await expect(app.remote.get(["notifyFollows"])).resolves.toEqual({ notifyFollows: false });
  });
});
