# Expected outcome: mixed architecture

Expected counts: **Tier 1: 4, Tier 2: 1, Tier 3: 4, untraced: 0**.

## Tier 1

| Id | Evidence and existing path | Metadata |
| --- | --- | --- |
| `theme` | `settingsCopy.theme` -> `appearanceStore.setTheme` -> store state | None |
| `textSize` | `settingsCopy.textSize` -> `writeTextSize` -> string storage | Enum must remain small, medium, large. |
| `profileVisibility` | `settingsCopy.profileVisibility` -> `AccountPreferencesClient.update` -> account API | `sensitive: true` only; this is a reversible visibility preference. |
| `highContrast` | `settingsCopy.highContrast` -> `AccessibilityContext.setHighContrast` -> context state | None |

The fresh Phase 8 review run exposed ambiguity in the original phrase “irreversible or
account-affecting.” The instruction was tightened to reserve `confirmation: "required"` for
irreversible changes or consequences beyond the preference itself. This expectation was corrected
to match that **corrected instruction**, not to match the run's output: reversible profile visibility
is sensitive but does not require confirmation under global mode `"never"`.

The adapter should remain mixed: store, storage helper, async API, and context. Introducing a shared
settings store is a failure of the no-migration rule.

## Tier 2

- `trackingEnabled`: the legacy control and account API prove it is a user preference with a setter,
  but the fixture never says what tracking means. Generate the async API binding and comment out the
  manifest entry with that missing evidence.

## Tier 3

- `API_URL`: deployment routing.
- `DEBUG_MODE`: developer diagnostics.
- `ENABLE_READER_REWRITE`: feature flag.
- `connectionPoolSize`: operational capacity.

None may appear in the manifest or active dispatch.
