import type { PreferencesResolver, ResolveInput, ResolveResult } from "../../src/index";

/**
 * Deterministic resolver test double backed only by exact input-string lookup.
 *
 * It performs no inference, heuristics, network calls, or fallback preference invention.
 */
export class ScriptedResolver implements PreferencesResolver {
  readonly #scripts: ReadonlyMap<string, ResolveResult>;

  /** Every input received by the resolver, retained for integration assertions. */
  readonly inputs: ResolveInput[] = [];

  /** Creates a resolver from fixed natural-language strings and fixed outcomes. */
  constructor(scripts: Readonly<Record<string, ResolveResult>>) {
    this.#scripts = new Map(Object.entries(scripts));
  }

  /** Returns the exact scripted result, or unsupported when no script exists. */
  async resolve(input: ResolveInput): Promise<ResolveResult> {
    this.inputs.push(input);
    return this.#scripts.get(input.text) ?? { status: "unsupported" };
  }
}
