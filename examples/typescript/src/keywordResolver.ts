import type {
  PreferenceDefinition,
  PreferencesManifest,
  PreferencesResolver,
  ResolveInput,
  ResolveResult,
} from "openprefs";

type Primitive = boolean | string | number;

interface SearchablePreference {
  readonly id: string;
  readonly definition: PreferenceDefinition;
  readonly idTerms: ReadonlySet<string>;
  readonly descriptionTerms: ReadonlySet<string>;
}

interface ClauseTerms {
  readonly normalized: string;
  readonly direct: ReadonlySet<string>;
  readonly expanded: ReadonlySet<string>;
}

type ValueResolution =
  | { readonly status: "resolved"; readonly value: Primitive }
  | { readonly status: "needs_clarification"; readonly question: string };

const stopWords = new Set([
  "a",
  "an",
  "are",
  "be",
  "for",
  "i",
  "is",
  "it",
  "make",
  "my",
  "of",
  "please",
  "set",
  "the",
  "to",
  "turn",
  "use",
  "whether",
]);

const synonymGroups: readonly (readonly string[])[] = [
  ["ad", "advertising", "marketing", "promotion", "promotional"],
  ["alert", "notification", "message"],
  ["analytics", "diagnostics", "telemetry", "usage"],
  ["appearance", "color", "colour", "mode", "theme"],
  ["automatic", "system"],
  ["comfortable", "roomy", "spacious"],
  ["compact", "dense", "tight"],
  ["connection", "contact", "friend"],
  ["dark", "night"],
  ["enable", "enabled", "on"],
  ["disable", "disabled", "off"],
  ["large", "big"],
  ["light", "bright"],
  ["location", "position"],
  ["motion", "animation"],
  ["private", "hidden"],
  ["profile", "account"],
  ["release", "update", "news"],
  ["security", "safety"],
  ["share", "send"],
  ["small", "little"],
  ["sound", "volume", "loudness"],
  ["text", "font", "type"],
  ["visibility", "audience"],
];

const orderedEnumScales: readonly (readonly string[])[] = [["small", "medium", "large"]];

