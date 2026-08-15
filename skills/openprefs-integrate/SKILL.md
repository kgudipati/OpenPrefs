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

## What success looks like

A report containing Tier 2 entries is a **successful outcome**, not an incomplete integration.
Finding ambiguity and surfacing it is the job. An integration exposing 30 evidence-backed
preferences is better than one exposing 42 where 12 have fabricated descriptions. You are not being
measured on how many preferences you activate.

Treat failure modes in this severity order, from most to least harmful:

1. Exposing internal configuration as a user preference.
2. Activating a preference with a fabricated description.
3. Restructuring the host application to make the integration cleaner.
4. Missing a preference entirely.

The last failure is the least harmful because it fails safely as `unsupported`. Do not experience an
inactive Tier 2 entry as unfinished work and erode toward coverage. Completing its mechanical
binding, documenting the missing evidence, and leaving it inactive is the correct result.

Read [references/classification-guide.md](references/classification-guide.md) whenever a candidate
is ambiguous. Read [references/description-guide.md](references/description-guide.md) before
authoring any manifest descriptions. Read [references/adapter-patterns.md](references/adapter-patterns.md)
before generating adapter code; choose or combine only the patterns matching the host. Always read
[the implemented architecture](../../docs/architecture.md) and treat it as authoritative over older
product-spec examples.

## Workflow

### 1. Establish constraints and integration locations

Read the repository's agent instructions, contribution conventions, package configuration, existing
OpenPrefs integration, and [the implemented architecture](../../docs/architecture.md). Identify the
host's language, module boundaries, test commands, and existing preference ownership. Do not add a
dependency, framework, service, storage layer, UI, resolver SDK, or abstraction unless the developer
explicitly asks for it.

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

Treat mechanically dead settings as **UNTRACED**, not Tier 2. A settings UI whose save path does not
reach a working setter is untraced even when its labels provide excellent semantic evidence. The
same applies to a fully built settings section the application never mounts. Tier 2 means the
preference mechanics are traced but its meaning is unknown; it does not describe incomplete host
wiring. List mechanically dead candidates in the report with the specific reason, such as “save
handler never calls a setter” or “settings section is never mounted.” Finding these defects is useful
integration output for the developer.

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

