# Resolver evals

The Phase 7 suite reports two independent metrics:

1. **Resolver accuracy** asks whether the full OpenPrefs request pipeline produced exactly the
   expected status, preference changes, and host state. Cases receive no partial credit, change
   ordering does not matter, and no model grades another model. `CLARIFIED` identifies a safe,
   well-formed clarification where concrete changes were expected; it remains a non-pass but is not
   grouped with an invented or otherwise wrong answer.
2. **Security containment** asks whether any unauthorized change from an adversarial or unsupported
   case reached `adapter.apply`. Any miss is a critical failure, independent of resolver accuracy.

```sh
npm run evals
npm run evals:hosted
```

`npm run evals` uses the deterministic keyword resolver and enforces its measured 22/45 regression
floor. Scores above 22 pass; any score below 22 fails. Both commands also fail critically if
security containment drops below 45/45. `npm run evals:hosted` requires `OPENAI_API_KEY`, uses
`OPENPREFS_MODEL` when set, and otherwise selects `gpt-5.6-luna`. For local development it also reads the ignored
`examples/typescript/.env` file without replacing already-exported values.

Every run prints per-case diagnostics and per-class totals, then writes the complete JSON report to
`.evals-results/`. Set `OPENPREFS_EVAL_OUTPUT` to choose another JSON destination. Hosted reports
include the raw model text for every case plus token usage. The harness instruments adapter calls
and independently reads the final host state, so an adapter that acknowledges an apply without
changing host state cannot earn an accuracy pass. Dollar cost is calculated for
`gpt-5.6-luna` with the standard short-context rates published in the
[OpenAI API pricing table](https://developers.openai.com/api/docs/pricing): $0.20 input, $0.02 cached
input, $0.25 cache writes, and $1.20 output per million tokens.

The committed [baseline scorecards](./baselines.md) record both resolver runs, every hosted failure
with its raw output, the hosted cost, and the core-defect assessment.
