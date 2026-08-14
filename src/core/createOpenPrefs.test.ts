import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { ApplyResult, PreferencesAdapter } from "../adapter/types";
import { definePreferences } from "../manifest/definePreferences";
import type { OpenPrefsPolicy } from "../policy/types";
import type { PreferenceChange } from "../proposal/types";
import type { PreferencesResolver, ResolveInput, ResolveResult } from "../resolver/types";
import { createOpenPrefs, type OpenPrefs } from "./createOpenPrefs";
import type { RejectedResult } from "./results";

const preferences = definePreferences({
  theme: {
    type: "string",
    description: "The application color theme.",
    enum: ["light", "dark"],
  },
  notifications: {
    type: "boolean",
    description: "Whether notifications are enabled.",
    openPrefs: { sensitive: true },
  },
  volume: {
    type: "number",
    description: "The notification volume.",
    minimum: 0,
    maximum: 10,
  },
});

class ScriptedResolver implements PreferencesResolver {
  readonly inputs: ResolveInput[] = [];
  readonly #result: ResolveResult;

  constructor(result: ResolveResult) {
    this.#result = result;
  }

  async resolve(input: ResolveInput): Promise<ResolveResult> {
    this.inputs.push(input);
    return this.#result;
  }
}

class StoreAdapter implements PreferencesAdapter {
  readonly state: Record<string, unknown>;
  readonly readCalls: (readonly string[])[] = [];
  readonly applyCalls: (readonly PreferenceChange[])[] = [];

  constructor(initial: Record<string, unknown>) {
    this.state = { ...initial };
  }

  async read(ids: readonly string[]): Promise<Record<string, unknown>> {
    this.readCalls.push(ids);
    const current: Record<string, unknown> = {};
    for (const id of ids) {
      if (Object.hasOwn(this.state, id)) {
        current[id] = this.state[id];
      }
    }
    return current;
  }

  async apply(changes: readonly PreferenceChange[]): Promise<ApplyResult> {
    this.applyCalls.push(changes);
    for (const { id, value } of changes) {
      this.state[id] = value;
    }
    return {};
  }
}

class AsyncStoreAdapter extends StoreAdapter {
  override async apply(changes: readonly PreferenceChange[]): Promise<ApplyResult> {
    await Promise.resolve();
    return super.apply(changes);
  }
}

function resolved(...changes: readonly PreferenceChange[]): ResolveResult {
  return { status: "resolved", changes };
}

function openPrefsFor(input: {
  readonly resolver: PreferencesResolver;
  readonly adapter?: PreferencesAdapter;
  readonly policy?: Partial<OpenPrefsPolicy>;
}): OpenPrefs {
  return createOpenPrefs({
    preferences,
    adapter: input.adapter ?? new StoreAdapter({}),
    resolver: input.resolver,
    ...(input.policy === undefined ? {} : { policy: input.policy }),
  });
}

function createFromUnknown(options: unknown): OpenPrefs {
  return Reflect.apply(createOpenPrefs, undefined, [options]);
}

