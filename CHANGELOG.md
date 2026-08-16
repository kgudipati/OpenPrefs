# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-15

### Added

- A headless request lifecycle that turns natural-language intent into changes against an
  application's existing preferences while leaving settings architecture, state, persistence, UI,
  authentication, and execution with the host. Typed results cover applied, already-satisfied,
  confirmation-required, clarification-required, unsupported, rejected, and failed requests.
- Immutable TypeScript and portable version 1 JSON manifests for boolean, string, ordered enum, and
  bounded-number preferences. Definitions support labels and OpenPrefs policy metadata, infer host
  value types, and fail at definition time when ids, descriptions, types, enum values, bounds, or
  metadata are malformed.
- A resolver boundary that treats every natural-language proposal as untrusted data, regardless of
  its declared TypeScript type, followed by deterministic whole-proposal validation of structure,
  manifest membership, exact primitive types, enum membership, and numeric bounds.
- Policy and confirmation controls with `always`, `sensitive`, and `never` global modes,
  preference-level sensitivity and required-confirmation metadata, and a configurable
  `maxChangesPerRequest` guard against silent bulk changes. Confirmation returns a data-only
  proposal that is revalidated and reevaluated before the host-authorized `confirm()` call applies
  it.
- The `already_satisfied` result for clean resolved proposals that contain no changes or contain
  only values strictly equal to every corresponding current value supplied by the adapter. Mixed
  proposals retain all entries so host-owned write side effects are not silently removed.
- An adapter contract that optionally reads current values for resolver context and confirmation
  previews, invokes the host's existing mutation path, and requires explicit `{ ok: true }` or
  `{ ok: false, failed: [...] }` acknowledgements. Partial failures report which submitted changes
  applied; missing, contradictory, or malformed acknowledgements fail closed.
- The packaged `openprefs-integrate` coding-agent skill, its evidence-based active,
  needs-semantic-authoring, and excluded classification workflow, and reference guidance for
  tracing existing settings without restructuring them. It covers dot-separated nested ids,
  registry-backed enums, and mechanically incomplete settings that must remain untraced.
- Plain TypeScript and Next.js examples with deterministic and hosted resolver implementations,
  including a settings page, request route, text entry, confirmation flow, and handling for every
  public result status.
- A 45-case resolver eval suite that measures accuracy independently from security containment and
  records deterministic and `gpt-5.6-luna` baselines.
- Dual ESM and CommonJS builds, TypeScript declarations, zero runtime dependencies, automated tests,
  linting, typechecking, CI, contribution guidance, and packaged architecture documentation whose
  internal links are verified from a fresh tarball installation.

### Changed

- Adapter success requires an explicit `{ ok: true }` acknowledgement. Partial or total failure
  requires `{ ok: false, failed: [...] }`; legacy `{ success: true }` and `{ failed: [] }` success
  shapes are rejected conservatively.
- Removed the unreachable `rejected / no_changes` public variants before the first npm publish.
  Clean empty proposals are `already_satisfied`; proposals with validation failures are
  `rejected / proposal_rejected` even when no valid changes remain.

### Security

- Resolver output is always treated as untrusted data and must cross the manifest whitelist, type
  validation, value validation, policy, confirmation, and adapter boundary before execution.
- The release baseline records 45/45 security containment for both deterministic and hosted
  resolvers, including a manipulated hosted-model proposal stopped by policy before mutation.

[0.1.0]: https://github.com/kgudipati/OpenPrefs/releases/tag/v0.1.0
