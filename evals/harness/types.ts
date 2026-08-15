import type {
  OpenPrefsPolicy,
  OpenPrefsResult,
  PreferenceChange,
  PreferencesAdapter,
  PreferencesManifest,
  PreferencesResolver,
} from "../../src/index.js";

/** The nine resolver-quality classes defined by specification section 53. */
export type EvalClass =
  | "direct"
  | "synonym"
  | "multiSetting"
  | "relative"
  | "goalOriented"
  | "ambiguous"
  | "unsupported"
  | "adversarial"
  | "contradictory";

/** Primitive preference value supported by OpenPrefs v0.x. */
export type EvalValue = boolean | string | number;

/** Host-owned state supplied to the full OpenPrefs request pipeline. */
export type EvalState = Readonly<Record<string, EvalValue>>;

/** Exact successful lifecycle expectation and its complete change set. */
export interface SuccessfulExpectation {
  /** Lifecycle status a host must observe after validation and policy. */
  readonly status: "applied" | "confirmation_required";
  /** Complete order-independent set of expected preference mutations. */
  readonly changes: readonly PreferenceChange[];
}

/** Exact non-mutating lifecycle expectation. */
export interface NonMutatingExpectation {
  /** Lifecycle status a host must observe. */
  readonly status: "needs_clarification" | "unsupported" | "rejected" | "failed";
  /** Requires the host adapter to receive no changes for this case. */
  readonly noChangesApplied: true;
}

/** Literal, mechanically scored expectation for one eval case. */
export type EvalExpectation = SuccessfulExpectation | NonMutatingExpectation;

/** Mutually exclusive exact-accuracy outcome assigned to one eval case. */
export type EvalOutcome = "passed" | "clarified" | "failed";

/** One isolated natural-language resolver-quality case. */
export interface EvalCase {
  /** Stable case id used in reports and regression comparisons. */
  readonly id: string;
  /** Section 53 quality class. */
  readonly class: EvalClass;
  /** Natural-language request passed unmodified to `openPrefs.request()`. */
  readonly input: string;
  /** Exact lifecycle outcome required for a pass. */
  readonly expected: EvalExpectation;
  /** Per-case host-state overrides, primarily for relative requests. */
  readonly startingState?: Readonly<Partial<Record<string, EvalValue>>>;
}

/** Token counts reported by an optional hosted resolver observation hook. */
export interface ResolverTokenUsage {
  /** Total provider input tokens, including cached and cache-write tokens. */
  readonly inputTokens: number;
  /** Input tokens read from a provider cache. */
  readonly cachedInputTokens: number;
  /** Input tokens written into a provider cache. */
  readonly cacheWriteInputTokens: number;
  /** Total provider output tokens, including hidden reasoning tokens when billed as output. */
  readonly outputTokens: number;
}

/** Optional provider evidence captured after one resolver call. */
export interface ResolverObservation {
  /** Provider model id used for the call. */
  readonly model?: string;
  /** Exact model-produced text before JSON parsing. */
  readonly rawModelOutput?: string;
  /** Provider token usage for the call. */
  readonly usage?: ResolverTokenUsage;
  /** Calculated dollar cost for the call when a rate card is known. */
  readonly costUsd?: number;
  /** Provider or parsing diagnostic when no model output was available. */
  readonly error?: string;
}

/** Actual changes visible at the scored lifecycle boundary. */
export interface EvalActual {
  /** Lifecycle status returned by OpenPrefs. */
  readonly status: OpenPrefsResult["status"];
  /** Applied changes or the validated proposal awaiting confirmation. */
  readonly changes: readonly PreferenceChange[];
  /** Changes the host adapter actually received. */
  readonly appliedChanges: readonly PreferenceChange[];
  /** Host-owned preference state observed after the full request lifecycle. */
  readonly finalState: EvalState;
  /** Complete OpenPrefs lifecycle result for diagnostics. */
  readonly result: OpenPrefsResult;
}

/** Mechanically scored result for one eval case. */
export interface EvalCaseResult {
  /** Source case. */
  readonly case: EvalCase;
  /** Exact pass, safe clarification, or failure classification. */
  readonly outcome: EvalOutcome;
  /** Whether the host state exactly matches the case expectation. */
  readonly stateMatchesExpectation: boolean;
  /** Host-owned state required by the literal case expectation. */
  readonly expectedState: EvalState;
  /** Adapter-boundary changes not authorized by this security probe. */
  readonly unauthorizedChanges: readonly PreferenceChange[];
  /** Whether no unauthorized change reached the adapter. */
  readonly securityContained: boolean;
  /** Scored lifecycle evidence. */
  readonly actual: EvalActual;
  /** Optional provider trace for raw-output and cost reporting. */
  readonly observation?: ResolverObservation;
  /** Wall-clock runtime for this case. */
  readonly durationMs: number;
}

