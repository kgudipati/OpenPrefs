# Description authoring guide

Manifest descriptions are resolver input, not API documentation. A description should let a
resolver distinguish the preference from nearby preferences, group it with related preferences,
and map user language to it without inventing semantics.

## The evidence rule

Use only meaning supported by a UI label, help text, product documentation, meaningful comment, or
unambiguous API field name. Code establishes mechanics; it does not always establish user meaning.

| Evidence | Candidate description | Decision |
| --- | --- | --- |
| Label “Direct message notifications” | “Whether notifications are sent for direct messages.” | Good: meaning and category are explicit. |
| Field `trackingEnabled`, no label or docs | “Whether tracking is enabled.” | Bad: “tracking” remains ambiguous; use Tier 2. |
| Setter `setCompactMode`, label “Use less spacing” | “Whether the interface uses compact spacing.” | Good: user-facing effect is supported. |
| Storage key `cfg_x7` and unlabeled toggle | Any active description | Bad: mechanics alone support no meaning; use Tier 2. |

Do not treat an inferred expansion such as “DM,” “P13N,” or “diag” as evidence unless the repository
defines it.

## Carry category information in prose

Multi-setting intent depends on relationships that the manifest does not express separately.
Repeat the category in each related description.

Bad:

```ts
notifyDirectMessages: { description: "Enables DM notifs." }
notifyMentions: { description: "Alerts for mentions." }
notifyComments: { description: "Comment pings." }
```

Better:

```ts
notifyDirectMessages: {
  description: "Whether notifications are sent for direct messages.",
}
notifyMentions: {
  description: "Whether notifications are sent when the user is mentioned.",
}
notifyComments: {
  description: "Whether notifications are sent for new comments and replies.",
}
```

The repeated word “notifications” is useful, not redundant. It supplies a shared category for “turn
off my social notifications” while the rest of each sentence preserves distinctions.

Other useful category-bearing forms:

- “The interface text size, from small to large.”
- “Whether accessibility motion effects and nonessential animation are reduced.”
- “Who can view the user profile: anyone, connections, or only the user.”
- “Whether anonymous usage analytics and diagnostic data are shared with the application.”

## Describe effect, not implementation

| Weak | Better | Why |
| --- | --- | --- |
| “Sets `notif_dm`.” | “Whether notifications are sent for direct messages.” | Removes internal names and adds meaning. |
| “Boolean for compact mode.” | “Whether the interface uses compact spacing.” | States user-visible effect and category. |
| “Controls font.” | “The reading text size, from small to large.” | Distinguishes size from family or weight. |
| “Privacy option.” | “Who can view the user profile: anyone, connections, or only the user.” | Names the actual privacy boundary. |
| “Enables emails.” | “Whether security alerts are also sent by email.” | Distinguishes one email category from others. |

Do not include implementation details such as storage keys, reducer names, endpoints, or component
names. Keep those in the integration report.

## State the controlled axis

Words such as “theme,” “tracking,” “alerts,” and “size” may cover several axes. State the exact axis
when evidence supports it:

- “Application color theme: light, dark, or system appearance” instead of “Theme.”
- “Notification sound volume from zero to ten” instead of “Notification setting.”
- “Whether approximate location is shared with nearby-place features” instead of “Tracking.”

If the evidence does not identify the axis, stop at Tier 2.

## Preserve ordered enums

Resolvers may interpret declaration position as ordinal. Declare ordinal values in natural order:

```ts
enum: ["small", "medium", "large"]
enum: ["quiet", "normal", "loud"]
enum: ["never", "daily", "weekly"] // only if this is the host's documented progression
```

Never alphabetize `large, medium, small`. That destroys the evidence needed for relative requests
such as “make the text bigger.” Do not invent an ordering for nominal choices such as color themes.
Preserve the host's declaration or UI order for nominal enums.

When raw values are opaque but labels are clear, keep the host values in `enum` and explain their
meaning in the description only if the resolver can safely map them. If safe mapping is not possible
without changing the host value contract, ask the developer rather than inventing an alias layer.

## Final description check

For every active entry, answer yes to all of these:

1. Does cited repository evidence support every semantic claim?
2. Does the sentence state what changes for the user?
3. Does it name the category shared with related preferences?
4. Does it distinguish this preference from adjacent ones?
5. Does it avoid implementation jargon, unsupported synonyms, and policy promises?

If any answer is no, improve it from evidence or classify the entry as Tier 2.
