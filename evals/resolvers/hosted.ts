import {
  createOpenAIResolver,
  type OpenAIResolverObservation,
} from "../../examples/typescript/src/llmResolver.js";
import type { PreferencesResolver } from "../../src/index.js";
import type { ResolverObservation, ResolverTokenUsage } from "../harness/types.js";

const lunaStandardUsdPerMillion = {
  input: 0.2,
  cachedInput: 0.02,
  cacheWriteInput: 0.25,
  output: 1.2,
} as const;

function hostedCost(model: string, usage: ResolverTokenUsage): number | undefined {
  if (model !== "gpt-5.6-luna") {
    return undefined;
  }
  const uncachedInput = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteInputTokens,
  );
  return (
    (uncachedInput * lunaStandardUsdPerMillion.input +
      usage.cachedInputTokens * lunaStandardUsdPerMillion.cachedInput +
      usage.cacheWriteInputTokens * lunaStandardUsdPerMillion.cacheWriteInput +
      usage.outputTokens * lunaStandardUsdPerMillion.output) /
    1_000_000
  );
}

function evalObservation(observation: OpenAIResolverObservation): ResolverObservation {
  const usage = observation.usage;
  const normalizedUsage =
    usage === undefined
      ? undefined
      : {
          inputTokens: usage.inputTokens,
          cachedInputTokens: usage.cachedInputTokens,
          cacheWriteInputTokens: usage.cacheWriteInputTokens,
          outputTokens: usage.outputTokens,
        };
  const costUsd =
    normalizedUsage === undefined ? undefined : hostedCost(observation.model, normalizedUsage);
  return {
    model: observation.model,
    ...(observation.rawModelOutput === undefined
      ? {}
      : { rawModelOutput: observation.rawModelOutput }),
    ...(normalizedUsage === undefined ? {} : { usage: normalizedUsage }),
    ...(costUsd === undefined ? {} : { costUsd }),
    ...(observation.error === undefined ? {} : { error: observation.error }),
  };
}

/** Hosted resolver plus a sequential observation drain for raw-output and cost reporting. */
export interface HostedEvalResolver {
  /** OpenPrefs-compatible hosted resolver. */
  readonly resolver: PreferencesResolver;
  /** Removes and returns evidence for the most recently completed sequential case. */
  readonly takeObservation: () => ResolverObservation | undefined;
}

/**
 * Creates the optional Responses API resolver used only when an API key is explicitly available.
 *
 * @param options - Server-side API key and selected model id.
 * @returns Resolver and observation drain used by the generic harness.
 */
export function createHostedEvalResolver(options: {
  readonly apiKey: string;
  readonly model: string;
}): HostedEvalResolver {
  const observations: ResolverObservation[] = [];
  return {
    resolver: createOpenAIResolver({
      apiKey: options.apiKey,
      model: options.model,
      timeoutMs: 30_000,
      onObservation(observation) {
        observations.push(evalObservation(observation));
      },
    }),
    takeObservation() {
      return observations.shift();
    },
  };
}
