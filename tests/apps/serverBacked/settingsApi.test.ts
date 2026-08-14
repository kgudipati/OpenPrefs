import { describe, expect, it } from "vitest";
import { FakeSettingsServer, ServerSettingsClient } from "./settingsApi";

describe("the server-backed host settings API", () => {
  it("round-trips selected preferences through the async client", async () => {
    const client = new ServerSettingsClient(new FakeSettingsServer({ latencyMs: 1 }));

    await expect(
      client.update({ notifyMarketing: false, digestFrequencyHours: 8 }),
    ).resolves.toEqual({
      updated: ["notifyMarketing", "digestFrequencyHours"],
      rejected: [],
    });
    await expect(client.get(["notifyMarketing", "digestFrequencyHours"])).resolves.toEqual({
      notifyMarketing: false,
      digestFrequencyHours: 8,
    });
  });

  it("reports configured rejections while preserving independent successful updates", async () => {
    const server = new FakeSettingsServer({ latencyMs: 1 });
    const client = new ServerSettingsClient(server);
    server.rejectUpdatesFor("notifyComments");

    await expect(
      client.update({ notifyDirectMessages: false, notifyComments: false }),
    ).resolves.toEqual({
      updated: ["notifyDirectMessages"],
      rejected: [{ id: "notifyComments", reason: "The server rejected notifyComments." }],
    });
    await expect(client.get(["notifyDirectMessages", "notifyComments"])).resolves.toEqual({
      notifyDirectMessages: false,
      notifyComments: true,
    });
  });
});
