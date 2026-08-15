import type { PreferencesManifest } from "./manifest";

/** OpenPrefs-specific behavior attached to a preference definition. */
export interface OpenPrefsMetadata {
  /** Marks preference values that callers should avoid exposing unnecessarily. */
  readonly sensitive?: boolean;

  /** Requires confirmation before a later policy phase may apply a proposed change. */
  readonly confirmation?: "required";
}

/** Describes a boolean preference and its optional default value. */
export interface BooleanPreferenceDefinition {
  /** Discriminates a boolean preference definition. */
  readonly type: "boolean";

  /** Provides the host application's presentational label for the preference. */
  readonly label?: string;

  /** Explains the preference's meaning to a resolver. */
  readonly description: string;

  /** Documents the host application's default value. */
  readonly default?: boolean;

  /** Carries OpenPrefs-specific behavior separately from the value description. */
  readonly openPrefs?: OpenPrefsMetadata;
}

/** Describes a string preference, including an optional finite set of legal values. */
export interface StringPreferenceDefinition {
  /** Discriminates a string preference definition. */
  readonly type: "string";

  /** Provides the host application's presentational label for the preference. */
  readonly label?: string;

  /** Explains the preference's meaning to a resolver. */
  readonly description: string;

  /**
   * Restricts legal values to this non-empty, duplicate-free list.
   *
   * Values are stored in declaration order. Resolvers MAY treat their positions as ordinal when
   * interpreting relative requests.
   */
  readonly enum?: readonly string[];

  /** Documents the host application's default value. */
  readonly default?: string;

  /** Carries OpenPrefs-specific behavior separately from the value description. */
  readonly openPrefs?: OpenPrefsMetadata;
}

/** Describes a numeric preference and its optional inclusive bounds. */
export interface NumberPreferenceDefinition {
  /** Discriminates a numeric preference definition. */
  readonly type: "number";

  /** Provides the host application's presentational label for the preference. */
  readonly label?: string;

  /** Explains the preference's meaning to a resolver. */
  readonly description: string;

  /** Defines the inclusive lower bound for legal values. */
  readonly minimum?: number;

  /** Defines the inclusive upper bound for legal values. */
  readonly maximum?: number;

  /** Documents the host application's default value. */
  readonly default?: number;

  /** Carries OpenPrefs-specific behavior separately from the value description. */
  readonly openPrefs?: OpenPrefsMetadata;
}

/**
 * Describes exactly one supported OpenPrefs preference value.
 *
 * The `type` property discriminates the exhaustive v0.x union.
 */
export type PreferenceDefinition =
  | BooleanPreferenceDefinition
  | StringPreferenceDefinition
  | NumberPreferenceDefinition;

/** Maps stable preference ids to their semantic definitions. */
export type PreferenceDefinitions = Readonly<Record<string, PreferenceDefinition>>;

/**
 * Resolves the runtime value type represented by a preference definition.
 *
 * String enums narrow to the literal union of their declared members.
 */
export type PreferenceValue<Definition extends PreferenceDefinition> =
  Definition extends BooleanPreferenceDefinition
    ? boolean
    : Definition extends StringPreferenceDefinition
      ? Definition extends { readonly enum: readonly (infer Value extends string)[] }
        ? Value
        : string
      : Definition extends NumberPreferenceDefinition
        ? number
        : never;

/**
 * Derives the discriminated preference-change union exposed by a manifest.
 *
 * Each manifest id is paired with the value type produced by {@link PreferenceValue}, preserving
 * enum literals so narrowing on `id` also narrows `value`.
 *
 * @example
 * ```ts
 * const preferences = definePreferences({
 *   theme: {
 *     type: "string",
 *     description: "The application color theme.",
 *     enum: ["light", "dark", "system"],
 *   },
 *   compactMode: {
 *     type: "boolean",
 *     description: "Whether the application uses a compact layout.",
 *   },
 * });
 *
 * type Change = PreferenceChangeFor<typeof preferences>;
 * // Equivalent to:
 * type Expected =
 *   | { readonly id: "theme"; readonly value: "light" | "dark" | "system" }
 *   | { readonly id: "compactMode"; readonly value: boolean };
 * ```
 */
export type PreferenceChangeFor<Manifest extends PreferencesManifest> =
  Manifest extends PreferencesManifest<infer Definitions>
    ? {
        readonly [Id in keyof Definitions & string]: {
          readonly id: Id;
          readonly value: PreferenceValue<Definitions[Id]>;
        };
      }[keyof Definitions & string]
    : never;

/**
 * Produces the partial state shape described by a normalized manifest.
 *
 * Each preference id maps to the value type of its definition; omitted ids represent values that
 * the host has not supplied.
 */
export type PreferencesState<Manifest extends PreferencesManifest> =
  Manifest extends PreferencesManifest<infer Definitions>
    ? Partial<{
        -readonly [Id in keyof Definitions]: PreferenceValue<Definitions[Id]>;
      }>
    : never;
