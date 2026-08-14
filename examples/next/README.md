# Next.js App Router integration

This deliberately small settings page demonstrates where OpenPrefs fits in an App Router
application. Natural language is the prominent path, while theme, layout, notifications,
analytics, and profile controls remain available conventionally.

The browser sends text to `app/api/preferences/route.ts`. That route imports the resolver from a
`server-only` module, so a hosted resolver's API key never enters the client bundle. The included
resolver is deterministic so the app works without a key. Replace `serverResolver` in
`lib/openPrefs.ts` with the fetch-based resolver from the TypeScript example—or any implementation
of `PreferencesResolver`—to use another provider.

The route returns `ConfirmationRequiredResult` unchanged. The page renders its `preview` as
before/after rows, and only sends the proposal to `openPrefs.confirm()` after explicit approval.
Both the conventional-controls route and the OpenPrefs adapter call `updateSettings()`, proving
that natural language uses the application's existing mutation path.

## Run it

From a clean repository checkout:

```sh
npm ci
npm run build
cd examples/next
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run verify` to typecheck and produce a
production build. To swap resolvers, keep the route and adapter unchanged and replace only the
`resolver` passed to `createOpenPrefs()` in `lib/openPrefs.ts`.