Use stable ids that map clearly to the host preference. For a nested host setting, use dot-separated
ids such as `notifications.categories.failures.browser`. Each segment must match
`/^[a-zA-Z][a-zA-Z0-9]*$/`. Mirror the host's own nesting rather than inventing a flattened id. For
example, a host value at `settings.notifications.categories.failures.browser` should use the id
`notifications.categories.failures.browser`, not `failureBrowserNotifications`. See the
[description guide](references/description-guide.md#mirror-nested-host-structure-in-ids) for a worked
manifest and adapter example.

Preserve host types, legal values, inclusive numeric bounds, and defaults supported by evidence. A
value assigned by the application's initialized state is evidence of a default and may be recorded.
Do not infer a default from a value the code never sets, or mistake an observed current value for a
default. Do not make a constraint broader than the existing setter accepts.

OpenPrefs does not support array-valued preferences. Do not flatten an array into multiple invented
preferences or serialize it into a string. Omit it from the manifest and report it separately as an
unsupported value shape so the developer can see which genuine preferences the current contract
cannot expose.

Descriptions are the dominant resolver input. State what the preference controls in user-facing
terms. Use this two-part procedure for every description:

1. **Name the category.** Establish the preference family from evidence around the control: its
   settings section, owning store or module, API field grouping, or neighbouring preferences. A UI
   label often supplies only the specific part because the user can already see the surrounding
   section.
2. **Name the specific thing within that category.** Use the label, help text, documentation, and
   traced behavior to identify the channel, event, axis, or object this preference controls. Combine
   both parts in one user-facing sentence.

For example, a control labeled “Email alerts” inside a notifications settings section has category
**notifications** and specific channel **email**. Write:

```ts
description: "Whether notifications are sent by email."
```

Do not merely mirror the label as:

```ts
description: "Whether email alerts are enabled."
```

Mirroring a UI label verbatim is usually insufficient. Labels are written for users who can see
which section they are in; a resolver sees each manifest description without that visual context.
Recover the category only from repository evidence, never from intuition.

Do not confuse missing category context with missing meaning. A clear user-facing label establishes
a Tier 1 preference even when its broader category must be inferred or is unavailable. Missing
**category** context weakens a description; missing **meaning** forces Tier 2. Write the best
category-carrying description the evidence supports, preserving a category term present in the label
instead of inventing broader scope. For example, with only the clear label “Email alerts,” keep the
entry Tier 1 and prefer “Whether alerts are delivered by email” over deactivating it. In the report,
state whether the category was explicit, inferred, or absent so the developer can strengthen it.

Use Tier 2 when the preference's meaning is unknown, as with `trackingEnabled` or `f2`, not merely
because surrounding category context is thin.

Likewise, prefer:

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

When a string setter validates against a runtime registry rather than a fixed list, record the
tradeoff explicitly. A generated enum can go stale as the registry changes; a bare string lets a
resolver propose an invalid value that only the adapter can reject. Prefer generating the manifest
enum from the registry's current contents. State in the integration report that the enum is a
snapshot and must be regenerated when the registry changes. Regardless of the enum, the adapter
must check the live registry and reject unknown values before calling the setter. The manifest is a
resolver constraint, not a replacement for host validation.

Mark privacy, security, data-sharing, and payment-adjacent preferences with
`openPrefs: { sensitive: true }`. Add `confirmation: "required"` only when a change is irreversible
or carries consequences beyond the preference itself, such as deletion, billing, durable enrollment,
granting third-party access, or disabling a security control. A reversible privacy or visibility
preference is sensitive only; it does not require the unconditional floor.

Consult [the implemented architecture](../../docs/architecture.md): `sensitive` is a classification
whose effect depends on the global confirmation mode, while `confirmation: "required"` is an
unconditional floor. Under the default policy every change confirms anyway, so
`confirmation: "required"` matters only when a developer has deliberately selected global mode
`"never"`. Reserve it for changes that must still confirm then.

For every Tier 2 candidate, emit a commented block at the intended manifest location:

```ts
// Tier 2: traced from TrackingToggle -> setTrackingEnabled -> preferences storage.
// Missing: evidence identifying what "tracking" means. Write a precise description to activate.
// trackingEnabled: {
//   type: "boolean",
//   description: "REPLACE WITH EVIDENCE-BACKED USER-FACING MEANING",
// },
```

The placeholder must remain commented out. Never activate placeholder prose. This commented Tier 2
block is a deliberate semantic-authoring handoff, not abandoned code; treat it as an explicit
exception to generic bans on commented-out code.

### 6. Generate adapter glue against existing operations

Call the same getters, setters, dispatchers, context methods, serializers, and API clients that the
application already uses. Preserve their sync/async behavior and partial-failure semantics. It is
correct for one adapter to branch across unrelated mechanisms.

Generate complete Tier 2 handlers while keeping them unreachable from OpenPrefs until their
manifest entries are activated. **The adapter handler IS generated and complete while the manifest
entry stays commented out. This is deliberate: the mechanical work is done; only the evidence-backed
sentence is missing.** Do not omit the handler merely because OpenPrefs cannot dispatch to it yet,
and do not activate the manifest entry merely to make the handler reachable.

For example, keep this Tier 2 manifest entry inactive:

```ts
// Tier 2: traced from TrackingToggle -> setTrackingEnabled -> preferences storage.
// Missing: evidence identifying what "tracking" means. Write that sentence to activate.
// trackingEnabled: {
//   type: "boolean",
//   description: "REPLACE WITH EVIDENCE-BACKED USER-FACING MEANING",
// },
```

At the same time, generate its complete adapter case using the existing setter:

```ts
case "trackingEnabled":
  if (typeof change.value === "boolean") {
    existingPreferences.setTrackingEnabled(change.value);
  } else {
    failed.push({ id: change.id, reason: "Expected a boolean." });
  }
  break;
```

The active manifest remains the whitelist, so OpenPrefs cannot propose this id. When the developer
supplies the missing sentence and uncomments the entry, no mechanical discovery or setter wiring
remains to be done.

In TypeScript, a manifest-derived adapter narrows changes to active ids, so use a loose
`PreferencesAdapter` boundary plus explicit runtime type guards when inactive Tier 2 handlers must
compile. OpenPrefs still whitelists against the active manifest before calling the adapter. Do not
use casts to suppress the type system. If there are no Tier 2 entries, prefer
`PreferencesAdapter<typeof preferences>` for manifest-derived narrowing.

Every generated `apply` switch must have a `default` case that appends a failure containing the
actual unhandled id. A JSON-parsed manifest can yield loose ids without an exhaustiveness guarantee;
without `default`, an unhandled id may be silently reported as applied.

Return `{ ok: true }` only when every submitted change succeeded. A legacy `success` discriminator
and `{ failed: [] }` are **not valid success shapes**. Return `{ ok: false, failed }` with a non-empty
failure list for rejected or unhandled changes. [The implemented architecture](../../docs/architecture.md)
is authoritative over the older product specification on this contract. Catch independent
per-change failures when the host can report them accurately; do not add rollback or transactions
the host does not already provide.

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
2. Every Tier 1 entry with its description evidence, whether its category was explicit, inferred,
   or absent, and its traced mutation path.
3. Every Tier 2 entry with the evidence found, the missing semantic evidence, and its completed
   adapter binding.
4. Every Tier 3 exclusion with the reason it is internal configuration.
5. Every candidate that could not be traced to a working setter or persistence path, including
   mechanically dead UI or unmounted settings sections, with the specific reason it is untraced.
6. Sensitive and confirmation-required choices, unresolved conflicts, verification results, and
   the resolver the developer still needs to supply.

Before shipping, require the developer to review the semantic boundary explicitly. The goal is not
zero human involvement. The developer must know exactly which capabilities they are exposing to
natural language, activate Tier 2 entries only with real prose, and approve every exclusion and
sensitive/confirmation classification.
