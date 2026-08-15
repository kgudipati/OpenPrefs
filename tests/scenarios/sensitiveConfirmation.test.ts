import { describe, expect, it, vi } from "vitest";
import { createOpenPrefs, definePreferences, type PreferencesAdapter } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import { createMessyApp } from "../apps/messyApp/app";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

const sensitiveRequest = {
  "enable diagnostic uploads": {
    status: "resolved" as const,
    changes: [{ id: "diagnosticUploadsEnabled", value: true }],
  },
};

describe("section 32: sensitive preference confirmation", () => {
  it("forces confirmation under never when the sensitive preference is explicitly required", async () => {
    const app = createMessyApp();
    const update = vi.spyOn(app.remote, "update");
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter: createMessyAppAdapter(app),
      resolver: new ScriptedResolver(sensitiveRequest),
      policy: { confirmation: "never" },
    });

    const result = await openPrefs.request("enable diagnostic uploads");

    expect(result).toEqual({
      status: "confirmation_required",
      proposal: { changes: [{ id: "diagnosticUploadsEnabled", value: true }] },
      requiredBy: ["diagnosticUploadsEnabled"],
      exceedsChangeLimit: false,
    });
    expect(update).not.toHaveBeenCalled();
    if (result.status !== "confirmation_required") {
      return;
    }

    await expect(openPrefs.confirm(result.proposal)).resolves.toMatchObject({ status: "applied" });
    expect(update).toHaveBeenCalledWith({ diagnosticUploadsEnabled: true });
  });

  it("documents that sensitivity alone does not override global never", async () => {
    const app = createMessyApp();
    const sensitiveOnlyPreferences = definePreferences({
      diagnosticUploadsEnabled: {
        type: "boolean",
        description: "Whether diagnostic data may be uploaded.",
        openPrefs: { sensitive: true },
      },
    });
    const messyAdapter = createMessyAppAdapter(app);
    const sensitiveOnlyAdapter: PreferencesAdapter<typeof sensitiveOnlyPreferences> = {
      apply: (changes) => messyAdapter.apply(changes),
    };
    const openPrefs = createOpenPrefs({
      preferences: sensitiveOnlyPreferences,
      adapter: sensitiveOnlyAdapter,
      resolver: new ScriptedResolver(sensitiveRequest),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("enable diagnostic uploads")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "diagnosticUploadsEnabled", value: true }],
    });
  });
});
