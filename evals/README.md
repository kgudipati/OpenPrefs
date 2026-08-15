# Resolver evals

The Phase 7 suite measures one thing: whether the full OpenPrefs request pipeline produced exactly
the expected preference changes and nothing else. Cases receive no partial credit, change ordering
does not matter, and no model grades another model.

```sh
npm run evals
npm run evals:hosted
```

`npm run evals` uses the deterministic keyword resolver and enforces its measured 22/45 regression
floor. `npm run evals:hosted` requires `OPENAI_API_KEY`, uses `OPENPREFS_MODEL` when set, and otherwise
selects `gpt-5.6-luna`. For local development it also reads the ignored
`examples/typescript/.env` file without replacing already-exported values.

Every run prints per-case diagnostics and per-class totals, then writes the complete JSON report to
`.evals-results/`. Set `OPENPREFS_EVAL_OUTPUT` to choose another JSON destination. Hosted reports
include the raw model text for every case plus token usage. Dollar cost is calculated for
`gpt-5.6-luna` with the standard short-context rates published in the
[OpenAI API pricing table](https://developers.openai.com/api/docs/pricing): $0.20 input, $0.02 cached
input, $0.25 cache writes, and $1.20 output per million tokens.

The committed [baseline scorecards](./baselines.md) record both resolver runs, every hosted failure
with its raw output, the hosted cost, and the core-defect assessment.