function singularize(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function directTerms(text: string): ReadonlySet<string> {
  const separated = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  const matches = separated.match(/[a-z0-9]+/g) ?? [];
  return new Set(matches.map(singularize).filter((term) => !stopWords.has(term)));
}

function relatedTerms(term: string): readonly string[] {
  for (const group of synonymGroups) {
    if (group.includes(term)) {
      return group;
    }
  }
  return [term];
}

function expandTerms(terms: ReadonlySet<string>): ReadonlySet<string> {
  const expanded = new Set<string>();
  for (const term of terms) {
    for (const related of relatedTerms(term)) {
      expanded.add(related);
    }
  }
  return expanded;
}

function clauseTerms(clause: string): ClauseTerms {
  const direct = directTerms(clause);
  return {
    normalized: clause.toLowerCase(),
    direct,
    expanded: expandTerms(direct),
  };
}

function searchablePreferences(input: {
  readonly preferences: PreferencesManifest;
}): readonly SearchablePreference[] {
  const entries: SearchablePreference[] = [];
  for (const id of input.preferences.ids()) {
    const definition = input.preferences.get(id);
    if (definition !== undefined) {
      entries.push({
        id,
        definition,
        idTerms: directTerms(id),
        descriptionTerms: directTerms(definition.description),
      });
    }
  }
  return entries;
}

function targetScore(entry: SearchablePreference, terms: ClauseTerms): number {
  let score = 0;
  for (const term of terms.direct) {
    const alternatives = relatedTerms(term);
    if (alternatives.some((alternative) => entry.idTerms.has(alternative))) {
      score += 4;
    }
    if (alternatives.some((alternative) => entry.descriptionTerms.has(alternative))) {
      score += 1;
    }
  }
  return score;
}

function valueTermsMatch(value: string, clause: ClauseTerms): boolean {
  const expected = directTerms(value);
  for (const term of expected) {
    const alternatives = relatedTerms(term);
    if (!alternatives.some((alternative) => clause.expanded.has(alternative))) {
      return false;
    }
  }
  return expected.size > 0;
}

function matchingEnumValues(
  definition: PreferenceDefinition,
  terms: ClauseTerms,
): readonly string[] {
  if (definition.type !== "string" || definition.enum === undefined) {
    return [];
  }
  return definition.enum.filter((value) => valueTermsMatch(value, terms));
}

function hasAny(terms: ClauseTerms, values: readonly string[]): boolean {
  return values.some((value) => terms.direct.has(value));
}

function relativeDirection(terms: ClauseTerms): -1 | 0 | 1 | "ambiguous" {
  const increase = hasAny(terms, ["bigger", "increase", "larger", "more", "up"]);
  const decrease = hasAny(terms, ["decrease", "less", "lower", "smaller", "down"]);
  if (increase && decrease) {
    return "ambiguous";
  }
  if (increase) {
    return 1;
  }
  if (decrease) {
    return -1;
  }
  return 0;
}

function orderedScale(values: readonly string[]): readonly string[] | undefined {
  return orderedEnumScales.find(
    (scale) => scale.length === values.length && scale.every((value) => values.includes(value)),
  );
}

function resolveRelativeEnum(
  entry: SearchablePreference,
  values: readonly string[],
  direction: -1 | 1,
  current: Primitive | undefined,
): ValueResolution {
  const scale = orderedScale(values);
  if (scale === undefined) {
    return {
      status: "needs_clarification",
      question: `What value should ${entry.id} use?`,
    };
  }
  if (typeof current !== "string") {
    return {
      status: "needs_clarification",
      question: `What is the current ${entry.id}, or which exact value should it use?`,
    };
  }
  const currentIndex = scale.indexOf(current);
  const next = scale[currentIndex + direction];
  if (currentIndex < 0 || next === undefined) {
    return {
      status: "needs_clarification",
      question: `${entry.id} cannot move farther in that direction. Which value should it use?`,
    };
  }
  return { status: "resolved", value: next };
}

function numericValues(terms: ClauseTerms): readonly number[] {
  const matches = terms.normalized.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return [...new Set(matches.map(Number).filter(Number.isFinite))];
}

function resolveValue(
  entry: SearchablePreference,
  terms: ClauseTerms,
  current: Primitive | undefined,
): ValueResolution {
  const enumMatches = matchingEnumValues(entry.definition, terms);
  if (enumMatches.length > 1) {
    return {
      status: "needs_clarification",
      question: `Which ${entry.id} value did you mean: ${enumMatches.join(" or ")}?`,
    };
  }
  const enumMatch = enumMatches[0];
  if (enumMatch !== undefined) {
    return { status: "resolved", value: enumMatch };
  }

  const direction = relativeDirection(terms);
  if (direction === "ambiguous") {
    return {
      status: "needs_clarification",
      question: `Should ${entry.id} increase or decrease?`,
    };
  }

  switch (entry.definition.type) {
    case "boolean": {
      const enable = hasAny(terms, ["allow", "enable", "enabled", "on", "show", "start"]);
      const disable = hasAny(terms, ["block", "disable", "disabled", "hide", "no", "off", "stop"]);
      if (enable === disable) {
        return {
          status: "needs_clarification",
          question: `Should ${entry.id} be on or off?`,
        };
      }
      return { status: "resolved", value: enable };
    }
    case "number": {
      if (hasAny(terms, ["maximum", "max"]) && entry.definition.maximum !== undefined) {
        return { status: "resolved", value: entry.definition.maximum };
      }
      if (hasAny(terms, ["minimum", "min"]) && entry.definition.minimum !== undefined) {
        return { status: "resolved", value: entry.definition.minimum };
      }
      const numbers = numericValues(terms);
      if (numbers.length === 1 && numbers[0] !== undefined) {
        return { status: "resolved", value: numbers[0] };
      }
      return {
        status: "needs_clarification",
        question: `What numeric value should ${entry.id} use?`,
      };
    }
    case "string": {
      if (direction !== 0 && entry.definition.enum !== undefined) {
        return resolveRelativeEnum(entry, entry.definition.enum, direction, current);
      }
      return {
        status: "needs_clarification",
        question: `What value should ${entry.id} use?`,
      };
    }
  }
}

function splitClauses(text: string): readonly string[] {
  return text
    .split(/\s+(?:and|also|plus)\s+|[,;]/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function resolutionForClause(
  clause: string,
  entries: readonly SearchablePreference[],
  current: Readonly<object> | undefined,
): ResolveResult {
  const terms = clauseTerms(clause);
  const candidates = entries
    .map((entry) => ({
      entry,
      score: targetScore(entry, terms) + matchingEnumValues(entry.definition, terms).length * 6,
    }))
    .filter((candidate) => candidate.score > 0);

  if (candidates.length === 0) {
    return { status: "unsupported" };
  }

  const bestScore = Math.max(...candidates.map(({ score }) => score));
  const best = candidates.filter(({ score }) => score === bestScore);
  if (best.length !== 1 || best[0] === undefined) {
    return {
      status: "needs_clarification",
      question: `Which preference did you mean: ${best.map(({ entry }) => entry.id).join(", ")}?`,
    };
  }

  const { entry } = best[0];
  const descriptor =
    current === undefined ? undefined : Object.getOwnPropertyDescriptor(current, entry.id);
  const currentValue = descriptor?.value;
  const value = resolveValue(
    entry,
    terms,
    typeof currentValue === "boolean" ||
      typeof currentValue === "string" ||
      typeof currentValue === "number"
      ? currentValue
      : undefined,
  );
  if (value.status === "needs_clarification") {
    return value;
  }
  return { status: "resolved", changes: [{ id: entry.id, value: value.value }] };
}

/**
 * Resolves intent using deterministic manifest terms, enum values, and explicit synonym groups.
 *
 * @param input - User text, manifest definitions, and optional current values from OpenPrefs.
 * @returns A proposal only when every clause selects one preference and one value.
 */
export function resolveWithKeywords<Manifest extends PreferencesManifest>(
  input: ResolveInput<Manifest>,
): ResolveResult {
  const entries = searchablePreferences(input);
  const changes = new Map<string, Primitive>();

  for (const clause of splitClauses(input.text)) {
    const resolution = resolutionForClause(clause, entries, input.current);
    if (resolution.status !== "resolved") {
      return resolution;
    }
    for (const change of resolution.changes) {
      const previous = changes.get(change.id);
      if (previous !== undefined && previous !== change.value) {
        return {
          status: "needs_clarification",
          question: `You requested conflicting values for ${change.id}. Which one should be used?`,
        };
      }
      changes.set(change.id, change.value);
    }
  }

  if (changes.size === 0) {
    return { status: "unsupported" };
  }
  return {
    status: "resolved",
    changes: [...changes].map(([id, value]) => ({ id, value })),
  };
}

/** Deterministic, network-free resolver used by the example and its CI tests. */
export const keywordResolver: PreferencesResolver = {
  async resolve(input) {
    return resolveWithKeywords(input);
  },
};
