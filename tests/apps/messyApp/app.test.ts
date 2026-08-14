import { describe, expect, it } from "vitest";
import {
  createMessyApp,
  readFontSize,
  readShowTips,
  readSidebarWidth,
  writeFontSize,
  writeShowTips,
  writeSidebarWidth,
} from "./app";

describe("the messy host application's own settings mechanisms", () => {
  it("keeps synchronous settings in its store", () => {
    const app = createMessyApp();

    app.store.setTheme("dark");
    app.store.setCompactMode(true);
    app.store.setReducedMotion(true);

    expect(app.store.getState()).toEqual({
      theme: "dark",
      compactMode: true,
      reducedMotion: true,
    });
  });

  it("serializes and parses local settings through app-owned helpers", () => {
    const app = createMessyApp();

    writeFontSize(app.storage, "large");
    writeShowTips(app.storage, false);
    writeSidebarWidth(app.storage, 360);

    expect(readFontSize(app.storage)).toBe("large");
    expect(readShowTips(app.storage)).toBe(false);
    expect(readSidebarWidth(app.storage)).toBe(360);
  });

  it("reads and writes the preferences exposed by its async API", async () => {
    const app = createMessyApp();

    await app.remote.update({ notifyMarketing: false, digestFrequencyHours: 12 });

    await expect(app.remote.get(["notifyMarketing", "digestFrequencyHours"])).resolves.toEqual({
      notifyMarketing: false,
      digestFrequencyHours: 12,
    });
  });

  it("keeps its diagnostic-upload preference write-only", async () => {
    const app = createMessyApp();

    await app.remote.update({ diagnosticUploadsEnabled: true });

    await expect(app.remote.get(["diagnosticUploadsEnabled"])).resolves.toEqual({});
  });

  it("accesses context-owned settings through the provider getter", () => {
    const app = createMessyApp();

    app.getAccessibilityContext().setHighContrast(true);
    app.getAccessibilityContext().setReadingGuide(true);

    expect(app.getAccessibilityContext()).toMatchObject({
      highContrast: true,
      readingGuide: true,
    });
  });
});
