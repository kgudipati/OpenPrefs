# Engineering Decision Log

Entries are ordered newest first.

## 2026-08-13 — Keep Markdown and YAML outside Biome 2.5.8

- **Decision:** Do not add Markdown or YAML to Biome's check scope and do not add a second formatter.
- **Rationale:** Biome 2.5.8 has no language handler for Markdown or YAML. Direct checks of `.md` and `.yml` files process zero files, and verbose project checks report YAML as an unknown language.
- **Revisit when:** Biome adds stable Markdown and YAML formatting and checking support.

## 2026-08-13 — Temporarily allow an empty test suite

- **Decision:** Keep Vitest's `passWithNoTests` enabled during Phase 0 only.
- **Rationale:** Phase 0 contains tooling and guardrails but intentionally contains no product tests.
- **Revisit when:** Phase 1 begins. Remove this setting so an empty or broken test glob cannot pass CI silently.

## 2026-08-13 — Tolerate tsup's deprecated `baseUrl`

- **Decision:** Set `ignoreDeprecations: "6.0"` in the TypeScript configuration.
- **Rationale:** tsup's declaration pipeline injects the deprecated `baseUrl` option, which otherwise causes the declaration build to fail.
- **Revisit when:** tsup no longer injects `baseUrl`; remove `ignoreDeprecations` then.

## 2026-08-13 — Pin TypeScript to 6.x

- **Decision:** Pin TypeScript to the latest compatible 6.x release.
- **Rationale:** tsup's declaration pipeline requires the JavaScript compiler API, which the TypeScript 7 native compiler package does not expose.
- **Revisit when:** tsup supports the TypeScript 7 native compiler.
