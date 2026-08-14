import type { PreferenceDefinition, PreferenceDefinitions } from "./types";

const manifestDefinitions: unique symbol = Symbol("OpenPrefs manifest definitions");

/**
 * Provides immutable, read-only access to normalized preference definitions.
 *
 * The generic definition map is retained for type-level helpers while the runtime API remains
 * limited to membership, lookup, and stable id enumeration.
 */
export interface PreferencesManifest<
  Definitions extends PreferenceDefinitions = PreferenceDefinitions,
> {
  readonly [manifestDefinitions]?: Definitions;

  /**
   * Reports whether the manifest exposes a preference id.
   *
   * @param id - The preference id to test.
   * @returns `true` only for an own definition in this manifest.
   */
  has(id: string): boolean;

  /**
   * Reads a frozen preference definition.
   *
   * @param id - The preference id to look up.
   * @returns The definition when present, otherwise `undefined`.
   */
  get(id: string): PreferenceDefinition | undefined;

  /**
   * Lists the manifest's preference ids in definition order.
   *
   * @returns A frozen, immutable array of ids.
   */
  ids(): readonly string[];
}

class FrozenPreferencesManifest<Definitions extends PreferenceDefinitions>
  implements PreferencesManifest<Definitions>
{
  declare readonly [manifestDefinitions]?: Definitions;

  readonly #definitions: Readonly<Record<string, PreferenceDefinition>>;
  readonly #ids: readonly string[];

  constructor(definitions: Record<string, PreferenceDefinition>, ids: string[]) {
    this.#definitions = Object.freeze(definitions);
    this.#ids = Object.freeze(ids);
    Object.freeze(this);
  }

  has(id: string): boolean {
    return Object.hasOwn(this.#definitions, id);
  }

  get(id: string): PreferenceDefinition | undefined {
    return this.has(id) ? this.#definitions[id] : undefined;
  }

  ids(): readonly string[] {
    return this.#ids;
  }
}

/**
 * Creates the immutable read representation for normalized preference definitions.
 *
 * @param definitions - A record containing only validated, frozen definitions.
 * @param ids - The validated preference ids in definition order.
 * @returns An immutable manifest retaining the caller's literal definition types.
 */
export function createPreferencesManifest<const Definitions extends PreferenceDefinitions>(
  definitions: Record<string, PreferenceDefinition>,
  ids: string[],
): PreferencesManifest<Definitions> {
  return new FrozenPreferencesManifest<Definitions>(definitions, ids);
}
