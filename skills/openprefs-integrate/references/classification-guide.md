# Classification guide

Classify conservatively. The manifest is a capability whitelist, so a false positive is more
dangerous than a false negative.

## Decision sequence

1. Is this an enduring choice a user can control through an existing application path?
   - No: Tier 3 or not a preference candidate.
2. Is it an internal operational, developer, rollout, or experiment control?
   - Yes: Tier 3 even if it is editable in an admin or debug screen.
3. Can the existing read/state path and setter/persistence path be traced?
   - No: do not generate a mutation; report it as untraced.
4. Does repository evidence support a precise user-facing description?
   - Yes: Tier 1.
   - No: Tier 2 with complete inactive adapter wiring.

## Worked decisions

### Tier 1: clear user evidence

`notifyDirectMessages` is rendered with the label “Direct message notifications,” calls
`setNotifyDirectMessages`, and persists through the settings API. The label supports “Whether
notifications are sent for direct messages.” This is Tier 1.

`textScale` has the help text “Choose small, medium, or large reading text.” The store setter accepts
exactly those values. This is Tier 1 with `enum: ["small", "medium", "large"]` in natural order.

`shareUsageData` is labeled “Share anonymous usage data to improve the product.” This is Tier 1 and
sensitive because it controls data sharing. If changing it also enrolls the account in a durable
program or has an irreversible effect, add confirmation required; do not infer irreversibility.

### Tier 2: user preference, insufficient meaning

`trackingEnabled` appears in the user settings page and reaches `setTrackingEnabled`, which persists
it. No label, help text, docs, tests, or meaningful API field clarifies whether it means analytics,
location, delivery, or internal tracing. It is confidently a user preference but semantically
ambiguous: Tier 2.

`mode2` is controlled by an unlabeled select in the user preferences route, with values `a`, `b`,
and `c`. The complete setter and storage key are known. It is Tier 2; never rename the values or
claim an ordinal relationship.

An identifier such as `emailAlerts` may be enough to establish email notifications generally, but
not which events produce them. If the app has only a single global email-notification control and
tests document that global behavior, Tier 1 may be justified. If nearby code has event-specific
email controls, use Tier 2 until evidence distinguishes scope.

### Tier 3: internal configuration

- `API_URL`: deployment routing, not a user preference.
- `DEBUG_MODE`: developer diagnostics behavior, not a user preference.
- `newCheckoutExperiment: "treatment-b"`: experiment assignment; exposing it lets natural language
  bypass rollout ownership.
- `databasePoolSize`: operational capacity, even if loaded from a settings object.
- `ENABLE_NEW_EDITOR`: feature flag, even if an internal staff panel can flip it.
- `traceSampleRate`: telemetry infrastructure tuning, distinct from a user's consent to share data.

List these exclusions in the report. Do not create manifest entries or active adapter cases for them.

## Ambiguous boundary cases

### Diagnostic uploads

A user-visible consent control labeled “Send crash reports” is a Tier 1 user preference, sensitive
for data sharing. A server environment variable controlling whether the diagnostics subsystem may
upload at all is Tier 3. Similar names do not make them the same capability.

### Feature availability versus user choice

`ENABLE_DARK_MODE` that gates a rollout is Tier 3. A user-selected `theme` inside the enabled
feature is Tier 1 when the UI and setter are traced. Do not expose the gate as another preference.

### Admin controls

An organization administrator may be a legitimate user, but an admin control is not automatically a
personal preference. If it changes organization policy, account state, permissions, billing, or
other users' data, it is outside the ordinary preference boundary unless the product specification
and host clearly model it as a preference. Err toward exclusion and ask the developer.

### One-shot actions

“Delete export,” “rotate API key,” “send test email,” and “clear cache” are actions, not enduring
preferences. Exclude them even if they appear on a settings page. OpenPrefs exposes preferences only.

### Defaults and remote configuration

A default value may document a real preference, but the default itself is not another preference.
Remote configuration that chooses defaults, limits, or availability is Tier 3 unless a user directly
controls an enduring value through a traced preference path.

## Resolving uncertainty

Search labels, localization catalogs, accessibility names, tests, screenshots committed as docs,
API schemas, changelogs, and product documentation. If meaning remains uncertain, keep Tier 2. If it
is uncertain whether the setting is user-controlled at all, exclude it from the manifest and report
the boundary question for the developer rather than forcing it into a tier optimistically.
