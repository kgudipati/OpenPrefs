---
name: openprefs-integrate
description: Discover an application's existing user preferences and generate an evidence-backed OpenPrefs manifest, adapter glue, and review report. Use when integrating OpenPrefs into an existing codebase, auditing a proposed integration, or tracing settings across UI, stores, browser or mobile storage, contexts, databases, and APIs without changing the host application's preference architecture.
---

# STOP: bind to the existing preference system; never change it

**NEVER refactor, migrate, normalize, replace, relocate, or redesign an application's existing
preference implementation to integrate OpenPrefs. Bind to what exists. If preferences are scattered
across a store, localStorage, a server API, and a context, make the adapter scattered too. Adapter
glue is allowed to be ugly. The host application's architecture is the source of truth.**

## Apply the three-tier classification before writing code

Precision outranks coverage. A vague description can resolve to the wrong preference confidently;
an omitted preference fails safely as `unsupported`. Never expose something merely because it is
configurable. Err toward omission.

- **Tier 1 — ACTIVE:** A user preference with evidence for a genuine semantic description, such as
  a UI label, help text, documentation, meaningful comment, or semantically clear API field name.
  Emit an active manifest entry and adapter wiring.
- **Tier 2 — NEEDS SEMANTIC AUTHORING:** A setting traced confidently as a user preference, but with
  no evidence supporting a precise description. Generate complete adapter wiring, but emit its
  manifest entry **commented out** with an inline note naming the evidence found and the semantic
  evidence missing. Activation must require the developer to write one real sentence; never use an
  empty or placeholder description. `definePreferences` rejects empty descriptions.
- **Tier 3 — EXCLUDED:** Internal configuration, including API URLs, debug modes, feature flags,
  pool sizes, rollout or experiment variants, operational thresholds, and developer controls.
  Never place these in the manifest or active adapter dispatch. List each in the report with the
  reason for exclusion.

Read [references/classification-guide.md](references/classification-guide.md) whenever a candidate
is ambiguous. Read [references/description-guide.md](references/description-guide.md) before
authoring any manifest descriptions. Read [references/adapter-patterns.md](references/adapter-patterns.md)
before generating adapter code; choose or combine only the patterns matching the host.

## Workflow

### 1. Establish constraints and integration locations

Read the repository's agent instructions, contribution conventions, package configuration, existing
OpenPrefs integration, and `docs/architecture.md` if present. Treat that architecture document as
authoritative over older product-spec examples. Identify the host's language, module boundaries,
test commands, and existing preference ownership. Do not add a dependency, framework, service,
storage layer, UI, resolver SDK, or abstraction unless the developer explicitly asks for it.

Manual integration remains first-class. A developer may write the manifest and adapter by hand;
this skill is optional assistance, not a required build tool.

### 2. Discover candidates broadly

Search for the places where preference meaning and mechanics are likely to live:

- settings pages, preferences screens, forms, menus, labels, help text, documentation, and tooltips;
- toggles, selects, radios, sliders, inputs, preference components, and their event handlers;
- state stores, reducers, actions, contexts, providers, hooks, and setter functions;
- `localStorage`, `sessionStorage`, AsyncStorage, mobile preferences, files, keychains, and cookies;
- database models, migrations, schemas, API clients, settings endpoints, request types, and field names;
- validation schemas, enum and union types, defaults, numeric bounds, comments, and tests;
- internal configuration nearby, so it can be explicitly excluded rather than accidentally exposed.

Do not search merely for booleans or configurable constants. The goal is to identify settings a user
can control and establish how the application already reads and changes them.

### 3. Trace every candidate end to end

For each candidate, record an evidence trail:

```text
UI control or documented user capability -> state/value -> setter or action -> persistence
```

Capture file and symbol locations for the UI evidence, value type and constraints, read path, setter,
and persistence path. Follow indirection through reducers, contexts, API clients, or serializers.
Call a candidate traced only when the existing mutation route is known. Never bypass a setter to
write its backing store directly when the application normally uses validation, side effects, or an
API. If no setter can be established, generate no adapter mutation and report the untraced candidate.

A preference can be write-only or expensive to read. Adapter `read` is optional and may omit it;
do not invent a read path or restructure the host to create one.

### 4. Classify from evidence, not intuition

Decide Tier 3 first, then distinguish Tier 1 from Tier 2. Configuration is not automatically a user
preference. Confirm that a setting represents an enduring user choice rather than an internal knob.

Require evidence for every description. Identifiers are evidence only when they carry unambiguous
user-facing meaning. `trackingEnabled` could mean analytics, location tracking, shipment tracking,
or internal tracing; without evidence that disambiguates it, classify it as Tier 2. Never expand an
abbreviation, infer a product promise, or fabricate semantics from surrounding code.

When evidence conflicts, prefer the user-visible label/help text for meaning and the executed
setter/validation path for mechanics. Report the conflict. If the conflict makes the capability
boundary uncertain, do not activate it.

