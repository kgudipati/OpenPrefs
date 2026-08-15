# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-14

### Added

- A headless request lifecycle that turns natural-language intent into validated preference
  changes while leaving state, persistence, UI, authentication, and execution with the host.
- Immutable TypeScript and portable version 1 JSON manifests with boolean, string, enum, and
  bounded-number definitions, OpenPrefs metadata, definition-time validation, and inferred value
  types.
- Resolver, validator, policy, confirmation, and adapter boundaries with typed outcomes for applied,
  rejected, failed, unsupported, and clarification-required requests.
- Whole-proposal validation against the manifest whitelist, exact primitive types, enum membership,
  numeric bounds, and configurable confirmation and per-request change-limit policy.
- Optional adapter reads for current-value context and confirmation previews, plus partial execution
  failure reporting through explicit adapter acknowledgements.
- Plain TypeScript and Next.js examples with deterministic and hosted resolver implementations.
- A 45-case resolver eval suite that measures accuracy independently from security containment and
  records deterministic and `gpt-5.6-luna` baselines.
- The `openprefs-integrate` coding-agent skill for evidence-backed manifest and adapter generation
  using active, needs-semantic-authoring, and excluded tiers.
- Dual ESM and CommonJS builds, TypeScript declarations, automated tests, linting, typechecking, CI,
  contribution guidance, and architectural guardrails.

### Changed

- Adapter success requires an explicit `{ ok: true }` acknowledgement. Partial or total failure
  requires `{ ok: false, failed: [...] }`; legacy `{ success: true }` and `{ failed: [] }` success
  shapes are rejected conservatively.

### Security

- Resolver output is always treated as untrusted data and must cross the manifest whitelist, type
  validation, value validation, policy, confirmation, and adapter boundary before execution.
- The release baseline records 45/45 security containment for both deterministic and hosted
  resolvers, including a manipulated hosted-model proposal stopped by policy before mutation.

[Unreleased]: https://github.com/kgudipati/OpenPrefs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kgudipati/OpenPrefs/releases/tag/v0.1.0
