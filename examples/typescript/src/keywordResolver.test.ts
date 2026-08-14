import { describe, expect, it } from "vitest";
import { resolveWithKeywords } from "./keywordResolver.js";
import { preferences } from "./manifest.js";
import { AppSettingsStore } from "./settings.js";

function resolve(text: string, includeCurrent = true) {
  const current = new AppSettingsStore().getState();
  return resolveWithKeywords({
    text,
    preferences,
    ...(includeCurrent ? { current } : {}),
  });
}

describe("the deterministic keyword resolver", () => {
  it("resolves a direct enum change from a synonym", () => {
    expect(resolve("use night mode")).toEqual({
      status: "resolved",
      changes: [{ id: "theme", value: "dark" }],
    });
  });

  it("resolves a direct numeric change", () => {
    expect(resolve("set notification sound volume to 3")).toEqual({
      status: "resolved",
      changes: [{ id: "notificationVolume", value: 3 }],
    });
  });

  it("resolves multiple preference clauses atomically", () => {
    expect(resolve("turn off marketing notifications and use dark mode")).toEqual({
      status: "resolved",
      changes: [
        { id: "marketingNotifications", value: false },
        { id: "theme", value: "dark" },
      ],
    });
  });

  it("uses current state for an unambiguous relative enum change", () => {
    expect(resolve("make the text larger")).toEqual({
      status: "resolved",
      changes: [{ id: "textSize", value: "large" }],
    });
  });

  it("asks for current state before resolving a relative change", () => {
    expect(resolve("make the text larger", false)).toEqual({
      status: "needs_clarification",
      question: "What is the current textSize, or which exact value should it use?",
    });
  });

  it("asks for clarification when a phrase matches several preferences", () => {
    expect(resolve("turn off notifications")).toMatchObject({
      status: "needs_clarification",
    });
  });

  it("reports unsupported intent when the manifest has no matching preference", () => {
    expect(resolve("order lunch for the team")).toEqual({ status: "unsupported" });
  });
});
