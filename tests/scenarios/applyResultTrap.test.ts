import { describe, expect, it } from "vitest";
import { createOpenPrefs, type PreferencesAdapter, parsePreferencesJson } from "../../src/index";
import { createMessyAppAdapter } from "../adapters/messyAppAdapter";
import { syncStorePreferences } from "../adapters/syncStoreAdapter";
import { createMessyApp } from "../apps/messyApp/app";
import { resetSyncSettings, syncSettingsStore } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("the explicit ApplyResult acknowledgement", () => {
  it("closes the silent no-op adapter trap", async () => {
    resetSyncSettings({ theme: "light" });
    const silentNoOpAdapter = {
      async apply() {
        return {};
      },
    };
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      // @ts-expect-error the malformed boundary deliberately omits the required acknowledgement.
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
      status: "failed",
      error: "Adapter returned a malformed apply result.",
      applied: [],
      failed: [{ id: "theme", reason: "Adapter returned a malformed apply result." }],
    });
    expect(syncSettingsStore.getState().theme).toBe("light");
  });

  it("reports a manifest preference omitted by the host adapter as failed", async () => {
    const preferences = parsePreferencesJson({
      version: 1,
      preferences: {
        futurePreference: {
          type: "boolean",
          description: "A preference added after the host adapter was written.",
        },
      },
    });
    const messyAppAdapter = createMessyAppAdapter(createMessyApp());
    const adapter: PreferencesAdapter<typeof preferences> = {
      apply(changes) {
        return Reflect.apply(messyAppAdapter.apply, messyAppAdapter, [changes]);
      },
    };
    const openPrefs = createOpenPrefs({
      preferences,
      adapter,
      resolver: new ScriptedResolver({}),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.apply([{ id: "futurePreference", value: true }])).resolves.toEqual({
      status: "failed",
      error: "The adapter reported one or more failed preference changes.",
      applied: [],
      failed: [
        {
          id: "futurePreference",
          reason: "The host adapter does not handle this preference.",
        },
      ],
    });
  });
});
