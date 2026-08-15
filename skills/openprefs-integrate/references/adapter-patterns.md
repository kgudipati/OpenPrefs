# Adapter patterns

These patterns are derived from the working Phase 5 host applications under `tests/apps/` and
`tests/adapters/`. Adapt them to the host's existing functions and types; do not introduce a common
settings architecture to make an adapter look cleaner.

Every `apply` switch includes a `default` failure, and complete success is always `{ ok: true }`.

## Synchronous store

Use the store's existing snapshot and setters. This pattern matches the Phase 5 synchronous store.

```ts
export const adapter: PreferencesAdapter<typeof preferences> = {
  read(ids) {
    const state = settingsStore.getState();
    const current: PreferencesState<typeof preferences> = {};
    for (const id of ids) {
      if (id === "theme") current.theme = state.theme;
      if (id === "textSize") current.textSize = state.textSize;
    }
    return current;
  },
  apply(changes) {
    const failed: { id: string; reason: string }[] = [];
    for (const change of changes) {
      switch (change.id) {
        case "theme":
          settingsStore.setTheme(change.value);
          break;
        case "textSize":
          settingsStore.setTextSize(change.value);
          break;
        default:
          failed.push({ id: change.id, reason: `Unhandled preference id: ${change.id}` });
      }
    }
    return failed.length === 0 ? { ok: true } : { ok: false, failed };
  },
};
```

Do not assign directly to store internals when the store exposes setters. Setters may publish,
validate, or trigger host-owned side effects.

## Asynchronous API

Translate the host's native partial result. The Phase 5 server-backed app batches updates and names
rejections.

```ts
export function createAdapter(client: ExistingSettingsClient): PreferencesAdapter {
  return {
    async read(ids) {
      return client.getSettings(ids);
    },
    async apply(changes) {
      const update: Record<string, boolean | string | number> = {};
      const failed: { id: string; reason: string }[] = [];

      for (const change of changes) {
        switch (change.id) {
          case "notifyDirectMessages":
            if (typeof change.value === "boolean") update.notifyDirectMessages = change.value;
            else failed.push({ id: change.id, reason: "Expected a boolean." });
            break;
          case "digestFrequencyHours":
            if (typeof change.value === "number") update.digestFrequencyHours = change.value;
            else failed.push({ id: change.id, reason: "Expected a number." });
            break;
          default:
            failed.push({ id: change.id, reason: `Unhandled preference id: ${change.id}` });
        }
      }

      const response = await client.updateSettings(update);
      const allFailures = [...failed, ...response.rejected];
      return allFailures.length === 0 ? { ok: true } : { ok: false, failed: allFailures };
    },
  };
}
```

Do not report `{ ok: true }` merely because the request completed. Map native rejection data. If the
API is atomic and throws with no per-change outcome, let OpenPrefs conservatively report total
failure or translate only information the API actually authenticates.

## localStorage-backed application

Reuse the application's parsers and serializers. Do not create a second serialization format.

```ts
export const adapter: PreferencesAdapter<typeof preferences> = {
  read(ids) {
    const current: PreferencesState<typeof preferences> = {};
    for (const id of ids) {
      if (id === "textSize") current.textSize = readTextSize(localStorage);
      if (id === "showTips") current.showTips = readShowTips(localStorage);
    }
    return current;
  },
  apply(changes) {
    const failed: { id: string; reason: string }[] = [];
    for (const change of changes) {
      switch (change.id) {
        case "textSize":
          writeTextSize(localStorage, change.value);
          break;
        case "showTips":
          writeShowTips(localStorage, change.value);
          break;
        default:
          failed.push({ id: change.id, reason: `Unhandled preference id: ${change.id}` });
      }
    }
    return failed.length === 0 ? { ok: true } : { ok: false, failed };
  },
};
```

Use AsyncStorage the same way: await the host's existing read/write functions and preserve its error
behavior.

## Mixed or messy application

Branch across the existing store, storage helpers, remote client, and context. Ugly glue is correct.

```ts
export function createAdapter(app: ExistingApp): PreferencesAdapter {
  return {
    async read(ids) {
      const current: Record<string, boolean | string | number> = {};
      const remoteIds: string[] = [];
      for (const id of ids) {
        if (id === "theme") current.theme = app.store.getState().theme;
        else if (id === "textSize") current.textSize = readTextSize(app.storage);
        else if (id === "highContrast") current.highContrast = app.context().highContrast;
        else if (id === "notifyMentions") remoteIds.push(id);
      }
      return { ...current, ...(await app.remote.get(remoteIds)) };
    },
    async apply(changes) {
      const failed: { id: string; reason: string }[] = [];
      for (const change of changes) {
        try {
          switch (change.id) {
            case "theme":
              if (change.value === "light" || change.value === "dark") {
                app.store.setTheme(change.value);
              } else failed.push({ id: change.id, reason: "Expected a supported theme." });
              break;
            case "textSize":
              if (change.value === "small" || change.value === "medium" || change.value === "large") {
                writeTextSize(app.storage, change.value);
              } else failed.push({ id: change.id, reason: "Expected a supported text size." });
              break;
            case "notifyMentions":
              if (typeof change.value === "boolean") await app.remote.setMentions(change.value);
              else failed.push({ id: change.id, reason: "Expected a boolean." });
              break;
            case "highContrast":
              if (typeof change.value === "boolean") app.context().setHighContrast(change.value);
              else failed.push({ id: change.id, reason: "Expected a boolean." });
              break;
            default:
              failed.push({ id: change.id, reason: `Unhandled preference id: ${change.id}` });
          }
        } catch (error) {
          failed.push({
            id: change.id,
            reason: error instanceof Error ? error.message : "The host update failed.",
          });
        }
      }
      return failed.length === 0 ? { ok: true } : { ok: false, failed };
    },
  };
}
```

The loose `PreferencesAdapter` boundary is intentional when the switch contains complete handlers
for inactive Tier 2 ids. Runtime guards preserve value safety, while the active manifest remains the
only capability whitelist. Once the developer authors and activates every Tier 2 description, the
adapter can usually be tightened to `PreferencesAdapter<typeof preferences>` without altering host
architecture.

## Adapter review checklist

- Every active manifest id reaches the host's existing setter.
- Every Tier 2 id has a complete, runtime-guarded handler but is absent from the active manifest.
- Tier 3 ids have no dispatch path.
- Every `apply` switch has a `default` that reports the actual id as failed.
- Success is exactly `{ ok: true }`; partial or total failure is `{ ok: false, failed }`.
- Reads may omit unavailable values and never invent state.
- Async failures are awaited and mapped only as precisely as the host supports.
- Tests exercise every handler and an unknown id at the loose adapter boundary.
