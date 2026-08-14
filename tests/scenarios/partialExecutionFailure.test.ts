import { describe, expect, it } from "vitest";
import { createOpenPrefs } from "../../src/index";
import {
  createServerBackedAdapter,
  serverBackedPreferences,
} from "../adapters/serverBackedAdapter";
import { FakeSettingsServer, ServerSettingsClient } from "../apps/serverBacked/settingsApi";
import { ScriptedResolver } from "../resolvers/scriptedResolver";

describe("section 33: partial execution failure", () => {
  it("reports both applied and rejected server updates accurately", async () => {
    const server = new FakeSettingsServer({ latencyMs: 1 });
    const client = new ServerSettingsClient(server);
    server.rejectUpdatesFor("notifyComments");
    const changes = [
      { id: "notifyDirectMessages", value: false },
      { id: "notifyComments", value: false },
      { id: "digestFrequencyHours", value: 12 },
    ];
    const openPrefs = createOpenPrefs({
      preferences: serverBackedPreferences,
      adapter: createServerBackedAdapter(client),
      resolver: new ScriptedResolver({
        "quiet notifications and digest twice daily": { status: "resolved", changes },
      }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("quiet notifications and digest twice daily")).resolves.toEqual({
      status: "failed",
      error: "The adapter reported one or more failed preference changes.",
      applied: [
        { id: "notifyDirectMessages", value: false },
        { id: "digestFrequencyHours", value: 12 },
      ],
      failed: [{ id: "notifyComments", reason: "The server rejected notifyComments." }],
    });
    await expect(
      client.get(["notifyDirectMessages", "notifyComments", "digestFrequencyHours"]),
    ).resolves.toEqual({
      notifyDirectMessages: false,
      notifyComments: true,
      digestFrequencyHours: 12,
    });
  });
});