describe("createOpenPrefs", () => {
  it("runs a request end to end through a synchronous in-memory store", async () => {
    const adapter = new StoreAdapter({ theme: "light", notifications: false, volume: 3 });
    const resolver = new ScriptedResolver(resolved({ id: "theme", value: "dark" }));
    const openPrefs = openPrefsFor({
      adapter,
      resolver,
      policy: { confirmation: "never" },
    });

    const result = await openPrefs.request("Use the dark theme");

    expect(result).toEqual({
      status: "applied",
      applied: [{ id: "theme", value: "dark" }],
    });
    expect(adapter.state.theme).toBe("dark");
    expect(adapter.readCalls).toEqual([preferences.ids()]);
    expect(adapter.applyCalls).toHaveLength(1);
    expect(resolver.inputs).toEqual([
      {
        text: "Use the dark theme",
        preferences,
        current: { theme: "light", notifications: false, volume: 3 },
      },
    ]);
    expect(Object.isFrozen(openPrefs)).toBe(true);
  });

  it("awaits an asynchronous adapter before reporting applied", async () => {
    const adapter = new AsyncStoreAdapter({ notifications: false });
    const openPrefs = openPrefsFor({
      adapter,
      resolver: new ScriptedResolver(resolved({ id: "notifications", value: true })),
      policy: { confirmation: "never" },
    });

    const result = await openPrefs.request("Enable notifications");

    expect(result.status).toBe("applied");
    expect(adapter.state.notifications).toBe(true);
  });

  it("works with an adapter that does not implement read", async () => {
    const apply = vi.fn(async () => ({}));
    const resolver = new ScriptedResolver(resolved({ id: "theme", value: "dark" }));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode")).resolves.toMatchObject({ status: "applied" });

    expect(Object.hasOwn(resolver.inputs[0] ?? {}, "current")).toBe(false);
    expect(apply).toHaveBeenCalledOnce();
  });

  it("continues without current state when adapter read throws", async () => {
    const apply = vi.fn(async () => ({}));
    const resolver = new ScriptedResolver(resolved({ id: "theme", value: "dark" }));
    const adapter: PreferencesAdapter = {
      async read() {
        throw new Error("Read unavailable.");
      },
      apply,
    };
    const openPrefs = openPrefsFor({
      adapter,
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode")).resolves.toMatchObject({ status: "applied" });

    expect(Object.hasOwn(resolver.inputs[0] ?? {}, "current")).toBe(false);
    expect(apply).toHaveBeenCalledOnce();
  });

  it("continues without current state when adapter read returns a malformed value", async () => {
    const apply = vi.fn(async () => ({}));
    const resolver = new ScriptedResolver(resolved({ id: "theme", value: "dark" }));
    const openPrefs = createFromUnknown({
      preferences,
      adapter: { read: async () => "not a record", apply },
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode")).resolves.toMatchObject({ status: "applied" });

    expect(Object.hasOwn(resolver.inputs[0] ?? {}, "current")).toBe(false);
  });

  it("ignores unrequested read keys while preserving known undefined values", async () => {
    const resolver = new ScriptedResolver(resolved({ id: "theme", value: "dark" }));
    const adapter: PreferencesAdapter = {
      async read() {
        return { theme: undefined, invented: true };
      },
      async apply() {
        return {};
      },
    };
    const openPrefs = openPrefsFor({
      adapter,
      resolver,
      policy: { confirmation: "never" },
    });

    await openPrefs.request("Use dark mode");

    expect(resolver.inputs[0]?.current).toEqual({ theme: undefined });
    expect(Object.isFrozen(resolver.inputs[0]?.current)).toBe(true);
  });

  it("returns a resolver clarification question without applying", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver({
        status: "needs_clarification",
        question: "Which theme would you like?",
      }),
    });

    const result = await openPrefs.request("Change the theme");

    expect(result).toEqual({
      status: "needs_clarification",
      question: "Which theme would you like?",
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it("returns unsupported intent without inventing or applying a setting", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver({ status: "unsupported" }),
    });

    await expect(openPrefs.request("Order lunch")).resolves.toEqual({ status: "unsupported" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("rejects a hallucinated preference id and never calls the adapter", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver(resolved({ id: "invented.setting", value: true })),
      policy: { confirmation: "never" },
    });

    const result = await openPrefs.request("Enable the invented setting");

    expect(result).toEqual({
      status: "rejected",
      reason: "proposal_rejected",
      changes: [],
      rejections: [
        {
          code: "ID_UNKNOWN",
          id: "invented.setting",
          message: 'Preference "invented.setting" is not exposed by the manifest.',
        },
      ],
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it("turns a resolver exception into a typed failed result", async () => {
    const resolver: PreferencesResolver = {
      async resolve() {
        throw new Error("Resolver unavailable.");
      },
    };
    const openPrefs = openPrefsFor({ resolver });

    await expect(openPrefs.request("Use dark mode")).resolves.toEqual({
      status: "failed",
      error: "Resolver unavailable.",
      applied: [],
      failed: [],
    });
  });

  it.each([
    ["a null result", null],
    ["a missing status", {}],
    ["an unknown status", { status: "invented" }],
    ["a clarification without a question", { status: "needs_clarification" }],
  ])("turns %s from the resolver into a typed failed result", async (_name, resolution) => {
    const openPrefs = createFromUnknown({
      preferences,
      adapter: { apply: vi.fn(async () => ({})) },
      resolver: { resolve: async () => resolution },
    });

    await expect(openPrefs.request("Change something")).resolves.toEqual({
      status: "failed",
      error: "Resolver returned a malformed result.",
      applied: [],
      failed: [],
    });
  });

  it("turns a malformed resolved proposal into a diagnostic rejection", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = createFromUnknown({
      preferences,
      adapter: { apply },
      resolver: { resolve: async () => ({ status: "resolved" }) },
      policy: { confirmation: "never" },
    });

    const result = await openPrefs.request("Change something");

    expect(result).toMatchObject({ status: "rejected", reason: "proposal_rejected" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("surfaces an adapter exception as total failure", async () => {
    const openPrefs = openPrefsFor({
      adapter: {
        async apply() {
          throw new Error("Host write failed.");
        },
      },
      resolver: new ScriptedResolver(resolved({ id: "theme", value: "dark" })),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode")).resolves.toEqual({
      status: "failed",
      error: "Host write failed.",
      applied: [],
      failed: [{ id: "theme", reason: "Host write failed." }],
    });
  });

  it("surfaces adapter partial failure without hiding applied changes", async () => {
    const openPrefs = openPrefsFor({
      adapter: {
        async apply() {
          return { failed: [{ id: "notifications", reason: "Permission denied." }] };
        },
      },
      resolver: new ScriptedResolver(
        resolved({ id: "theme", value: "dark" }, { id: "notifications", value: true }),
      ),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode and notify me")).resolves.toEqual({
      status: "failed",
      error: "The adapter reported one or more failed preference changes.",
      applied: [{ id: "theme", value: "dark" }],
      failed: [{ id: "notifications", reason: "Permission denied." }],
    });
  });

  it("surfaces a malformed adapter result as total failure", async () => {
    const openPrefs = createFromUnknown({
      preferences,
      adapter: { apply: async () => null },
      resolver: new ScriptedResolver(resolved({ id: "theme", value: "dark" })),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode")).resolves.toEqual({
      status: "failed",
      error: "Adapter returned a malformed apply result.",
      applied: [],
      failed: [{ id: "theme", reason: "Adapter returned a malformed apply result." }],
    });
  });

  it("accepts additional adapter success metadata", async () => {
    const openPrefs = openPrefsFor({
      adapter: { apply: async () => ({ success: true }) },
      resolver: new ScriptedResolver(resolved({ id: "theme", value: "dark" })),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("Use dark mode")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "theme", value: "dark" }],
    });
  });

  it("includes known before and after values in confirmation previews", async () => {
    const adapter = new StoreAdapter({ theme: "light" });
    const openPrefs = openPrefsFor({
      adapter,
      resolver: new ScriptedResolver(resolved({ id: "theme", value: "dark" })),
    });

    const result = await openPrefs.request("Use dark mode");

    expect(result).toEqual({
      status: "confirmation_required",
      proposal: { changes: [{ id: "theme", value: "dark" }] },
      requiredBy: ["theme"],
      preview: [{ id: "theme", before: "light", after: "dark" }],
    });
    expect(adapter.applyCalls).toHaveLength(0);
    if (result.status !== "confirmation_required") {
      return;
    }

    await expect(openPrefs.confirm(result.proposal)).resolves.toEqual({
      status: "applied",
      applied: [{ id: "theme", value: "dark" }],
    });
    expect(adapter.applyCalls).toHaveLength(1);
    expect(adapter.state.theme).toBe("dark");
  });

  it("revalidates a proposal mutated between request and confirm", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver(resolved({ id: "theme", value: "dark" })),
    });
    const requested = await openPrefs.request("Use dark mode");
    expect(requested.status).toBe("confirmation_required");
    if (requested.status !== "confirmation_required") {
      return;
    }
    const [change] = requested.proposal.changes;
    expect(change).toBeDefined();
    if (change === undefined) {
      return;
    }
    Reflect.set(change, "id", "invented.setting");

    const confirmed = await openPrefs.confirm(requested.proposal);

    expect(confirmed).toMatchObject({
      status: "rejected",
      reason: "proposal_rejected",
      rejections: [{ code: "ID_UNKNOWN", id: "invented.setting" }],
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "proposal_rejected",
      result: resolved({ id: "missing", value: true }),
      policy: { confirmation: "never" } satisfies Partial<OpenPrefsPolicy>,
    },
    {
      name: "too_many_changes",
      result: resolved({ id: "theme", value: "dark" }, { id: "volume", value: 5 }),
      policy: {
        confirmation: "never",
        maxChangesPerRequest: 1,
      } satisfies Partial<OpenPrefsPolicy>,
    },
    {
      name: "no_changes",
      result: resolved(),
      policy: { confirmation: "never" } satisfies Partial<OpenPrefsPolicy>,
    },
  ])("never calls adapter.apply for a $name rejection", async ({ result, policy }) => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver(result),
      policy,
    });

    const outcome = await openPrefs.request("Apply rejected changes");

    expect(outcome.status).toBe("rejected");
    expect(apply).not.toHaveBeenCalled();
  });

  it("runs direct changes through confirmation before applying", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver({ status: "unsupported" }),
    });

    const requested = await openPrefs.apply([{ id: "theme", value: "dark" }]);

    expect(requested.status).toBe("confirmation_required");
    expect(apply).not.toHaveBeenCalled();
    if (requested.status !== "confirmation_required") {
      return;
    }
    await expect(openPrefs.confirm(requested.proposal)).resolves.toMatchObject({
      status: "applied",
    });
    expect(apply).toHaveBeenCalledOnce();
  });

  it("applies direct validated changes immediately when policy allows", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver({ status: "unsupported" }),
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.apply([{ id: "volume", value: 5 }])).resolves.toEqual({
      status: "applied",
      applied: [{ id: "volume", value: 5 }],
    });
  });

  it("returns a typed rejection for malformed confirmation input", async () => {
    const apply = vi.fn(async () => ({}));
    const openPrefs = openPrefsFor({
      adapter: { apply },
      resolver: new ScriptedResolver({ status: "unsupported" }),
    });

    const result = await Reflect.apply(openPrefs.confirm, openPrefs, [null]);

    expect(result).toMatchObject({ status: "rejected", reason: "proposal_rejected" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("returns a typed failure for malformed request text", async () => {
    const openPrefs = openPrefsFor({
      resolver: new ScriptedResolver({ status: "unsupported" }),
    });

    await expect(Reflect.apply(openPrefs.request, openPrefs, [null])).resolves.toEqual({
      status: "failed",
      error: "OpenPrefs request text must be a string.",
      applied: [],
      failed: [],
    });
  });

  it.each([
    ["a non-object configuration", null],
    [
      "a non-manifest preferences value",
      {
        preferences: {},
        adapter: { apply: async () => ({}) },
        resolver: { resolve: async () => ({}) },
      },
    ],
    [
      "an adapter without apply",
      { preferences, adapter: {}, resolver: { resolve: async () => ({}) } },
    ],
    [
      "a non-function adapter read",
      {
        preferences,
        adapter: { read: true, apply: async () => ({}) },
        resolver: { resolve: async () => ({}) },
      },
    ],
    [
      "a resolver without resolve",
      { preferences, adapter: { apply: async () => ({}) }, resolver: {} },
    ],
  ])("throws at construction time for %s", (_name, options) => {
    expect(() => createFromUnknown(options)).toThrow(TypeError);
  });

  it("throws at construction time for invalid policy", () => {
    expect(() =>
      createFromUnknown({
        preferences,
        adapter: { apply: async () => ({}) },
        resolver: { resolve: async () => ({ status: "unsupported" }) },
        policy: { confirmation: "sometimes" },
      }),
    ).toThrowError(expect.objectContaining({ code: "POLICY_CONFIRMATION_INVALID" }));
  });

  it("represents every policy rejection reason in the public result type", () => {
    expectTypeOf<RejectedResult["reason"]>().toEqualTypeOf<
      "proposal_rejected" | "too_many_changes" | "unknown_preference" | "no_changes"
    >();
  });
});
