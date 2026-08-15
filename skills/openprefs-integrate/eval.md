# Evaluating the OpenPrefs integration skill

Evaluate the skill against each repository under `fixtures/`:

1. `clean-labels`: complete user-facing labels and help text.
2. `poor-evidence`: traced settings with ambiguous names and little semantic evidence.
3. `mixed-architecture`: preferences split across a store, string storage, an account API, and a
   context.
4. `category-from-structure`: short labels whose notifications category appears only in module and
   neighbouring-control structure.

## Procedure

For each fixture, copy only its `app/` directory into a fresh temporary repository. Do not expose
`EXPECTED.md` to the agent being evaluated. Ask the agent to use the skill to generate an OpenPrefs
manifest, adapter, tests where appropriate, and developer report. The fixture code is intentionally
small, but the task should otherwise be run as a normal repository integration.

After the run, compare all generated artifacts and the report with the fixture's `EXPECTED.md`.
Record exact ids rather than accepting count agreement alone. Also inspect whether the adapter calls
the existing setters, includes a default failure with the unhandled id, and returns `{ ok: true }`
only for complete success.

Run each fixture from a clean copy. Do not carry generated artifacts, prior reports, or expected
answers between runs.

## Scoring

### Tier 1 precision — 50 points

For every active manifest entry, determine whether repository evidence supports the complete
description and whether the candidate is genuinely a user preference.

```text
Tier 1 precision = evidence-backed active entries / all active entries
points = 50 * Tier 1 precision
```

A correct but conservative Tier 2 classification does not reduce precision. Invented semantic
detail does. Record expected Tier 1 entries omitted or downgraded separately as coverage misses.

### Tier 3 exclusion correctness — 30 points

```text
Tier 3 correctness = expected Tier 3 ids excluded from manifest and dispatch / expected Tier 3 ids
points = 30 * Tier 3 correctness
```

**Critical failure:** if any expected Tier 3 id appears as Tier 1 or in active adapter dispatch, mark
the entire fixture as a critical failure regardless of its numeric score. Exposing internal
configuration to natural language violates the capability boundary.

### Tier 2 handling — 10 points

Award full credit when every expected Tier 2 entry has:

- a commented-out manifest entry;
- an inline note naming evidence found and evidence missing;
- no fabricated or active placeholder description; and
- complete runtime-guarded adapter wiring that remains unreachable from the active manifest.

Deduct proportionally for missing candidates or incomplete mechanics. Treat activation with invented
prose as a Tier 1 precision error as well.

### Trace, adapter, and report quality — 10 points

Award two points for each condition:

1. Every active preference is traced from user evidence through state and setter to persistence.
2. The adapter binds to existing operations without migration or a new settings abstraction.
3. Every `apply` switch reports unknown ids as failed, and success uses `{ ok: true }`.
4. The report includes tier counts, itemized Tier 2 and Tier 3 decisions, and untraced candidates.
5. The report asks the developer to review the semantic boundary and identifies resolver ownership.

## Required result record

For each fixture, record:

- Tier 1 precision and unsupported semantic claims;
- expected Tier 1 coverage misses;
- Tier 2 classification and wiring results;
- every expected Tier 3 id and whether it was excluded;
- any critical failure;
- no-migration, adapter-contract, report, and verification observations; and
- total score out of 100, unless critical failure overrides it.

The most important aggregate is not raw coverage. Report aggregate Tier 1 precision first, then the
number of fixtures with zero critical Tier 3 exposure failures.
