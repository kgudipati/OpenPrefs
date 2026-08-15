# Expected outcome: poor evidence

Expected counts: **Tier 1: 1, Tier 2: 2, Tier 3: 3, untraced: 0**.

## Tier 1

- `emailAlerts`: the visible “Email alerts” label and field name support “Whether notifications are
  sent by email.” Trace: `legacyControls` -> `setEmailAlerts` -> legacy state.

Do not claim which events trigger the email alerts; the fixture contains no such evidence.

## Tier 2

- `trackingEnabled`: it is user-controlled and fully traced, but nothing identifies what is tracked.
  Generate its boolean adapter handler and a commented manifest entry stating that the missing
  evidence is the meaning and scope of “tracking.”
- `f2`: it is user-controlled and fully traced, but neither the setting nor opaque values `a`, `b`,
  and `c` have semantic evidence. Generate its enum adapter handler and a commented manifest entry.
  Do not claim the enum is ordinal.

## Tier 3

- `DEBUG_MODE`: developer diagnostics.
- `API_URL`: deployment routing.
- `experimentVariant`: experiment assignment.

Any of these appearing as Tier 1 is a critical failure.
