import { afterEach, describe, expect, it, vi } from "vitest";
import { buildModelContext, createOpenAIResolver } from "./llmResolver.js";
import { preferences } from "./manifest.js";
import { AppSettingsStore } from "./settings.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the hosted-model context", () => {
  it("derives model-readable constraints and current values from the manifest", () => {
    const context = buildModelContext({
      text: "use dark mode",
      preferences,
      current: new AppSettingsStore().getState(),
    });

    expect(context).toContainEqual({
      id: "theme",
      type: "string",
      description: "Application color theme or appearance mode.",
      enum: ["light", "dark", "system"],
      current: "system",
    });
    expect(context).toContainEqual({
      id: "notificationVolume",
      type: "number",
      description: "Notification sound volume from zero to ten.",
      minimum: 0,
      maximum: 10,
      current: 6,
    });
  });
});

const configuredApiKey = process.env.OPENAI_API_KEY ?? "";

describe.skipIf(configuredApiKey.length === 0)("the configured hosted-model resolver", () => {
  it("returns parsed model output directly to OpenPrefs", async () => {
    const modelOutput = {
      status: "resolved",
      changes: [{ id: "theme", value: "dark" }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              output: [
                {
                  content: [{ type: "output_text", text: JSON.stringify(modelOutput) }],
                },
              ],
            }),
          ),
      ),
    );
    const resolver = createOpenAIResolver({ apiKey: configuredApiKey });

    await expect(resolver.resolve({ text: "use dark mode", preferences })).resolves.toEqual(
      modelOutput,
    );
  });
});

describe("hosted-model failure handling", () => {
  it("returns unsupported for a non-JSON model response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              output: [{ content: [{ type: "output_text", text: "not JSON" }] }],
            }),
          ),
      ),
    );
    const resolver = createOpenAIResolver({ apiKey: "test-key" });

    await expect(resolver.resolve({ text: "use dark mode", preferences })).resolves.toEqual({
      status: "unsupported",
    });
  });
});