### 5. Author precise manifest entries

Use stable ids that map clearly to the host preference. Preserve host types, legal values, inclusive
numeric bounds, and documented defaults. Do not make a constraint broader than the existing setter
accepts.

Descriptions are the dominant resolver input. State what the preference controls in user-facing
terms and carry category information in prose. Prefer:

```ts
description: "Whether notifications are sent for direct messages."
```

over:

```ts
description: "Enables DM notifs."
```

The first says both **notifications** and **direct messages**, which lets a resolver relate it to
other notification settings for requests such as “turn off all social notifications.” Do not stuff
keywords, encode policy, or describe implementation. Use evidence-backed vocabulary users employ.
See the description guide for before/after examples and reasoning.

String enum declaration order is meaningful. Resolvers may treat position as ordinal. Declare
ordered enums in natural order, such as `['small', 'medium', 'large']`, never alphabetically; this is
what makes “make the text bigger” resolvable. Preserve non-ordinal host values without inventing an
order, and state the choices in the description when evidence supports their meaning.

Mark privacy, security, data-sharing, and payment-adjacent preferences with
`openPrefs: { sensitive: true }`. Add `confirmation: "required"` to anything irreversible or
account-affecting. Consult `docs/architecture.md`: `sensitive` is a classification whose effect
depends on the global confirmation mode; `confirmation: "required"` is an unconditional floor that
global policy cannot weaken. Add both when both apply.

For every Tier 2 candidate, emit a commented block at the intended manifest location:

```ts
// Tier 2: traced from TrackingToggle -> setTrackingEnabled -> preferences storage.
// Missing: evidence identifying what "tracking" means. Write a precise description to activate.
// trackingEnabled: {
//   type: "boolean",
//   description: "REPLACE WITH EVIDENCE-BACKED USER-FACING MEANING",
// },
```

The placeholder must remain commented out. Never activate placeholder prose.

### 6. Generate adapter glue against existing operations

Call the same getters, setters, dispatchers, context methods, serializers, and API clients that the
application already uses. Preserve their sync/async behavior and partial-failure semantics. It is
correct for one adapter to branch across unrelated mechanisms.

Generate complete Tier 2 handlers while keeping them unreachable from OpenPrefs until their
manifest entries are activated. In TypeScript, a manifest-derived adapter narrows changes to active
ids, so use a loose `PreferencesAdapter` boundary plus explicit runtime type guards when inactive
Tier 2 handlers must compile. OpenPrefs still whitelists against the active manifest before calling
the adapter. Do not use casts to suppress the type system. If there are no Tier 2 entries, prefer
`PreferencesAdapter<typeof preferences>` for manifest-derived narrowing.

Every generated `apply` switch must have a `default` case that appends a failure containing the
actual unhandled id. A JSON-parsed manifest can yield loose ids without an exhaustiveness guarantee;
without `default`, an unhandled id may be silently reported as applied.

Return `{ ok: true }` only when every submitted change succeeded. `{ success: true }` and
`{ failed: [] }` are **not valid success shapes**. Return `{ ok: false, failed }` with a non-empty
failure list for rejected or unhandled changes. `docs/architecture.md` is authoritative over the
older product specification on this contract. Catch independent per-change failures when the host
can report them accurately; do not add rollback or transactions the host does not already provide.

### 7. Keep resolver ownership with the developer

OpenPrefs ships no resolver. The developer must supply one. Point them to the repository's examples
for a scripted and a hosted resolver. The resolver returns data only and remains untrusted; it cannot
create capabilities absent from the manifest.

If the developer copies the hosted resolver, warn them that its resolver instructions are
load-bearing for adversarial containment. They must not trim those instructions without rerunning
the adversarial eval class. Do not add a model, inference SDK, backend, or provider dependency as
part of this integration.

### 8. Verify and report

Run the repository's formatter, typecheck, tests, build, and any integration checks that do not
require a model. Test adapter success, failures, every active id, Tier 2 handler mechanics where
possible, and default/unhandled-id failure behavior. Do not require an LLM in tests.

Produce a developer-facing report containing:

1. Counts for Tier 1, Tier 2, and Tier 3.
2. Every Tier 1 entry with its description evidence and traced mutation path.
3. Every Tier 2 entry with the evidence found, the missing semantic evidence, and its completed
   adapter binding.
4. Every Tier 3 exclusion with the reason it is internal configuration.
5. Every candidate that could not be traced to a setter or persistence path.
6. Sensitive and confirmation-required choices, unresolved conflicts, verification results, and
   the resolver the developer still needs to supply.

Before shipping, require the developer to review the semantic boundary explicitly. The goal is not
zero human involvement. The developer must know exactly which capabilities they are exposing to
natural language, activate Tier 2 entries only with real prose, and approve every exclusion and
sensitive/confirmation classification.
