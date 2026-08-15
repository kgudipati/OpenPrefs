# Expected outcome: category from structure

Expected counts: **Tier 1: 3, Tier 2: 0, Tier 3: 3, untraced: 0**.

The labels and fields deliberately omit the word “notifications.” The category is evidence-backed by
the `notificationSettings` module that owns all three values and setters, plus the neighbouring
delivery-channel controls imported from that module. The agent must carry that structural category
into each standalone description.

## Tier 1

| Id | Expected description | Trace |
| --- | --- | --- |
| `email` | “Whether notifications are sent by email.” | `deliveryControls` -> `setEmail` -> notification settings state |
| `push` | “Whether notifications are sent as push notifications.” | `deliveryControls` -> `setPush` -> notification settings state |
| `mentionsOnly` | “Whether notifications are limited to mentions.” | `deliveryControls` -> `setMentionsOnly` -> notification settings state |

Equivalent wording is acceptable only if it includes both the notifications category and the
specific email, push, or mentions-only meaning. The initialized values are valid default evidence.

## Tier 3

- `API_URL`: deployment routing.
- `DEBUG_MODE`: developer diagnostics.
- `deliveryBatchSize`: internal delivery batching capacity.

None may appear in the manifest or active adapter dispatch.
