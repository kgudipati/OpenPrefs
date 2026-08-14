import { describe, expect, it } from "vitest";
import { createOpenPrefs, type PreferencesAdapter } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import { createSyncStoreAdapter, syncStorePreferences } from "../adapters/syncStoreAdapter";
import { createMessyApp, readFontSize } from "../apps/messyApp/app";
import { resetSyncSettings, syncSettingsStore } from "../apps/syncStore/store";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("sections 13 and 29: relative change", () => {
  it("supplies the sync-store app's medium value before resolving large", async () => {
    resetSyncSettings({ fontSize: "medium" });
    const resolver = new ScriptedResolver({
      "make the text bigger": {
        status: "resolved",
        changes: [{ id: "fontSize", value: "large" }],
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter: createSyncStoreAdapter(),
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("make the text bigger")).resolves.toMatchObject({
      status: "applied",
    });
    expect(resolver.inputs[0]?.current?.fontSize).toBe("medium");
    expect(syncSettingsStore.getState().fontSize).toBe("large");
  });

  it("degrades to clarification when the same sync-store adapter has no read path", async () => {
    resetSyncSettings({ fontSize: "medium" });
    const fullAdapter = createSyncStoreAdapter();
    const readlessAdapter: PreferencesAdapter<typeof syncStorePreferences> = {
      apply: (changes) => fullAdapter.apply(changes),
    };
    const resolver = new ScriptedResolver({
      "make the text bigger": {
        status: "needs_clarification",
        question: "What text size should I use?",
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: syncStorePreferences,
      adapter: readlessAdapter,
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("make the text bigger")).resolves.toEqual({
      status: "needs_clarification",
      question: "What text size should I use?",
    });
    expect(Object.hasOwn(resolver.inputs[0] ?? {}, "current")).toBe(false);
    expect(syncSettingsStore.getState().fontSize).toBe("medium");
  });

  it("parses the messy app's serialized medium value before resolving large", async () => {
    const app = createMessyApp();
    const resolver = new ScriptedResolver({
      "make the text bigger": {
        status: "resolved",
        changes: [{ id: "fontSize", value: "large" }],
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter: createMessyAppAdapter(app),
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("make the text bigger")).resolves.toMatchObject({
      status: "applied",
    });
    expect(resolver.inputs[0]?.current?.fontSize).toBe("medium");
    expect(readFontSize(app.storage)).toBe("large");
  });
});
