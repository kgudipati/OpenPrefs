# OpenPrefs Development Contract

OpenPrefs is a semantic layer that turns natural-language intent into validated changes against an application's existing preference system. It is headless and framework-agnostic: the host application retains ownership of its settings architecture, persistence, user experience, and execution environment.

## Runtime primitives

- **Manifest** describes which preferences exist and which capabilities are exposed. It does not own persistence.
- **Resolver** turns text into proposed changes. It does not own execution authority.
- **Validator** determines structural legality. It does not interpret user intent.
- **Policy** decides whether and when changes proceed. It does not own authentication or authorization.
- **Adapter** invokes the host application's existing preference logic. It does not own the host's settings architecture.

## Security boundary

Every request must pass through this chain:

user input -> resolver -> **UNTRUSTED proposal** -> manifest whitelist -> type validation -> value validation -> policy -> confirmation -> adapter

The resolver can never create capabilities. It can only select among capabilities that the manifest already exposes.

## NEVER

- Never add a runtime dependency without explicit approval.
- Never bundle, download, or require an LLM, model runtime, or inference SDK.
- Never add a backend, database, hosted service, or telemetry.
- Never require React or any framework in core.
- Never execute model-generated code; the resolver returns data only.
- Never add UI components; OpenPrefs is headless.
- Never add audio, voice, or speech-to-text.
- Never widen the manifest to arbitrary "actions"; preferences only.
- Never restructure a host application's preference system.

## Feature litmus test

Every new feature must clearly answer yes to all four questions:

1. Does it help turn natural-language intent into application preferences?
2. Can it work on top of the developer's existing implementation?
3. Can we do it without OpenPrefs owning infrastructure it does not need?
4. Must OpenPrefs solve this, rather than the host app, model, or coding agent?

If any answer is not clearly yes, do not build it.

## Testing expectations

Core logic must be testable with no LLM present. Tests must keep external models and model runtimes outside the test boundary.
