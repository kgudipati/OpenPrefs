import { expectTypeOf, it } from "vitest";
import type { ApplyFailure } from "../adapter/types";
import type { PreferenceChange } from "../proposal/types";
import type { AppliedResult, FailedResult } from "./results";

it("defines execution result contracts directly in the public result module", () => {
  expectTypeOf<AppliedResult>().toEqualTypeOf<{
    readonly status: "applied";
    readonly applied: readonly PreferenceChange[];
  }>();
  expectTypeOf<FailedResult>().toEqualTypeOf<{
    readonly status: "failed";
    readonly error: string;
    readonly applied: readonly PreferenceChange[];
    readonly failed: readonly ApplyFailure[];
  }>();
});
