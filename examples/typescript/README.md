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

`llmResolver.ts` is a real HTTP resolver for OpenAI's Responses API and defaults to `gpt-5.6`.
Set `OPENAI_API_KEY` to activate it; without that variable the CLI remains deterministic. Override
the model with `OPENPREFS_MODEL`. No provider SDK is installed because the example uses `fetch`
directly.

OpenAI is only the documented example provider. To use another hosted or local resolver, implement
`PreferencesResolver.resolve(input)`, build context from `input.preferences` and `input.current`,
and replace the resolver selected in `cli.ts`. Return model output to OpenPrefs as untrusted data;
do not move OpenPrefs' whitelist and value validation into the resolver.
