import { NextResponse } from "next/server";
import type { OpenPrefsResult } from "openprefs";
import { openPrefs } from "../../../lib/openPrefs";
import { type AppSettings, readSettings, updateSettings } from "../../../lib/settings";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function conventionalUpdate(value: unknown): Partial<AppSettings> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (value.theme === "light" || value.theme === "dark" || value.theme === "system") {
    return { theme: value.theme };
  }
  if (typeof value.compactMode === "boolean") {
    return { compactMode: value.compactMode };
  }
  if (typeof value.marketingNotifications === "boolean") {
    return { marketingNotifications: value.marketingNotifications };
  }
  if (typeof value.usageAnalytics === "boolean") {
    return { usageAnalytics: value.usageAnalytics };
  }
  if (
    value.profileVisibility === "public" ||
    value.profileVisibility === "connections" ||
    value.profileVisibility === "private"
  ) {
    return { profileVisibility: value.profileVisibility };
  }
  return undefined;
}

async function confirmUntrusted(proposal: unknown): Promise<OpenPrefsResult> {
  return Reflect.apply(openPrefs.confirm, openPrefs, [proposal]);
}

/** Returns the current host-owned settings snapshot to the example page. */
export async function GET() {
  return NextResponse.json({ state: readSettings() });
}

/** Handles conventional updates, natural-language requests, and explicit confirmations. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || typeof body.kind !== "string") {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (body.kind === "control") {
    const changes = conventionalUpdate(body.changes);
    if (changes === undefined) {
      return NextResponse.json({ error: "Invalid conventional setting." }, { status: 400 });
    }
    return NextResponse.json({ state: updateSettings(changes) });
  }

  let result: OpenPrefsResult;
  if (body.kind === "request" && typeof body.text === "string") {
    result = await openPrefs.request(body.text);
  } else if (body.kind === "confirm") {
    result = await confirmUntrusted(body.proposal);
  } else {
    return NextResponse.json({ error: "Unknown preference operation." }, { status: 400 });
  }

  return NextResponse.json({ result, state: readSettings() });
}
