import { describe, expect, it, vi } from "vitest";
import type { PreferencesAdapter } from "../adapter/types";
import type { PreferenceChange } from "../proposal/types";
import { executeChanges } from "./executeChanges";

const changes: readonly PreferenceChange[] = [
  { id: "theme", value: "dark" },
  { id: "notifications", value: true },
];

function adapterReturning(result: unknown) {
  return {
    apply: vi.fn(async () => result),
  };
}

function executeWith(adapter: object) {
  return Reflect.apply(executeChanges, undefined, [adapter, changes]);
}

describe("executeChanges", () => {
  it.each([
    ["an empty result", {}],
    ["an empty failed list", { failed: [] }],
    ["additional success metadata", { success: true }],
  ])("reports every change applied for %s", async (_name, result) => {
    const adapter = adapterReturning(result);

    const execution = await executeWith(adapter);

    expect(execution).toEqual({ status: "applied", applied: changes });
    expect(adapter.apply).toHaveBeenCalledOnce();
    expect(adapter.apply).toHaveBeenCalledWith(changes);
    expect(Object.isFrozen(execution)).toBe(true);
    expect(Object.isFrozen(execution.applied)).toBe(true);
  });

  it("reports partial failure and computes applied changes by failed id", async () => {
    const adapter = adapterReturning({
      failed: [{ id: "notifications", reason: "Permission denied.", hostCode: 403 }],
      requestId: "host-1",
    });

    const execution = await executeWith(adapter);

    expect(execution).toEqual({
      status: "failed",
      error: "The adapter reported one or more failed preference changes.",
      applied: [{ id: "theme", value: "dark" }],
      failed: [{ id: "notifications", reason: "Permission denied." }],
    });
    if (execution.status === "failed") {
      expect(Object.isFrozen(execution.failed)).toBe(true);
      expect(Object.isFrozen(execution.failed[0])).toBe(true);
    }
  });

  it.each([
    ["a null result", null],
    ["an array result", []],
    ["a non-array failed field", { failed: true }],
    ["an explicitly undefined failed field", { failed: undefined }],
    ["a non-object failure", { failed: [null] }],
    ["a failure without an id", { failed: [{ reason: "No id." }] }],
    ["a failure without a reason", { failed: [{ id: "theme" }] }],
    ["an unknown failed id", { failed: [{ id: "missing", reason: "Missing." }] }],
    [
      "a duplicate failed id",
      {
        failed: [
          { id: "theme", reason: "First." },
          { id: "theme", reason: "Second." },
        ],
      },
    ],
  ])("treats %s as total failure", async (_name, result) => {
    const execution = await executeWith(adapterReturning(result));

    expect(execution).toEqual({
      status: "failed",
      error: "Adapter returned a malformed apply result.",
      applied: [],
      failed: [
        { id: "theme", reason: "Adapter returned a malformed apply result." },
        { id: "notifications", reason: "Adapter returned a malformed apply result." },
      ],
    });
  });

  it("turns an adapter exception into total failure with its message", async () => {
    const adapter: PreferencesAdapter = {
      apply: vi.fn(async () => {
        throw new Error("Host store is unavailable.");
      }),
    };

    const execution = await executeChanges(adapter, changes);

    expect(execution).toEqual({
      status: "failed",
      error: "Host store is unavailable.",
      applied: [],
      failed: [
        { id: "theme", reason: "Host store is unavailable." },
        { id: "notifications", reason: "Host store is unavailable." },
      ],
    });
  });

  it("uses a stable fallback when an adapter throws a non-error value", async () => {
    const adapter: PreferencesAdapter = {
      apply: vi.fn(async () => {
        throw null;
      }),
    };

    await expect(executeChanges(adapter, changes)).resolves.toEqual(
      expect.objectContaining({
        status: "failed",
        error: "Adapter failed while applying preference changes.",
      }),
    );
  });

  it("uses a stable fallback when inspecting a hostile thrown value would throw", async () => {
    const hostileError = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("Inspection blocked.");
        },
      },
    );
    const adapter: PreferencesAdapter = {
      apply: vi.fn(async () => {
        throw hostileError;
      }),
    };

    await expect(executeChanges(adapter, changes)).resolves.toEqual(
      expect.objectContaining({
        status: "failed",
        error: "Adapter failed while applying preference changes.",
      }),
    );
  });

  it("fails closed when inspecting an exotic adapter result throws", async () => {
    const result = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error("Hostile result.");
        },
      },
    );

    await expect(executeWith(adapterReturning(result))).resolves.toEqual(
      expect.objectContaining({
        status: "failed",
        error: "Hostile result.",
        applied: [],
      }),
    );
  });
});
