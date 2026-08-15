# Implemented core architecture

This document records the implemented OpenPrefs core semantics. The manifest, resolver, validator,
policy, and adapter remain separate because each primitive owns a different part of the request
boundary.

## Runtime primitives

- **Manifest:** Defines the complete preference whitelist, value constraints, and OpenPrefs metadata.
  It describes host-owned settings but does not persist them.
- **Resolver:** Turns natural-language text and optional current values into an untrusted proposal.
  It selects only among manifest capabilities and has no execution authority.
- **Validator:** Checks proposal structure, manifest membership, value type, and value constraints. It
  does not infer intent.
- **Policy:** Decides whether the complete validated proposal is rejected, requires confirmation, or
  may proceed. It does not authenticate users or render confirmation UI.
- **Adapter:** Invokes the host application's existing read and mutation operations. The host retains
  ownership of settings architecture, persistence, and execution behavior.

## Manifest enum order

String enum values are stored in declaration order. Resolvers MAY treat position as ordinal when a
relative request and the current value make that interpretation unambiguous; no additional manifest
field is required. Live Phase 6 verification demonstrated this convention: with
`enum: ["small", "medium", "large"]` and current value `"medium"`, “make the text bigger” resolved
to `"large"` using declaration order alone.

## Manifest labels

Each preference definition may include a non-empty `label` copied from the host application's UI.
It is presentational for hosts and useful resolver context because users often repeat the settings
page's wording. Proposal validation, policy, and execution ignore it. Existing confirmation preview
entries include the label when present so hosts can avoid rendering raw ids; hosts may also read it
with `manifest.get(id)`.

## Request lifecycle and security boundary

Before resolution, OpenPrefs calls the optional adapter `read(ids)` with every manifest id. A read
failure degrades to resolution without current state. The resolver's result is untrusted data and
must pass the complete security boundary:

```text
user input -> resolver -> UNTRUSTED proposal -> manifest whitelist -> type validation -> value validation -> policy -> confirmation -> adapter
```

Policy evaluates the request as a whole. A request awaiting confirmation returns a data-only
proposal; `confirm(proposal)` revalidates and reevaluates that proposal before execution. Calling
`confirm()` is the host's assertion that the user approved that exact proposal.

## Empty proposals and result semantics

After a successful `resolved` resolver result crosses validation, policy returns
`already_satisfied` exactly when validation produced **zero changes and zero rejections**. The
corresponding lifecycle result is `{ status: "already_satisfied" }`, and the adapter is not called.
This is a policy outcome inside the existing lifecycle and does not change the security boundary.

The status records only that the resolver proposed no changes. OpenPrefs cannot infer from an empty
proposal that it independently read and verified every relevant host value, so hosts should treat
the outcome as informational without overstating that guarantee.

The nearby outcomes remain semantically distinct:

| Condition | Result | Meaning |
| --- | --- | --- |
| Zero validated changes and zero rejections | `already_satisfied` | The resolver proposed no changes. |
| One or more validation rejections, including when zero changes survive | `rejected / proposal_rejected` | Something in the proposal was refused. |
| Resolver returns `unsupported` | `unsupported` | The manifest cannot express the request; the app exposes no matching setting. |

The former `rejected / no_changes` variant was removed before the first npm publish because no input
could produce it. Validation assigns every proposed entry to either `changes` or `rejections`.
Policy checks rejections first, so an empty set with any rejection is `proposal_rejected`; an empty
set without rejections is `already_satisfied`. No resolver output, policy configuration, or manifest
shape creates a third empty condition, and keeping one in the public union would require hosts to
handle an impossible result.

## Resolver output boundary

`ResolveResult` is an authoring convenience, not a runtime guarantee. Core treats every resolver
output as `unknown` regardless of its declared TypeScript type, then inspects and validates it
against the manifest before policy or execution. Resolvers that construct changes dynamically
should use the loose `PreferenceChange` shape rather than claim the manifest-derived
`PreferenceChangeFor` union before OpenPrefs has validated the generated ids and values.

