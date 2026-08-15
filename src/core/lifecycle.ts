import type { PreferencesAdapter } from "../adapter/types";
import { executeChanges } from "../execution/executeChanges";
import { errorMessage, isRecord, readOwnDataProperty } from "../internal/guards";
import type { PreferencesManifest } from "../manifest/manifest";
import type { PreferencesState } from "../manifest/types";
import { evaluatePolicy } from "../policy/evaluatePolicy";
import type { OpenPrefsPolicy, PolicyDecision } from "../policy/types";
import type { SettingsProposal } from "../proposal/types";
import type { PreferencesResolver, ResolveInput } from "../resolver/types";
import { validateProposal } from "../validation/validateProposal";
import type {
  ConfirmationRequiredResult,
  FailedResult,
  NeedsClarificationResult,
  OpenPrefsResult,
  PreferenceChangePreview,
  RejectedResult,
  UnsupportedResult,
} from "./results";

interface LifecycleBoundaries<Manifest extends PreferencesManifest> {
  readonly preferences: Manifest;
  readonly adapter: PreferencesAdapter<Manifest> | PreferencesAdapter;
  readonly policy: OpenPrefsPolicy;
}

interface ProposalLifecycleInput<Manifest extends PreferencesManifest>
  extends LifecycleBoundaries<Manifest> {
  readonly proposal: unknown;
  readonly confirmed: boolean;
  readonly current?: Readonly<PreferencesState<Manifest>>;
}

interface RequestLifecycleInput<Manifest extends PreferencesManifest>
  extends LifecycleBoundaries<Manifest> {
  readonly resolver: PreferencesResolver<Manifest> | PreferencesResolver;
  readonly text: string;
}

function failedResult(error: unknown, fallback: string): FailedResult {
  return Object.freeze({
    status: "failed",
    error: errorMessage(error, fallback),
    applied: Object.freeze([]),
    failed: Object.freeze([]),
  });
}

function rejectedResult(
  decision: Extract<PolicyDecision, { readonly outcome: "rejected" }>,
): RejectedResult {
  switch (decision.reason) {
    case "proposal_rejected":
      return Object.freeze({
        status: "rejected",
        reason: decision.reason,
        changes: decision.changes,
        rejections: decision.rejections,
      });
    case "too_many_changes":
      return Object.freeze({
        status: "rejected",
        reason: decision.reason,
        changes: decision.changes,
        count: decision.count,
        limit: decision.limit,
      });
    case "unknown_preference":
      return Object.freeze({
        status: "rejected",
        reason: decision.reason,
        changes: decision.changes,
      });
    case "no_changes":
      return Object.freeze({
        status: "rejected",
        reason: decision.reason,
        changes: decision.changes,
      });
    default: {
      const unhandledDecision: never = decision;
      return unhandledDecision;
    }
  }
}

function confirmationResult(
  decision: Extract<PolicyDecision, { readonly outcome: "confirmation_required" }>,
  current?: Readonly<Record<string, unknown>>,
): ConfirmationRequiredResult {
  const proposal: SettingsProposal = Object.freeze({
    changes: Object.freeze(decision.changes.map(({ id, value }) => Object.freeze({ id, value }))),
  });
  const preview: PreferenceChangePreview[] = [];
  if (current !== undefined) {
    for (const { id, value } of decision.changes) {
      const before = readOwnDataProperty(current, id);
      if (before.found) {
        preview.push(Object.freeze({ id, before: before.value, after: value }));
      }
    }
  }

  return Object.freeze({
    status: "confirmation_required",
    proposal,
    requiredBy: decision.requiredBy,
    exceedsChangeLimit: decision.exceedsChangeLimit,
    ...(preview.length === 0 ? {} : { preview: Object.freeze(preview) }),
  });
}

function normalizeCurrent<Manifest extends PreferencesManifest>(
  value: unknown,
  ids: readonly string[],
): Readonly<PreferencesState<Manifest>> | undefined;
function normalizeCurrent(value: unknown, ids: readonly string[]): Readonly<object> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const current: Record<string, unknown> = {};
  for (const id of ids) {
    const property = readOwnDataProperty(value, id);
    if (property.found) {
      current[id] = property.value;
    }
  }
  return Object.freeze(current);
}

