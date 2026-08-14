import { describe, expect, it } from "vitest";
import { createOpenPrefs, type PreferencesAdapter } from "../../src/index";
import { syncStorePreferences } from "../adapters/syncStoreAdapter";
import { resetSyncSettings, syncSettingsStore } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("the ApplyResult failure-reporting limitation", () => {
  it("documents the silent no-op adapter trap", async () => {
    resetSyncSettings({ theme: "light" });
    const silentNoOpAdapter: PreferencesAdapter = {
      async apply() {
        return {};
      },
    };
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter: silentNoOpAdapter,
      resolver: new ScriptedResolver({
        "use dark mode": {
          status: "resolved",
          changes: [{ id: "theme", value: "dark" }],
        },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("use dark mode")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "theme", value: "dark" }],
    });
    expect(syncSettingsStore.getState().theme).toBe("light");
  });
});
