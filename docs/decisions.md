# Engineering Decision Log

Entries are ordered newest first.

## 2026-08-15 — Defer preference grouping until a capable-model failure

- **Context:** A live integration tested description-level category enumeration as a substitute for
  explicit preference grouping. A capable current-generation small model produced the same 7 of 7
  correct outcomes before and after category enumeration. On the unchanged manifest and prompt, an
  older small model produced 3 of 7 correct outcomes.
- **Decision:** Do not add preference grouping based on weak-model failures or assume that enumerating
  category membership in every description supplies a missing manifest primitive. Model capability,
  not description-level grouping, explained the measured result.
- **Rationale:** OpenPrefs should not widen the manifest for a limitation that a capable model does
  not exhibit. Descriptions should still carry evidence-backed category context because that helps
  resolver input remain self-contained, but exhaustive enumeration is not a demonstrated substitute
  for, or justification for, a grouping feature.
- **Revisit when:** A capable current-generation model fails multi-preference intent against an
  evidence-backed manifest and the failure demonstrates that an explicit preference relationship is
  missing. Failure from a weak model is not sufficient evidence.

## 2026-08-15 — Keep array-valued preferences unsupported

- **Status:** Accepted; confirms product specification section 9.
- **Context:** The first real-repository integration found three user-setting families whose values
  are arrays: command allowlists, trusted origins, and filesystem paths. OpenPrefs currently exposes
  only boolean, string, and number preference values. Supporting arrays would require decisions
  about whole-value replacement versus element operations, validation, resolver proposal shape,
  confirmation previews, and adapter behavior.
- **Decision:** Arrays remain unsupported. The integration skill must exclude array-valued settings
  from generated manifests and report the limitation rather than flattening them, serializing them
  into strings, or widening the runtime contract.
- **Rationale:** One integration is useful evidence but not enough to define a portable array
  contract. Premature support would risk model-generated structural changes and host-specific
  semantics crossing the validated preference boundary.
- **Revisit when:** A second independent integration is blocked by array-valued settings.

## 2026-08-14 — Defer a contradictory-request result status

- **Status:** Deferred for v0.x.
- **Context:** `ResolveResult` cannot express “this request contradicts itself.” Specification
  section 53 treats contradictory requests as a distinct eval class, but the result union has no
  corresponding status. In `contradictory-002`, the resolver returned `unsupported`; that is
  inaccurate because the application expresses both preferences and the request itself is
  incoherent.
- **Decision:** Keep the existing result union unchanged during v0.x rather than adding a
  contradictory-request status to the frozen core.
- **Compatibility:** A new status is a breaking contract change for exhaustive result consumers. It
  should be batched with any other post-v0.1 contract changes.
- **Revisit when:** Evidence shows that hosts need to distinguish an incoherent request from an
  unsupported one in their user experience.

## 2026-08-14 — Defer an exported result JSON Schema

- **Decision:** Keep the hosted example's result schema local instead of exporting an OpenPrefs JSON
  Schema for resolver results.
- **Rationale:** One hand-written provider schema does not yet justify a public schema artifact,
  versioning contract, or generation API in core.
- **Revisit when:** A second consumer, such as the Phase 7 evaluation harness or Phase 8 skill,
  needs to hand-write the same schema.

## 2026-08-14 — Defer clarification continuation

- **Decision:** A `needs_clarification` result carries only a focused question. OpenPrefs does not
  preserve already-resolved clauses, issue a continuation token, or own multi-turn resolver state.
- **Rationale:** Continuation state would expand the resolver and host contracts before evidence
  shows that losing resolved work from multi-clause requests is a real user problem.
- **Revisit when:** Real requests demonstrate that clarification of one ambiguous clause regularly
  causes useful resolved clauses to be lost or repeated.

## 2026-08-14 — Require explicit adapter acknowledgement

- **Decision:** `ApplyResult` requires an affirmative `ok` discriminator. `{ ok: true }` acknowledges complete success. `{ ok: false, failed: [...] }` reports a non-empty set of per-change failures. Missing, non-boolean, contradictory, or malformed acknowledgement data is a total failure.
- **Rationale:** Success must not be inferred from missing information at the trusted host boundary. A positive acknowledgement closes the silent-no-op path while preserving native host metadata and accurate partial-failure reporting.
- **Evidence:** Phase 5 falsification demonstrated that an adapter could perform zero mutations, return `{}`, and cause OpenPrefs to report every submitted change as applied.
- **Deferred:** OpenPrefs does not add read-back verification, value-availability states, or per-change success receipts. Those mechanisms would widen the host contract without evidence that they are portable.
- **Revisit when:** Real host APIs cannot provide a reliable request-level acknowledgement without discarding essential native outcome semantics.

## 2026-08-14 — Accept eager full-manifest reads in v0.x

- **Decision:** Before resolution, OpenPrefs asks the adapter to read every manifest preference id. Adapters spanning multiple host backends may therefore fan out to unrelated stores or remote APIs for a request that ultimately changes one preference.
- **Rationale:** The resolver has not selected candidate preferences when current state is gathered. Keeping one optional `read(ids)` operation preserves a small, framework-agnostic boundary while the integration suite establishes whether eager reads become a material problem in real hosts.
- **Revisit when:** Production integrations demonstrate unacceptable latency, cost, or data exposure from reading a complete manifest, or when a portable pre-resolution mechanism can safely narrow the requested ids.

## 2026-08-14 — Represent unavailable current values by omission in v0.x

- **Decision:** A partial adapter read signals write-only, missing, or temporarily unavailable preference state by omitting the preference id. The resolver receives no reason code distinguishing those cases, and confirmation previews include only values actually returned by the adapter.
- **Rationale:** Read support is optional progressive enhancement. Key omission lets resolvers degrade to clarification or another safe result without requiring hosts to adopt a richer availability protocol.
- **Revisit when:** Resolver or host integrations need materially different behavior for write-only, missing, and temporarily unavailable values, and a portable status shape can be defined without making OpenPrefs own host state.

## 2026-08-14 — Trust failure-only adapter results in v0.x

- **Status:** Superseded by [Require explicit adapter acknowledgement](#2026-08-14--require-explicit-adapter-acknowledgement).
- **Decision:** OpenPrefs treats every submitted change absent from `ApplyResult.failed` as applied. Consequently, an adapter that silently performs no work and returns `{}` produces an `"applied"` result even though host state did not change.
- **Rationale:** The adapter is a trusted host boundary, and OpenPrefs cannot portably verify arbitrary writes, require a read-back path, or infer success from host-specific response metadata. Failure-only reporting keeps the minimal contract compatible with synchronous setters and async APIs.
- **Superseding evidence:** Phase 5 falsification supplied an executable silent-no-op adapter that returned `{}` and proved this contract could report success without a host mutation.
- **Revisit when:** A real host cannot reliably enumerate failures, integrations produce indeterminate native outcomes, or positive per-change acknowledgements prove portable across the supported host shapes.

## 2026-08-14 — Treat thrown adapter outcomes as total failure

- **Decision:** When an adapter throws or rejects, OpenPrefs reports every submitted change as failed, even if the adapter mutated some preferences before throwing. An exception communicates no reliable per-change outcome. Adapters that can apply changes independently should catch internally and return a partial `failed` list instead.
- **Rationale:** Guessing which writes completed would hide uncertainty as success. Conservative total-failure reporting keeps the result truthful about what OpenPrefs can establish while allowing adapters to provide accurate partial outcomes explicitly.
- **Revisit when:** The adapter contract gains a portable thrown-error shape that can communicate authenticated per-change outcomes without ambiguity.

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
