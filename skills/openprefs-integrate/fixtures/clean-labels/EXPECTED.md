# Expected outcome: clean labels

Expected counts: **Tier 1: 4, Tier 2: 0, Tier 3: 3, untraced: 0**.

## Tier 1

| Id | Evidence-backed meaning | Trace | Metadata |
| --- | --- | --- | --- |
| `theme` | Application color appearance: light, dark, or system matched. | `settingsControls` -> `setTheme` -> store state | None |
| `textSize` | Interface text size. | `settingsControls` -> `setTextSize` -> store state | Enum must remain small, medium, large. |
| `directMessageNotifications` | Whether notifications are sent for direct messages. | `settingsControls` -> `setDirectMessageNotifications` -> store state | None |
| `profileVisibility` | Who can view the user's profile. | `settingsControls` -> `setProfileVisibility` -> store state | `sensitive: true` and `confirmation: "required"` because it changes an account privacy boundary. |

Wording may vary, but every semantic claim must come from the label/help text. The adapter must call
the four existing setters and have an unhandled-id failure path.

## Tier 3

- `API_URL`: deployment routing.
- `ENABLE_NEW_NAVIGATION`: feature rollout flag.
- `WORKER_POOL_SIZE`: operational capacity.

None may appear in the manifest or active adapter dispatch.