At execution, the adapter must return an explicit acknowledgement. `{ ok: true }` acknowledges that
all submitted changes were applied. `{ ok: false, failed: [...] }` names a non-empty set of changes
that failed, and submitted changes not named in `failed` are reported as applied. Missing,
contradictory, or malformed acknowledgement data produces a conservative total failure.

### TypeScript adapter return types

When an adapter object is declared without a contextual type, TypeScript can widen `{ ok: true }` to
`{ ok: boolean }`. The resulting error ends with the relevant literal mismatch:

```text
Type 'boolean' is not assignable to type 'true'.
```

Annotate the return type as `ApplyResult` (or `Promise<ApplyResult>` for an async method), or return
`{ ok: true } as const`, to preserve the literal discriminant. `{ ok: true, failed: [] }` is also a
valid success acknowledgement and applies correctly. Only `ok: true` with a non-empty `failed`
array is contradictory and treated as a malformed result.

## Confirmation policy

The implemented confirmation matrix is:

| Preference           | always  | sensitive | never   |
| -------------------- | ------- | --------- | ------- |
| ordinary             | confirm | apply     | apply   |
| sensitive            | confirm | confirm   | apply   |
| required             | confirm | confirm   | confirm |
| sensitive + required | confirm | confirm   | confirm |

`sensitive` is a **classification** whose effect depends on the global confirmation mode.
`confirmation: "required"` is the **enforcement floor** that global policy cannot weaken. The
global mode `"never"` means the global policy adds no confirmation; it does not mean OpenPrefs never
confirms, because a preference-level `confirmation: "required"` still applies.

`maxChangesPerRequest` limits only application **without confirmation** and defaults to `25`.
OpenPrefs computes confirmation before enforcing the limit. An over-limit proposal that already
requires confirmation remains `confirmation_required` and sets `exceedsChangeLimit: true` on that
result so the host can emphasize the bulk change during review. The limit adds no ids to
`requiredBy`. An over-limit proposal that would otherwise be applied is rejected with
`too_many_changes`, preserving the rule that bulk changes cannot happen silently. Within-limit
confirmation results set `exceedsChangeLimit: false`.

## Adapter reads

For every request, `read(ids)` receives all manifest ids. Adapters MAY return any subset, omitting
values that are expensive, unavailable, or inappropriate to expose to a resolver. The returned
subset is progressive context, not an OpenPrefs-owned state store.

Absence means only that the adapter supplied no usable current value. It does not distinguish a
write-only preference from a missing or temporarily unavailable value. JSON Schema's `writeOnly`
keyword is reserved as the future mechanism for permanent read-capability metadata; v0.x does not
implement it.

## Accepted v0.x limitations

- **Eager full-manifest reads:** OpenPrefs requests all manifest ids before the resolver has selected
  relevant preferences. An adapter may therefore consult multiple stores or remote APIs, although
  it may omit expensive or inappropriate values.
- **No value-availability state:** Omission from `read()` communicates only that no usable current
  value was returned. Resolvers cannot distinguish write-only, missing, and temporarily unavailable
  values.

Scoped reads, two-stage resolvers, value-availability states, `writeOnly`, and per-change success
receipts remain deliberately deferred.

## Deviations from the product specification

1. **Section 32 — sensitivity and confirmation:** Section 32 implies that `sensitive` alone forces
   confirmation. The implementation treats sensitivity as a classification whose effect depends on
   the global mode. Making it an absolute floor would make the `"sensitive"` and `"never"` modes
   behaviorally identical, collapsing a three-value enum into two behaviors.
2. **Section 11 — adapter success shape:** Section 11 shows an adapter returning
   `{ success: true }`. That shape is no longer valid. Adapters must affirm complete success with
   `{ ok: true }`; missing `ok` is a malformed result and fails closed.
