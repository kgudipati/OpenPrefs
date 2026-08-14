# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Breaking:** `ApplyResult` now requires an explicit `{ ok: true }` success acknowledgement or an
  `{ ok: false, failed: [...] }` failure acknowledgement. `{ success: true }` and `{ failed: [] }`
  are no longer valid success shapes.

### Added

- A versioned, portable preferences manifest with boolean, string, enum, and bounded number definitions.
- Definition-time validation with actionable, machine-readable manifest errors.
- Immutable manifest lookup APIs and type helpers for preference values and partial host state.
- Phase 0 repository scaffolding, including TypeScript configuration, dual ESM and CJS builds, tests, formatting, linting, CI, contribution guidance, and architectural guardrails.
