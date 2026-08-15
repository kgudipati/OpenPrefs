"use client";

import type {
  ConfirmationRequiredResult,
  OpenPrefsResult,
  PreferenceChangePreview,
  SettingsProposal,
} from "openprefs";
import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../lib/settings";

/*
 * This reference UI is meant to be copied into a host application and restyled.
 * Three details are load-bearing for correctness: submit selected changes through apply(), fall
 * back to proposal values when a read cannot produce a preview, and render clarification questions
 * through React text interpolation because they are untrusted model output.
 */

interface ApiResponse {
  readonly state?: AppSettings;
  readonly result?: OpenPrefsResult;
  readonly error?: string;
}

async function postPreferences(path: "request" | "apply", body: unknown): Promise<ApiResponse> {
  const response = await fetch(`/api/preferences/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: ApiResponse = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "The settings request failed.");
  }
  return payload;
}

function rejectedMessage(result: Extract<OpenPrefsResult, { status: "rejected" }>): string {
  if (result.reason === "proposal_rejected") {
    const diagnostics = result.rejections
      .map((rejection) => {
        const preference = rejection.id === undefined ? "" : ` (${rejection.id})`;
        return `[${rejection.code}]${preference}: ${rejection.message}`;
      })
      .join(" ");
    return `OpenPrefs rejected the proposal during validation: ${diagnostics}`;
  }
  if (result.reason === "too_many_changes") {
    return `OpenPrefs rejected ${result.count} proposed changes because policy.maxChangesPerRequest is ${result.limit}.`;
  }
  if (result.reason === "unknown_preference") {
    return "OpenPrefs rejected the proposal because it named a preference this app does not expose.";
  }
  const unhandledResult: never = result;
  return unhandledResult;
}

function resultMessage(result: OpenPrefsResult): string {
  switch (result.status) {
    case "applied":
      return `Applied ${result.applied.length} preference change${result.applied.length === 1 ? "" : "s"}.`;
    case "already_satisfied":
      return "Those settings are already set that way.";
    case "needs_clarification":
      return result.question;
    case "unsupported":
      return "That request does not match an exposed preference.";
    case "rejected":
      return rejectedMessage(result);
    case "failed":
      return `A resolver or settings adapter infrastructure failure prevented the request from completing: ${result.error}`;
    case "confirmation_required":
      return "Review the proposed changes before applying them.";
  }
}

function formatPreferenceValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value === undefined) {
    return "Unknown";
  }
  return JSON.stringify(value) ?? String(value);
}

function previewForChange(
  id: string,
  proposedValue: unknown,
  preview: readonly PreferenceChangePreview[] | undefined,
): {
  readonly label?: string;
  readonly before?: unknown;
  readonly after: unknown;
  readonly hasBefore: boolean;
} {
  const previewChange = preview?.find((change) => change.id === id);
  if (previewChange !== undefined) {
    return {
      ...(previewChange.label === undefined ? {} : { label: previewChange.label }),
      before: previewChange.before,
      after: previewChange.after,
      hasBefore: true,
    };
  }

  // A host read() may omit values, so the validated proposal is the required display fallback.
  return { after: proposedValue, hasBefore: false };
}

/** Renders natural-language and conventional controls over the same application settings. */
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>();
  const [intent, setIntent] = useState("turn off marketing notifications and use dark mode");
  const [message, setMessage] = useState("Loading your settings…");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequiredResult>();
  const [selectedChangeIds, setSelectedChangeIds] = useState<readonly string[]>([]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/preferences");
    const payload: ApiResponse = await response.json();
    if (payload.state !== undefined) {
      setSettings(payload.state);
      setMessage("Settings are up to date.");
    }
  }, []);

  useEffect(() => {
    void refresh().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Could not load settings.");
    });
  }, [refresh]);

  function handleResult(result: OpenPrefsResult): void {
    setMessage(resultMessage(result));
    if (result.status === "confirmation_required") {
      setConfirmation(result);
      setSelectedChangeIds(result.proposal.changes.map((change) => String(change.id)));
      return;
    }
    setConfirmation(undefined);
    setSelectedChangeIds([]);
  }

  async function submitIntent(): Promise<void> {
    if (intent.trim().length === 0) {
      return;
    }
    setBusy(true);
    try {
      const payload = await postPreferences("request", { text: intent });
      if (payload.state !== undefined) {
        setSettings(payload.state);
      }
      if (payload.result !== undefined) {
        handleResult(payload.result);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applySelectedChanges(changes: SettingsProposal["changes"]): Promise<void> {
    setBusy(true);
    try {
      // Deselecting constructs a new proposal, so apply() revalidates it from scratch instead of
      // partially confirming an existing proposal. Under PR #24's policy semantics, this subset
      // may also fall under maxChangesPerRequest even when the original proposal exceeded it.
      const payload = await postPreferences("apply", { changes });
      if (payload.state !== undefined) {
        setSettings(payload.state);
      }
      if (payload.result !== undefined) {
        handleResult(payload.result);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Applying selected changes failed.");
    } finally {
      setBusy(false);
    }
  }

  const selectedChanges =
    confirmation?.proposal.changes.filter((change) =>
      selectedChangeIds.includes(String(change.id)),
    ) ?? [];

  async function saveControl(changes: Partial<AppSettings>): Promise<void> {
    setBusy(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const payload: ApiResponse = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "The setting could not be saved.");
      }
      if (payload.state !== undefined) {
        setSettings(payload.state);
      }
      setMessage("Saved through the application's existing settings path.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The setting could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">OpenPrefs integration example</p>
        <h1>Settings that understand you.</h1>
        <p className="lede">
          Describe the outcome you want, or use the familiar controls below. Both update the same
          application-owned settings store.
        </p>
      </header>

      <section className="intent-card" aria-labelledby="intent-title">
        <div>
          <p className="step">Natural language</p>
          <h2 id="intent-title">What would you like to change?</h2>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitIntent();
          }}
        >
          <label htmlFor="preference-intent" className="sr-only">
            Preference request
          </label>
          <input
            id="preference-intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="Make the app dark and stop marketing notifications"
          />
          <button type="submit" disabled={busy || settings === undefined}>
            {busy ? "Working…" : "Review change"}
          </button>
        </form>
        <p className="hint">Try “make my profile private” or “enable compact mode.”</p>
      </section>

      <section className="controls" aria-labelledby="controls-title">
        <div className="section-heading">
          <div>
            <p className="step">Conventional controls</p>
            <h2 id="controls-title">Choose settings directly</h2>
          </div>
          <p className="status" role="status">
            {/* React renders an untrusted clarification question here as escaped text, never HTML. */}
            {message}
          </p>
        </div>

        {settings !== undefined && (
          <div className="settings-list">
            <label className="setting-row">
              <span>
                <strong>Appearance</strong>
                <small>Choose the application color theme.</small>
              </span>
              <select
                value={settings.theme}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "light" || value === "dark" || value === "system") {
                    void saveControl({ theme: value });
                  }
                }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>

            <label className="setting-row">
              <span>
                <strong>Compact mode</strong>
                <small>Fit more information on each screen.</small>
              </span>
              <input
                className="toggle"
                type="checkbox"
                checked={settings.compactMode}
                disabled={busy}
                onChange={(event) => void saveControl({ compactMode: event.target.checked })}
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>Marketing notifications</strong>
                <small>Receive product offers and promotions.</small>
              </span>
              <input
                className="toggle"
                type="checkbox"
                checked={settings.marketingNotifications}
                disabled={busy}
                onChange={(event) =>
                  void saveControl({ marketingNotifications: event.target.checked })
                }
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>Usage analytics</strong>
                <small>Share anonymous telemetry to improve the product.</small>
              </span>
              <input
                className="toggle"
                type="checkbox"
                checked={settings.usageAnalytics}
                disabled={busy}
                onChange={(event) => void saveControl({ usageAnalytics: event.target.checked })}
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>Profile visibility</strong>
                <small>Control who can see your profile.</small>
              </span>
              <select
                value={settings.profileVisibility}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "public" || value === "connections" || value === "private") {
                    void saveControl({ profileVisibility: value });
                  }
                }}
              >
                <option value="public">Public</option>
                <option value="connections">Connections</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {confirmation !== undefined && (
        <div className="dialog-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <p className="step">Confirmation required</p>
            <h2 id="dialog-title">Review these changes</h2>
            <p>OpenPrefs has validated the proposal but has not changed your settings yet.</p>
            {confirmation.exceedsChangeLimit && (
              <p className="limit-warning" role="note">
                This request proposes {confirmation.proposal.changes.length} changes, more than
                policy.maxChangesPerRequest permits without confirmation. Review each change
                carefully.
              </p>
            )}
            <div className="preview-list">
              {confirmation.proposal.changes.map((change) => {
                const id = String(change.id);
                const row = previewForChange(id, change.value, confirmation.preview);
                const selected = selectedChangeIds.includes(id);
                return (
                  <div className="preview-row" key={id}>
                    <label className="change-selection">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={busy}
                        onChange={(event) => {
                          setSelectedChangeIds((current) =>
                            event.target.checked
                              ? [...current, id]
                              : current.filter((selectedId) => selectedId !== id),
                          );
                        }}
                      />
                      <strong>{row.label ?? id}</strong>
                    </label>
                    {row.hasBefore ? (
                      <>
                        <span>{formatPreferenceValue(row.before)}</span>
                        <span aria-hidden="true">→</span>
                        <span>{formatPreferenceValue(row.after)}</span>
                      </>
                    ) : (
                      <span className="proposed-value">
                        Set to {formatPreferenceValue(row.after)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="dialog-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setConfirmation(undefined);
                  setSelectedChangeIds([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || selectedChanges.length === 0}
                onClick={() => void applySelectedChanges(selectedChanges)}
              >
                Apply selected ({selectedChanges.length})
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
