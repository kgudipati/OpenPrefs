# Plain TypeScript integration

This example adds natural-language control to a small, framework-free Node/TypeScript application.
The application still owns 12 settings and their setters. Its OpenPrefs adapter invokes those same
setters; OpenPrefs owns neither the state nor persistence.

By default the CLI uses `keywordResolver.ts`, a deterministic resolver driven by manifest ids,
descriptions, enums, synonyms, and current values. It supports direct, multi-preference, numeric,
and relative changes without a model or API key. Ambiguous requests ask a focused question and
unmatched requests return `unsupported`.

## Run it

From a clean repository checkout, build the root package once and install this example:

```sh
npm ci
npm run build
cd examples/typescript
npm ci
npm run demo -- "turn off marketing notifications and use dark mode"
```

The command prints the untrusted proposal, the before/after confirmation prompt, the final
OpenPrefs result, and the application-owned final state. Run `npm run verify` for its typecheck,
keyword resolver suite, hosted-resolver tests, and CLI end-to-end test.

## Hosted resolver

`llmResolver.ts` is a real HTTP resolver for OpenAI's Responses API and defaults to
`gpt-5.6-luna`, the smallest tier capable of this constrained structured-extraction task.
Set `OPENAI_API_KEY` to activate it; without that variable the default CLI remains deterministic.
Override the model with `OPENPREFS_MODEL`. No provider SDK is installed because the example uses
`fetch` directly.

For a hosted-only run, copy `.env.example` to the gitignored `.env`, fill in the local values, and
export them into the command environment:

```sh
set -a
source .env
set +a
npm run demo:hosted -- "turn off marketing notifications and use dark mode"
```

`demo:hosted` exits with a clear `OPENAI_API_KEY` message instead of attempting an unauthenticated
provider call. The example reads credentials only from `process.env`; it never loads `.env` itself.

### Verified cost and outcomes

Four representative requests on `gpt-5.6-luna` used 2,193 input tokens and 302 output tokens. They
cost $0.0008 total at standard short-context pricing, roughly two hundredths of a cent per request:

| Input | Outcome |
| --- | --- |
| “turn off marketing notifications and use dark mode” | Resolved both changes; OpenPrefs required confirmation. |
| “make the text bigger” | Resolved `textSize` from `medium` to `large`; OpenPrefs required confirmation. |
| “turn off those notifications” | Returned `needs_clarification` with a focused notification question. |
| “make my battery last longer” | Returned `unsupported` because the manifest exposes no battery preference. |

OpenAI is only the documented example provider. To use another hosted or local resolver, implement
`PreferencesResolver.resolve(input)`, build context from `input.preferences` and `input.current`,
and replace the resolver selected in `cli.ts`. Return model output to OpenPrefs as untrusted data;
do not move OpenPrefs' whitelist and value validation into the resolver.
