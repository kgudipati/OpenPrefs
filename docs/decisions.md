# Engineering Decision Log

Entries are ordered newest first.

## 2026-08-14 — Keep confirmation stateless

- **Decision:** `confirm(proposal)` accepts proposal data returned through the host and re-runs manifest validation and policy from scratch before execution. OpenPrefs stores no pending transaction, token, session, or confirmation ledger.
- **Rationale:** Proposal data handed back by a host is untrusted input. Re-validation is safer than trusting remembered resolver output and avoids making OpenPrefs own infrastructure that belongs to the host.
- **Host obligation:** Calling `confirm()` asserts that the user approved that exact proposal. OpenPrefs cannot verify that a confirmation UI was shown. Wiring `confirm()` to anything other than explicit user approval disables every confirmation policy.
- **Revisit when:** A concrete host requirement cannot safely carry proposal data through its own confirmation flow.

## 2026-08-14 — Report execution failures without rollback

- **Decision:** OpenPrefs reports the adapter's actual applied and failed changes without attempting rollback, retries, transactions, or compensating writes. Hosts may provide their own atomic preference operation behind the adapter when their existing architecture supports one.
- **Rationale:** OpenPrefs cannot safely reverse arbitrary host mutations or become a distributed transaction system. Accurate partial-failure reporting preserves the adapter boundary without claiming guarantees the host did not provide.
- **Revisit when:** Concrete host demand demonstrates a portable rollback capability that can preserve adapter ownership and accurately define failure semantics across supported runtimes.

## 2026-08-14 — Distinguish sensitive from confirmation-required preferences

- **Decision:** A sensitive preference requires confirmation only under global `"always"` or `"sensitive"` policy. Only `openPrefs.confirmation: "required"` is an unconditional preference-level floor that survives global `"never"`.
- **Rationale:** Section 20 protects explicit confirmation requirements from weaker global policy. Making sensitivity an equal floor collapsed global `"sensitive"` and `"never"` into the same behavior, leaving the three-value mode with only two behaviors.
- **Revisit when:** Evidence shows developers expect `openPrefs.sensitive` to be an unconditional confirmation floor.

## 2026-08-14 — Reject partially invalid proposals as a whole

- **Decision:** During v0.x, when proposal validation rejects any entry, policy rejects the entire request and withholds otherwise valid changes.
- **Rationale:** Applying only a subset would perform something other than the resolver proposed without first making that difference explicit, violating the preview-over-surprise principle.
- **Revisit when:** Real user demand for partial application justifies designing an explicit partial-preview and confirmation contract.

## 2026-08-13 — Require manifest tests and coverage

- **Decision:** Remove Vitest's temporary `passWithNoTests` setting and enforce coverage across `src/` at 90% lines and 85% branches.
- **Rationale:** Phase 1 introduces the first product logic, so an empty suite or materially untested manifest implementation must fail verification.
- **Closes:** The Phase 0 decision to allow an empty test suite temporarily.

## 2026-08-13 — Leave Markdown and YAML unformatted

- **Decision:** Markdown and YAML remain unformatted by choice under Biome 2.5.8. Do not add a second formatter to cover them.
- **Rationale:** `biome check .` processes six files in this repository: three `.json` files and three `.ts` files. Biome 2.5.8 does not process Markdown and reports YAML as an unknown language.
- **Revisit when:** Biome adds stable Markdown and YAML formatting and checking support.

## 2026-08-13 — Temporarily allow an empty test suite

- **Decision:** Keep Vitest's `passWithNoTests` enabled during Phase 0 only.
- **Rationale:** Phase 0 contains tooling and guardrails but intentionally contains no product tests.
- **Outcome:** Closed in Phase 1. The setting was removed and coverage thresholds now protect the product test suite.

## 2026-08-13 — Tolerate tsup's deprecated `baseUrl`

- **Decision:** Set `ignoreDeprecations: "6.0"` in the TypeScript configuration.
- **Rationale:** tsup's declaration pipeline injects the deprecated `baseUrl` option, which otherwise causes the declaration build to fail.
- **Revisit when:** tsup no longer injects `baseUrl`; remove `ignoreDeprecations` then.

## 2026-08-13 — Pin TypeScript to 6.x

- **Decision:** Pin TypeScript to the latest compatible 6.x release.
- **Rationale:** tsup's declaration pipeline requires the JavaScript compiler API, which the TypeScript 7 native compiler package does not expose.
- **Revisit when:** tsup supports the TypeScript 7 native compiler.