async function readCurrent<Manifest extends PreferencesManifest>(
  adapter: PreferencesAdapter<Manifest> | PreferencesAdapter,
  ids: readonly string[],
): Promise<Readonly<PreferencesState<Manifest>> | undefined> {
  try {
    const read = adapter.read;
    if (read === undefined) {
      return undefined;
    }
    const value: unknown = await read.call(adapter, ids);
    return normalizeCurrent<Manifest>(value, ids);
  } catch {
    return undefined;
  }
}

function inspectResolution(
  resolution: unknown,
):
  | { readonly kind: "proposal"; readonly proposal: unknown }
  | { readonly kind: "result"; readonly result: NeedsClarificationResult | UnsupportedResult }
  | { readonly kind: "malformed" } {
  if (!isRecord(resolution)) {
    return { kind: "malformed" };
  }
  const status = readOwnDataProperty(resolution, "status");
  if (!status.found) {
    return { kind: "malformed" };
  }
  if (status.value === "resolved") {
    return { kind: "proposal", proposal: resolution };
  }
  if (status.value === "unsupported") {
    return { kind: "result", result: Object.freeze({ status: "unsupported" }) };
  }
  if (status.value === "needs_clarification") {
    const question = readOwnDataProperty(resolution, "question");
    if (question.found && typeof question.value === "string") {
      return {
        kind: "result",
        result: Object.freeze({ status: "needs_clarification", question: question.value }),
      };
    }
  }
  return { kind: "malformed" };
}

/**
 * Runs untrusted proposal data through validation, policy, confirmation, and execution.
 *
 * @param input - Trusted lifecycle boundaries plus untrusted proposal data and confirmation state.
 * @returns A typed lifecycle result; the returned promise never rejects.
 */
export async function runProposal<Manifest extends PreferencesManifest>(
  input: ProposalLifecycleInput<Manifest>,
): Promise<OpenPrefsResult> {
  try {
    const validation = validateProposal(input.preferences, input.proposal);
    const decision = evaluatePolicy({
      manifest: input.preferences,
      policy: input.policy,
      changes: validation.changes,
      rejections: validation.rejections,
    });

    if (decision.outcome === "rejected") {
      return rejectedResult(decision);
    }
    if (decision.outcome === "confirmation_required" && !input.confirmed) {
      return confirmationResult(decision, input.current);
    }
    return await executeChanges(input.adapter, decision.changes);
  } catch (error) {
    return failedResult(error, "OpenPrefs failed while processing the proposal.");
  }
}

/**
 * Runs natural-language intent through optional read context, resolution, and proposal processing.
 *
 * @param input - Trusted lifecycle boundaries, the resolver, and natural-language request text.
 * @returns A typed lifecycle result; the returned promise never rejects.
 */
export async function runRequest<Manifest extends PreferencesManifest>(
  input: RequestLifecycleInput<Manifest>,
): Promise<OpenPrefsResult> {
  try {
    if (typeof input.text !== "string") {
      return failedResult(input.text, "OpenPrefs request text must be a string.");
    }
    const current = await readCurrent(input.adapter, input.preferences.ids());
    const resolverInput: ResolveInput<Manifest> = {
      text: input.text,
      preferences: input.preferences,
      ...(current === undefined ? {} : { current }),
    };
    const resolution: unknown = await input.resolver.resolve(resolverInput);
    const inspected = inspectResolution(resolution);
    if (inspected.kind === "malformed") {
      return failedResult(resolution, "Resolver returned a malformed result.");
    }
    if (inspected.kind === "result") {
      return inspected.result;
    }
    return await runProposal({
      ...input,
      proposal: inspected.proposal,
      confirmed: false,
      ...(current === undefined ? {} : { current }),
    });
  } catch (error) {
    return failedResult(error, "Resolver failed while processing the request.");
  }
}
