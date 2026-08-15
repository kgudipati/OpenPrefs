# Expected outcome: mixed architecture

Expected counts: **Tier 1: 4, Tier 2: 1, Tier 3: 4, untraced: 0**.

## Tier 1

| Id | Evidence and existing path | Metadata |
| --- | --- | --- |
| `theme` | `settingsCopy.theme` -> `appearanceStore.setTheme` -> store state | None |
| `textSize` | `settingsCopy.textSize` -> `writeTextSize` -> string storage | Enum must remain small, medium, large. |
| `profileVisibility` | `settingsCopy.profileVisibility` -> `AccountPreferencesClient.update` -> account API | `sensitive: true`, `confirmation: "required"` |
| `highContrast` | `settingsCopy.highContrast` -> `AccessibilityContext.setHighContrast` -> context state | None |

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
