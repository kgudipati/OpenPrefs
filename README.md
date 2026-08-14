# OpenPrefs

OpenPrefs is an open-source, headless TypeScript library that lets users control an application's existing preferences using natural language—without requiring the developer to migrate or redesign their settings system.

## Natural-language preferences in twenty seconds

```sh
npm install openprefs
```

```ts
import { createOpenPrefs, definePreferences } from "openprefs";
import { myResolver } from "./myResolver.js";

const preferences = definePreferences({
  theme: {
    type: "string",
    description: "Application color theme.",
    enum: ["light", "dark", "system"],
  },
});

let theme: "light" | "dark" | "system" = "system";
const openPrefs = createOpenPrefs({
  preferences,
  resolver: myResolver,
  adapter: {
    read: () => ({ theme }),
    apply(changes) {
      for (const change of changes) theme = change.value;
      return { ok: true };
    },
  },
});

const result = await openPrefs.request("use dark mode");
```

The resolver is application-supplied and its proposal is untrusted; OpenPrefs validates it before
the adapter invokes the application's existing settings path. OpenPrefs ships no resolver, model,
SDK, backend, or UI. See the [plain TypeScript CLI](./examples/typescript/README.md) and the
[Next.js App Router integration](./examples/next/README.md) for complete integrations.
