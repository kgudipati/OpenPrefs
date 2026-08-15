import { expectTypeOf, it } from "vitest";
import type { ApplyFailure } from "../adapter/types";
import type { PreferenceChange, SettingsProposal } from "../proposal/types";
import type {
  AlreadySatisfiedResult,
  AppliedResult,
  ConfirmationRequiredResult,
  FailedResult,
  OpenPrefsResult,
  PreferenceChangePreview,
} from "./results";

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
  expectTypeOf<PreferenceChangePreview>().toEqualTypeOf<{
    readonly id: string;
    readonly label?: string;
    readonly before: unknown;
    readonly after: PreferenceChange["value"];
  }>();
  expectTypeOf<ConfirmationRequiredResult>().toEqualTypeOf<{
    readonly status: "confirmation_required";
    readonly proposal: SettingsProposal;
    readonly requiredBy: readonly string[];
    readonly exceedsChangeLimit: boolean;
    readonly preview?: readonly PreferenceChangePreview[];
  }>();
  expectTypeOf<AlreadySatisfiedResult>().toEqualTypeOf<{
    readonly status: "already_satisfied";
  }>();
  expectTypeOf<OpenPrefsResult["status"]>().toEqualTypeOf<
    | "applied"
    | "already_satisfied"
    | "confirmation_required"
    | "needs_clarification"
    | "unsupported"
    | "rejected"
    | "failed"
  >();
});
