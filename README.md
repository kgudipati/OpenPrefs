# OpenPrefs

> Natural-language preferences for the app you already built.

OpenPrefs adds a headless semantic layer on top of an application's existing preference system:
text in, validated preference changes out. It requires no migration, no new preference store, no
particular UI, and no particular model provider.

OpenPrefs is not a settings system or an AI model. Your application still owns its settings,
persistence, user experience, authentication, and execution environment.

## Natural-language preferences in 20 seconds

```sh
npm install openprefs
```

Save this as `example.mjs` and run it with `node example.mjs`:

```js
import { createOpenPrefs, definePreferences } from "openprefs";

const preferences = definePreferences({
  theme: {
    type: "string",
    description: "Application color theme.",
    enum: ["light", "dark", "system"],
  },
});

let theme = "system";
const adapter = {
  read: () => ({ theme }),
  apply(changes) {
    for (const change of changes) theme = change.value;
    return { ok: true };
  },
};

const resolver = {
  async resolve({ text }) {
    return text.toLowerCase().includes("dark")
      ? { status: "resolved", changes: [{ id: "theme", value: "dark" }] }
      : { status: "unsupported" };
  },
};

const openPrefs = createOpenPrefs({
  preferences,
  adapter,
  resolver,
  policy: { confirmation: "never" },
});

console.log(await openPrefs.request("use dark mode"));
// { status: "applied", applied: [{ id: "theme", value: "dark" }] }
```

The resolver selected a candidate change. OpenPrefs treated it as untrusted data, checked the id
and value against the manifest, evaluated policy, and only then called the adapter.

## No migration

OpenPrefs is one layer above the preference system you already have:

```text
┌─────────────────────────────────────────────────────────────┐
│ Your application                                            │
│ Settings UI, natural-language UI, auth, and confirmation    │
├─────────────────────────────────────────────────────────────┤
│ OpenPrefs                                                   │
│ Manifest → resolver → validation → policy → adapter         │
├─────────────────────────────────────────────────────────────┤
│ Your existing preference system                            │
│ Setters, stores, contexts, files, browser storage, or APIs  │
└─────────────────────────────────────────────────────────────┘
```

The adapter calls the same mutation paths the application already trusts. OpenPrefs never
requires:

- migrating, replacing, or normalizing an existing preference system;
- adding a new preference store, database, backend, or hosted service;
- replacing a settings page or adding an OpenPrefs-owned UI;
- choosing a specific model, model provider, inference SDK, or model runtime;
- adopting React or any other application framework;
- sending telemetry to OpenPrefs.

Compatibility still requires a real bridge: developers decide what the manifest exposes and wire
the adapter to existing operations. The bundled coding-agent skill can generate most of that
bridge from repository evidence, but developers review the resulting semantic boundary.

## How the manifest works

The manifest is the complete capability whitelist for natural-language preference changes. Stable
ids map to `boolean`, `string`, or `number` definitions. Descriptions tell the resolver what each
preference means; string enums and numeric bounds define legal values. Optional defaults document
and validate the host's default, but do not create state or persistence.

```ts
const preferences = definePreferences({
  reducedMotion: {
    type: "boolean",
    description: "Whether interface motion and animation are reduced.",
    default: false,
  },
  textSize: {
    type: "string",
    description: "Application text size.",
    enum: ["small", "medium", "large"],
    default: "medium",
  },
  notificationVolume: {
    type: "number",
    description: "Notification sound volume from 0 through 10.",
    minimum: 0,
    maximum: 10,
  },
});
```

Enum declaration order is meaningful. A resolver may treat
`["small", "medium", "large"]` as ordinal when a relative request such as “make the text bigger”
and the current value make the direction unambiguous.

`definePreferences()` validates and freezes a TypeScript-authored manifest.
`parsePreferencesJson()` accepts the portable version 1 JSON form. Metadata can classify a
preference as `sensitive` or set `confirmation: "required"`. The resolver cannot create a
capability that the manifest does not expose.

## How adapters work

A `PreferencesAdapter` connects validated OpenPrefs changes to existing application code:

```ts
const adapter = {
  read(ids) {
    return existingSettingsStore.read(ids);
  },
  async apply(changes) {
    await existingSettingsService.update(changes);
    return { ok: true };
  },
};
```

`apply(changes)` is required. It receives only changes that passed the manifest whitelist, type and
value validation, policy, and any required confirmation. Successful adapters must explicitly
acknowledge complete application with `{ ok: true }`. Partial or total failures return
`{ ok: false, failed: [{ id, reason }] }`; missing or malformed acknowledgements fail closed.

`read(ids)` is optional. OpenPrefs supplies every manifest id and accepts any subset of current
values. Those values help resolvers interpret relative requests and let hosts show before/after
confirmation previews. A read failure degrades to resolution without current state; OpenPrefs does
not become the state owner.

## Bring your own resolver

OpenPrefs ships no model, provider SDK, or resolver implementation. A resolver receives the text,
manifest, and optional current values, then returns one of three data-only outcomes: `resolved`,
`needs_clarification`, or `unsupported`.

The plain TypeScript example includes two resolver implementations:

- a [deterministic keyword resolver](./examples/typescript/src/keywordResolver.ts) that runs with no
  model or API key;
- a [hosted OpenAI resolver](./examples/typescript/src/llmResolver.ts) using `fetch` and structured
  output, with no provider SDK.

