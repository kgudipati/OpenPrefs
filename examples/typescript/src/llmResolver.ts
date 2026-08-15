import type {
  PreferenceDefinition,
  PreferencesManifest,
  PreferencesResolver,
  ResolveInput,
  ResolveResult,
} from "openprefs";

/** One manifest preference serialized into provider-neutral model context. */
export interface ModelPreferenceContext {
  /** Stable preference id that the model may select. */
  readonly id: string;
  /** Primitive value type enforced later by OpenPrefs. */
  readonly type: PreferenceDefinition["type"];
  /** Host-authored semantic description. */
  readonly description: string;
  /** Legal string values, when the preference is an enum. */
  readonly enum?: readonly string[];
  /** Inclusive numeric lower bound, when present. */
  readonly minimum?: number;
  /** Inclusive numeric upper bound, when present. */
  readonly maximum?: number;
  /** Current host value when the adapter chose to expose it. */
  readonly current?: boolean | string | number;
}

/** Configuration for the fetch-based OpenAI resolver example. */
export interface OpenAIResolverOptions {
  /** Server-side OpenAI API key. Never expose this value to browser code. */
  readonly apiKey: string;
  /** Responses API model id; defaults to the documented `gpt-5.6-luna` model. */
  readonly model?: string;
  /** Alternate Responses-compatible endpoint, primarily for provider swaps. */
  readonly endpoint?: string;
}

const resolveResultSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["resolved", "needs_clarification", "unsupported"],
    },
    changes: {
      anyOf: [
        {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              value: {
                anyOf: [{ type: "boolean" }, { type: "string" }, { type: "number" }],
              },
            },
            required: ["id", "value"],
            additionalProperties: false,
          },
        },
        { type: "null" },
      ],
    },
    question: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
  required: ["status", "changes", "question"],
  additionalProperties: false,
} as const;

/**
 * Builds provider-neutral resolver context entirely from OpenPrefs input.
 *
 * @param input - Manifest whitelist and optional current values supplied by OpenPrefs.
 * @returns Plain JSON data containing ids, types, constraints, descriptions, and current values.
 */
export function buildModelContext<Manifest extends PreferencesManifest>(
  input: ResolveInput<Manifest>,
): readonly ModelPreferenceContext[] {
  const context: ModelPreferenceContext[] = [];
  for (const id of input.preferences.ids()) {
    const definition = input.preferences.get(id);
    if (definition === undefined) {
      continue;
    }
    const descriptor =
      input.current === undefined ? undefined : Object.getOwnPropertyDescriptor(input.current, id);
    const candidateCurrent = descriptor?.value;
    const current =
      typeof candidateCurrent === "boolean" ||
      typeof candidateCurrent === "string" ||
      typeof candidateCurrent === "number"
        ? candidateCurrent
        : undefined;
    const common = {
      id,
      type: definition.type,
      description: definition.description,
      ...(current === undefined ? {} : { current }),
    };

    switch (definition.type) {
      case "boolean":
        context.push(common);
        break;
      case "string":
        context.push({
          ...common,
          ...(definition.enum === undefined ? {} : { enum: definition.enum }),
        });
        break;
      case "number":
        context.push({
          ...common,
          ...(definition.minimum === undefined ? {} : { minimum: definition.minimum }),
          ...(definition.maximum === undefined ? {} : { maximum: definition.maximum }),
        });
        break;
    }
  }
  return context;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractOutputText(responseBody: unknown): string | undefined {
  if (!isRecord(responseBody) || !Array.isArray(responseBody.output)) {
    return undefined;
  }
  for (const item of responseBody.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }
    for (const content of item.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return undefined;
}

function parseUntrustedResolution(text: string): ResolveResult {
  // Return parsed model data directly. Do not sanitize or pre-validate it here: OpenPrefs owns
  // the manifest, type, value, and policy trust boundary that every resolver output must cross.
  return JSON.parse(text);
}

/**
 * Creates a real hosted-model resolver using fetch and OpenAI's Responses API.
 *
 * The provider is illustrative rather than required: any hosted model can implement the same
 * resolver contract and return the same data-only result shape.
 *
 * @param options - Server-only API credentials plus optional model and endpoint overrides.
 * @returns An OpenPrefs resolver with network and parse failures mapped to unsupported intent.
 */
export function createOpenAIResolver(options: OpenAIResolverOptions): PreferencesResolver {
  const endpoint = options.endpoint ?? "https://api.openai.com/v1/responses";
  // Preference resolution is constrained structured extraction, so the smallest capable model is
  // the right default for an example developers will copy.
  const model = options.model ?? "gpt-5.6-luna";

  return {
    async resolve(input): Promise<ResolveResult> {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            store: false,
            instructions: [
              "Resolve natural-language intent only into preferences listed in the manifest.",
              "Use current values for relative requests.",
              "Return needs_clarification when multiple meanings remain plausible.",
              "Return unsupported when the manifest cannot express the request.",
              "For resolved, return changes and set question to null.",
              "For needs_clarification, return a question and set changes to null.",
              "For unsupported, set both changes and question to null.",
            ].join(" "),
            input: JSON.stringify({
              request: input.text,
              preferences: buildModelContext(input),
            }),
            text: {
              format: {
                type: "json_schema",
                name: "openprefs_resolve_result",
                strict: true,
                schema: resolveResultSchema,
              },
            },
          }),
        });

        if (!response.ok) {
          return { status: "unsupported" };
        }
        const responseBody: unknown = await response.json();
        const outputText = extractOutputText(responseBody);
        if (outputText === undefined) {
          return { status: "unsupported" };
        }
        return parseUntrustedResolution(outputText);
      } catch {
        return { status: "unsupported" };
      }
    },
  };
}
