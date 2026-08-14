import { describe, expect, it, vi } from "vitest";
import { createOpenPrefs } from "../../src/index";
import { createMessyAppAdapter, messyAppPreferences } from "../adapters/messyAppAdapter";
import { createMessyApp } from "../apps/messyApp/app";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("section 13: partial-read degradation", () => {
  it("applies a write-only preference without inventing a confirmation preview value", async () => {
    const app = createMessyApp();
    const adapter = createMessyAppAdapter(app);
    const update = vi.spyOn(app.remote, "update");
    const resolver = new ScriptedResolver({
      "enable diagnostic uploads": {
        status: "resolved",
        changes: [{ id: "diagnosticUploadsEnabled", value: true }],
      },
    });
    const openPrefs = createOpenPrefs({
      preferences: messyAppPreferences,
      adapter,
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(adapter.read?.(["diagnosticUploadsEnabled"])).resolves.toEqual({});

    const requested = await openPrefs.request("enable diagnostic uploads");

    expect(Object.hasOwn(resolver.inputs[0]?.current ?? {}, "diagnosticUploadsEnabled")).toBe(
      false,
    );
    expect(requested).toEqual({
      status: "confirmation_required",
      proposal: { changes: [{ id: "diagnosticUploadsEnabled", value: true }] },
      requiredBy: ["diagnosticUploadsEnabled"],
    });
    expect(update).not.toHaveBeenCalled();
    if (requested.status !== "confirmation_required") {
      return;
    }

    await expect(openPrefs.confirm(requested.proposal)).resolves.toEqual({
      status: "applied",
      applied: [{ id: "diagnosticUploadsEnabled", value: true }],
    });
    expect(update).toHaveBeenCalledWith({ diagnosticUploadsEnabled: true });
    await expect(app.remote.get(["diagnosticUploadsEnabled"])).resolves.toEqual({});
  });
});
