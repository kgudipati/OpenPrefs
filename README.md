# OpenPrefs

**Let your users change settings by typing what they want.**

```
"Only notify me when someone messages me directly, use dark mode,
 and make the text bigger."
```

OpenPrefs turns that sentence into validated changes to the settings your app already has — using your existing settings code. No migration, no new database, no required UI, and no model bundled in.

---

## The problem

Your settings page has grown. Users know the outcome they want; they don't know your menu hierarchy.

"Only notify me for direct messages" is one intent. In your app it's five toggles across two sections. So users either give up, or they turn off notifications entirely.

OpenPrefs adds a text box that does the translation.

## How it works

```
user types a sentence
        ↓
   your LLM          ← you bring the model
        ↓
proposed changes     ← untrusted, just data
        ↓
   OpenPrefs         ← checks every change against what you allow
        ↓
your existing settings code
```

The model never touches your app. It proposes; OpenPrefs verifies against a list of settings you define, then calls the same update function your settings page already calls.

## Install

> **Temporary beta:** OpenPrefs is not yet on npm. Download the beta tarball from GitHub Releases,
> then install it with `npm install ./openprefs-0.1.0-beta.1.tgz`.

Zero dependencies. Works in Node, the browser, and React Native.

---

## Quickstart (Next.js)

### 1. Describe the settings you want to expose

This is the whitelist. Anything not listed here cannot be changed, no matter what the model says.

```ts
// lib/openprefs.ts
import {
  createOpenPrefs,
  definePreferences,
  type PreferencesAdapter,
  type PreferencesResolver,
} from "openprefs";
import { getSettings, updateSettings } from "@/lib/settings";

const settings = definePreferences({
  theme: {
    type: "string",
    enum: ["light", "dark", "system"],
    description: "Application color theme.",
  },
  textSize: {
    type: "string",
    enum: ["small", "medium", "large"], // order matters: "bigger" moves right
    description: "Size of text throughout the app.",
  },
  directMessageNotifications: {
    type: "boolean",
    description: "Whether notifications are sent for direct messages.",
  },
  marketingNotifications: {
    type: "boolean",
    description: "Whether promotional and marketing notifications are sent.",
  },
});
```

Descriptions matter — they're what the model reads. Write them the way a user would describe the setting.

### 2. Point it at your existing settings code

```ts
const adapter: PreferencesAdapter<typeof settings> = {
  read: () => getSettings(),
  async apply(changes) {
    await updateSettings(
      Object.fromEntries(changes.map((c) => [c.id, c.value]))
    );
    return { ok: true };
  },
};
```

The `typeof settings` type parameter gives you autocomplete for each change and catches mismatches between your adapter and settings list.

That's it. `updateSettings` is whatever you already have — a Zustand store, a REST call, Prisma, `localStorage`. OpenPrefs doesn't care and doesn't replace it.

### 3. Bring your model

```ts
const resolver: PreferencesResolver = {
  async resolve({ text, preferences, current }) {
    // Send text + settings list to your LLM, ask for JSON back.
    // Return it directly — OpenPrefs validates it for you.
    return await askYourModel(text, preferences, current);
  },
};

export const openPrefs = createOpenPrefs({ preferences: settings, adapter, resolver });
```

Any model, any provider, self-hosted or API. A complete working implementation is in [`examples/typescript`](https://github.com/kgudipati/OpenPrefs/tree/main/examples/typescript) — 307 lines with `fetch`, no SDK. Typical cost is a fraction of a cent per request on a small model.

### 4. Wire up a route and a text box

```ts
// app/api/settings/nl/route.ts
import { openPrefs } from "@/lib/openprefs";

export async function POST(req: Request) {
  const { text } = await req.json();
  return Response.json(await openPrefs.request(text));
}
```

```tsx
const result = await fetch("/api/settings/nl", {
  method: "POST",
  body: JSON.stringify({ text: input }),
}).then((r) => r.json());

switch (result.status) {
  case "confirmation_required":
    // Show the user what will change, then POST result.proposal to confirm
    setPreview(result.preview);
    break;
  case "applied":
    router.refresh();
    break;
  case "needs_clarification":
    setQuestion(result.question); // "Which notifications?"
    break;
  case "unsupported":
    setMessage("I couldn't find a setting that controls that.");
    break;
}
```

`openPrefs.request()` never throws; runtime problems are returned as plain result data. A `failed`
status means the resolver or adapter had an infrastructure problem. It does not mean “no such
setting” — that is `unsupported`. Treat `needs_clarification.question` as untrusted resolver output:
render it as escaped text, never as HTML.

A full Next.js app with a settings page, a text box, and a confirmation dialog is in [`examples/next`](https://github.com/kgudipati/OpenPrefs/tree/main/examples/next).

---

## What your users get

| They type | What happens |
| --- | --- |
| "use dark mode" | One setting changes |
| "only notify me for DMs" | One intent, five settings updated |
| "make the text bigger" | Reads the current value, steps up one |
| "make this less distracting" | Proposes a set of changes, shows them first |
| "turn off those notifications" | Asks which ones instead of guessing |
| "make my battery last longer" | Says it can't, rather than inventing a setting |

## Confirmation is on by default

Every change asks the user first until you say otherwise:

```ts
createOpenPrefs({
  preferences: settings,
  adapter,
  resolver,
  policy: {
    confirmation: "sensitive",   // "always" (default) | "sensitive" | "never"
    maxChangesPerRequest: 10,
  },
});
```

Mark individual settings that should always confirm, no matter the global policy:

```ts
shareDataWithPartners: {
  type: "boolean",
  description: "Whether usage data is shared with partners.",
  openPrefs: { sensitive: true, confirmation: "required" },
},
```

When confirmation is needed you get back the proposed changes with before/after values, so you can render your own dialog. Nothing is written until you call `confirm()`.

## The model can't break anything

OpenPrefs treats every model response as untrusted data. Before a single change reaches your code, it checks that the setting exists in your list, that the value is the right type, that enums match, and that numbers are in range. Anything else is rejected.

The model can only choose among the settings you explicitly listed. It can't invent a setting, run code, or reach anything you didn't expose — including when someone tries to talk it into doing so.

## Already have 40 settings?

The package ships a skill for coding agents. Point yours at:

```
node_modules/openprefs/skills/openprefs-integrate/SKILL.md
```

It traces your existing settings — UI labels, stores, API calls, storage — and generates the settings list and adapter for you, without changing how your app works. Settings it can't confidently describe are left commented out with a note, so you fill in the meaning rather than the agent guessing. Then you review what got exposed before shipping.

You can also just write the twenty lines yourself. The skill is optional.

---

## API

```ts
definePreferences(settings)      // define what can be changed
parsePreferencesJson(json)       // same, from JSON
createOpenPrefs({ ... })         // create the instance

openPrefs.request(text)          // text in, result out
openPrefs.confirm(proposal)      // apply something the user approved
openPrefs.apply(changes)         // skip the model, change settings directly
```

Results are plain data, discriminated by `status`: `applied`, `confirmation_required`, `needs_clarification`, `unsupported`, `rejected`, or `failed`. Nothing throws at runtime.

Full TypeScript types, ESM and CommonJS. See [`docs/architecture.md`](https://github.com/kgudipati/OpenPrefs/blob/main/docs/architecture.md) for the details.

## Status

`0.1.0-beta.1` — early. The API may change before 1.0 as real apps use it. Feedback and issues welcome.

MIT
