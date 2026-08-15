"use client";

import type { ConfirmationRequiredResult, OpenPrefsResult, SettingsProposal } from "openprefs";
import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../lib/settings";

interface ApiResponse {
  readonly state?: AppSettings;
  readonly result?: OpenPrefsResult;
  readonly error?: string;
}

async function postPreferences(body: unknown): Promise<ApiResponse> {
  const response = await fetch("/api/preferences", {
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

function resultMessage(result: OpenPrefsResult): string {
  switch (result.status) {
    case "applied":
      return `Applied ${result.applied.length} preference change${result.applied.length === 1 ? "" : "s"}.`;
    case "needs_clarification":
      return result.question;
    case "unsupported":
      return "That request does not match an exposed preference.";
    case "rejected":
      return `OpenPrefs rejected the proposal (${result.reason}).`;
    case "failed":
      return result.error;
    case "confirmation_required":
      return "Review the proposed changes before applying them.";
  }
}

/** Renders natural-language and conventional controls over the same application settings. */
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>();
  const [intent, setIntent] = useState("turn off marketing notifications and use dark mode");
  const [message, setMessage] = useState("Loading your settings…");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequiredResult>();

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

  async function submitIntent(): Promise<void> {
    if (intent.trim().length === 0) {
      return;
    }
    setBusy(true);
    try {
      const payload = await postPreferences({ kind: "request", text: intent });
      if (payload.state !== undefined) {
        setSettings(payload.state);
      }
      if (payload.result?.status === "confirmation_required") {
        setConfirmation(payload.result);
      } else if (payload.result !== undefined) {
        setMessage(resultMessage(payload.result));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmProposal(proposal: SettingsProposal): Promise<void> {
    setBusy(true);
    try {
      const payload = await postPreferences({ kind: "confirm", proposal });
      if (payload.state !== undefined) {
        setSettings(payload.state);
      }
      if (payload.result !== undefined) {
        setMessage(resultMessage(payload.result));
      }
      setConfirmation(undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveControl(changes: Partial<AppSettings>): Promise<void> {
    setBusy(true);
    try {
      const payload = await postPreferences({ kind: "control", changes });
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
            <div className="preview-list">
              {(confirmation.preview ?? []).map((change) => (
                <div className="preview-row" key={change.id}>
                  <strong>{change.id}</strong>
                  <span>{String(change.before)}</span>
                  <span aria-hidden="true">→</span>
                  <span>{String(change.after)}</span>
                </div>
              ))}
            </div>
            <div className="dialog-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setConfirmation(undefined)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmProposal(confirmation.proposal)}
              >
                Confirm changes
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