/** Pass/clarified/fail exact-accuracy aggregate for one section 53 class. */
export interface EvalClassScore {
  /** Class being aggregated. */
  readonly class: EvalClass;
  /** Number of passing cases. */
  readonly passed: number;
  /** Number of expected-change cases that safely asked for clarification. */
  readonly clarified: number;
  /** Number of cases that neither passed nor safely clarified. */
  readonly failed: number;
  /** Total cases in the class. */
  readonly total: number;
}

/** Exact resolver-accuracy score, independent of security containment. */
export interface ResolverAccuracyScore {
  /** Number of exact passes. */
  readonly passed: number;
  /** Number of safe clarifications that remain non-passing. */
  readonly clarified: number;
  /** Number of failures excluding safe clarifications. */
  readonly failed: number;
  /** Total evaluated cases. */
  readonly total: number;
  /** Optional deterministic accuracy regression floor. */
  readonly threshold?: number;
  /** Whether the exact-pass count met or improved on the floor. */
  readonly meetsThreshold?: boolean;
}

/** Suite-wide adapter-boundary containment score. */
export interface SecurityContainmentScore {
  /** Cases in which no unauthorized adversarial or unsupported change reached the adapter. */
  readonly contained: number;
  /** Total evaluated cases, including cases outside the two security-probe classes. */
  readonly total: number;
  /** Passing adversarial and unsupported adapter-boundary probes. */
  readonly probesContained: number;
  /** Total adversarial and unsupported adapter-boundary probes. */
  readonly probesTotal: number;
  /** Critical failure flag; any containment miss sets it. */
  readonly criticalFailure: boolean;
}

/** Complete human- and machine-readable eval suite report. */
export interface EvalReport {
  /** Resolver label supplied by the caller. */
  readonly resolver: string;
  /** ISO timestamp at the start of the run. */
  readonly runAt: string;
  /** Individual scored cases in execution order. */
  readonly cases: readonly EvalCaseResult[];
  /** Per-class exact-match aggregates. */
  readonly classes: readonly EvalClassScore[];
  /** Exact-match accuracy, with safe clarifications broken out from failures. */
  readonly resolverAccuracy: ResolverAccuracyScore;
  /** Independent adapter-boundary security metric. */
  readonly securityContainment: SecurityContainmentScore;
  /** Sum of hosted token usage when observations supplied it. */
  readonly usage?: ResolverTokenUsage;
  /** Sum of hosted call cost in USD when every observed call had a known rate. */
  readonly totalCostUsd?: number;
}

/** Host adapter and independent state observation used by the eval harness. */
export interface EvalHost {
  /** Host mutation boundary passed to OpenPrefs after instrumentation. */
  readonly adapter: PreferencesAdapter;
  /** Reads complete host state independently of the lifecycle result. */
  readonly readState: () => EvalState | Promise<EvalState>;
}

/** Inputs required to run cases through isolated full OpenPrefs pipelines. */
export interface RunEvalSuiteOptions {
  /** Resolver under measurement. */
  readonly resolver: PreferencesResolver;
  /** Human-readable resolver label. */
  readonly resolverName: string;
  /** Whitelist and value constraints supplied to every pipeline. */
  readonly manifest: PreferencesManifest;
  /** Default host state cloned for every case. */
  readonly startingState: EvalState;
  /** Literal case list to execute in order. */
  readonly cases: readonly EvalCase[];
  /** Policy applied after deterministic proposal validation. */
  readonly policy?: Partial<OpenPrefsPolicy>;
  /** Optional score floor used for deterministic CI regression detection. */
  readonly threshold?: number;
  /** Pulls provider evidence captured by the just-completed resolver call. */
  readonly takeObservation?: () => ResolverObservation | undefined;
  /** Optional host factory used to verify non-standard adapter behaviour. */
  readonly createHost?: (
    startingState: EvalState,
    evalCase: EvalCase,
  ) => EvalHost | Promise<EvalHost>;
}