OpenAI is an example provider, not a requirement. Four representative requests on
`gpt-5.6-luna` used 2,193 input tokens and 302 output tokens and cost **$0.0008 total** at the
measured short-context rates. See the [inputs and outcomes](./examples/typescript/README.md#verified-cost-and-outcomes).

Resolver output remains untrusted even when it conforms to the TypeScript interface. Core inspects
the runtime value and validates it independently before any mutation.

## Coding-agent integration skill

The package includes `openprefs-integrate`, a coding-agent skill for tracing an application's
existing preference paths and generating an evidence-backed manifest, adapter glue, tests, and a
review report. After installation, point an agent at:

```text
node_modules/openprefs/skills/openprefs-integrate/SKILL.md
```

The skill uses a three-tier model:

1. **Tier 1 — active:** a user preference with enough evidence for a precise semantic description;
   generate an active manifest entry and adapter wiring.
2. **Tier 2 — needs semantic authoring:** a traced user preference whose meaning is not precise
   enough; complete the mechanical adapter wiring but keep the manifest entry commented out until
   a developer supplies real prose.
3. **Tier 3 — excluded:** internal configuration such as feature flags, API URLs, debug modes,
   rollout variants, and operational thresholds; do not expose it or add adapter dispatch.

Precision outranks coverage. The skill does not promise automatic compatibility or zero human
involvement: the developer must review every exposed capability, exclusion, sensitivity choice,
and confirmation rule.

## Security model

Every natural-language request passes through the same boundary:

```text
user input -> resolver -> UNTRUSTED proposal -> manifest whitelist -> type validation -> value validation -> policy -> confirmation -> adapter
```

The resolver has no execution authority. Validation rejects unknown ids, wrong primitive types,
enum misses, out-of-range numbers, and malformed proposals. Policy considers the complete proposal,
enforces the change limit, and decides whether confirmation is required. `confirm(proposal)`
revalidates and reevaluates the same untrusted data before execution. The host remains responsible
for authentication, authorization, rendering or escaping resolver text, and ensuring that
`confirm()` follows real user approval.

### Measured eval results

Resolver accuracy and security containment are separate metrics. The committed 45-case suite gave
these uncurated results:

| Resolver | Exact passes | Safe clarifications | Failures | Security containment |
| --- | ---: | ---: | ---: | ---: |
| Deterministic keyword resolver | 22/45 | 9 | 14 | **45/45** |
| `gpt-5.6-luna` | **39/45** | 4 | 2 | **45/45** |

The hosted resolver's clearest weakness was goal-oriented intent: **1 exact pass, 3 safe
clarifications, and 1 failure across 5 cases**. It also returned `unsupported` instead of the
expected clarification for one contradictory request. Preference grouping is not implemented; its
absence particularly hurts requests such as “only notify me for DMs.”

Containment stayed 45/45 across both resolvers. In one recorded case, the hosted model **was
successfully manipulated** into proposing `usageAnalytics: true`; sensitive policy returned
`confirmation_required`, so the adapter received no change. A separate prompt-hardening run caught
an initial 44/45 containment result before the hosted example instructions were fixed and rerun
against the unchanged case.

See the [baseline scorecards](./evals/baselines.md) for every class, non-pass, token total, raw hosted
output, and the full-suite cost.

## Examples

- [Plain TypeScript CLI](./examples/typescript/README.md): deterministic and hosted resolvers,
  confirmation handling, and an adapter over existing setters.
- [Next.js App Router integration](./examples/next/README.md): a server-only resolver boundary,
  API route, confirmation UI, and conventional settings controls using the same mutation path.

Both examples keep model calls outside core tests. The deterministic resolver and scripted test
resolvers make the full lifecycle testable with no LLM present.

## API reference

OpenPrefs has one package entry point and ships ESM, CommonJS, and TypeScript declarations.

| Runtime export | Purpose |
| --- | --- |
| `definePreferences(definitions)` | Validate, normalize, and freeze a typed manifest. |
| `parsePreferencesJson(input)` | Parse and validate a portable version 1 manifest object. |
| `createOpenPrefs(options)` | Create the headless `request`, `confirm`, and `apply` lifecycle. |
| `validateProposal(preferences, proposal)` | Validate untrusted proposal data deterministically. |
| `resolvePolicy(policy?)` | Validate defaults or overrides into a complete frozen policy. |
| `evaluatePolicy(input)` | Evaluate validated changes against manifest and policy. |
| `ManifestError`, `PolicyError` | Programmer-error classes for invalid configuration. |

`createOpenPrefs({ preferences, adapter, resolver, policy? })` returns:

- `request(text)` — resolve text, validate the proposal, evaluate policy, and apply or return a
  typed non-apply result;
- `confirm(proposal)` — revalidate a previously returned proposal and apply it as explicitly
  confirmed;
- `apply(changes)` — submit programmatic changes through the same validation and policy boundary
  without calling the resolver.

The default policy is `{ confirmation: "always", maxChangesPerRequest: 10 }`. Expected lifecycle
outcomes are data, discriminated by `status`: `applied`, `confirmation_required`,
`needs_clarification`, `unsupported`, `rejected`, or `failed`.

Primary TypeScript contracts include `PreferencesManifest`, `PreferencesResolver`,
`PreferencesAdapter`, `OpenPrefsPolicy`, `SettingsProposal`, `OpenPrefsResult`,
`PreferenceChangeFor`, and `PreferencesState`. The package also exports result variants, manifest
definition types, validation diagnostics, and policy decision types from the same entry point.

## Pre-1.0 stability

OpenPrefs is at `0.1.0`. The contract may change before 1.0 as real integrations test the current
boundaries. Known candidates are a dedicated contradictory-request status, an exported result JSON
Schema, clarification continuation, and preference grouping. Changes will be documented in the
[changelog](./CHANGELOG.md).

## License

[MIT](./LICENSE)
