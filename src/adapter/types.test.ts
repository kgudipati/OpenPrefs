import { describe, expect, expectTypeOf, it } from "vitest";
import { createOpenPrefs } from "../core/createOpenPrefs";
import { definePreferences } from "../manifest/definePreferences";
import { parsePreferencesJson } from "../manifest/parseJson";
import type { PreferenceChangeFor, PreferencesState } from "../manifest/types";
import type { PreferenceChange } from "../proposal/types";
import type { PreferencesResolver, ResolveInput } from "../resolver/types";
import type { ApplyResult, PreferencesAdapter } from "./types";

const preferences = definePreferences({
  theme: {
    type: "string",
    description: "The application color theme.",
    enum: ["light", "dark", "system"],
  },
  compactMode: {
    type: "boolean",
    description: "Whether the application uses a compact layout.",
  },
});

type TypedChange = PreferenceChangeFor<typeof preferences>;

function expectNarrowedValue(change: TypedChange): void {
  switch (change.id) {
    case "theme":
      expectTypeOf(change.value).toEqualTypeOf<"light" | "dark" | "system">();
      break;
    case "compactMode":
      expectTypeOf(change.value).toEqualTypeOf<boolean>();
      break;
  }
}

const typedResolver: PreferencesResolver<typeof preferences> = {
  async resolve(input) {
    expectTypeOf(input.current).toEqualTypeOf<
      | Readonly<{
          theme?: "light" | "dark" | "system";
          compactMode?: boolean;
        }>
      | undefined
    >();
    return { status: "resolved", changes: [{ id: "theme", value: "dark" }] };
  },
};

describe("manifest-derived host boundary types", () => {
  it("requires adapters to acknowledge success or failure explicitly", () => {
    const success: ApplyResult = { ok: true, nativeRequestId: "host-1" };
    const failure: ApplyResult = {
      ok: false,
      failed: [{ id: "theme", reason: "Host write failed." }],
      nativeRequestId: "host-2",
    };
    // @ts-expect-error success cannot be inferred from a missing acknowledgement.
    const missingAcknowledgement: ApplyResult = {};

    expect([success, failure, missingAcknowledgement]).toHaveLength(3);
  });

  it("derives a discriminated change union and narrows value through id", () => {
    expectTypeOf<TypedChange>().toEqualTypeOf<
      | { readonly id: "theme"; readonly value: "light" | "dark" | "system" }
      | { readonly id: "compactMode"; readonly value: boolean }
    >();

    const adapter: PreferencesAdapter<typeof preferences> = {
      read() {
        return { theme: "light", compactMode: false };
      },
      apply(changes) {
        for (const change of changes) {
          expectNarrowedValue(change);
        }
        return { ok: true };
      },
    };

    createOpenPrefs({ preferences, adapter, resolver: typedResolver });
  });

  it("rejects wrong values and ids at compile time", () => {
    // @ts-expect-error theme accepts only its declared string enum.
    const wrongValue: TypedChange = { id: "theme", value: true };
    // @ts-expect-error volume is absent from this manifest.
    const wrongId: TypedChange = { id: "volume", value: 5 };

    expect([wrongValue, wrongId]).toHaveLength(2);
  });

  it("infers the adapter contract from the preferences option", () => {
    const otherPreferences = definePreferences({
      volume: {
        type: "number",
        description: "The audio volume.",
      },
    });
    const contradictoryAdapter: PreferencesAdapter<typeof otherPreferences> = {
      apply() {
        return { ok: true };
      },
    };

    // @ts-expect-error the adapter handles volume, which the supplied manifest does not expose.
    createOpenPrefs({ preferences, adapter: contradictoryAdapter, resolver: typedResolver });
  });

  it("keeps a JSON-parsed manifest usable through loose host boundary types", async () => {
    const parsed = parsePreferencesJson({
      version: 1,
      preferences: {
        theme: {
          type: "string",
          description: "The application color theme.",
        },
      },
    });
    const adapter: PreferencesAdapter<typeof parsed> = {
      apply(changes) {
        expectTypeOf(changes).toEqualTypeOf<readonly PreferenceChange[]>();
        return { ok: true };
      },
    };
    const resolver: PreferencesResolver<typeof parsed> = {
      async resolve(input) {
        expectTypeOf(input).toEqualTypeOf<ResolveInput<typeof parsed>>();
        expectTypeOf(input.current).toEqualTypeOf<
          Readonly<PreferencesState<typeof parsed>> | undefined
        >();
        return { status: "resolved", changes: [{ id: "theme", value: "dark" }] };
      },
    };
    const openPrefs = createOpenPrefs({
      preferences: parsed,
      adapter,
      resolver,
      policy: { confirmation: "never" },
    });

    await expect(openPrefs.request("use dark mode")).resolves.toEqual({
      status: "applied",
      applied: [{ id: "theme", value: "dark" }],
    });
  });

  it("defaults an unparameterized adapter to loose preference changes", () => {
    const adapter: PreferencesAdapter = {
      apply(changes) {
        expectTypeOf(changes).toEqualTypeOf<readonly PreferenceChange[]>();
        return { ok: true };
      },
    };

    expect(adapter).toBeDefined();
  });
});
