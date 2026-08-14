import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSyncSettings, syncSettingsStore } from "./store";

describe("the synchronous host settings store", () => {
  beforeEach(() => resetSyncSettings());

  it("updates settings through its typed setters", () => {
    syncSettingsStore.setTheme("dark");
    syncSettingsStore.setFontSize("large");
    syncSettingsStore.setCompactMode(true);

    expect(syncSettingsStore.getState()).toEqual({
      theme: "dark",
      fontSize: "large",
      compactMode: true,
    });
  });

  it("notifies subscribers with the latest snapshot", () => {
    const listener = vi.fn();
    const unsubscribe = syncSettingsStore.subscribe(listener);

    syncSettingsStore.setTheme("light");
    unsubscribe();
    syncSettingsStore.setTheme("dark");

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      theme: "light",
      fontSize: "medium",
      compactMode: false,
    });
  });
});
