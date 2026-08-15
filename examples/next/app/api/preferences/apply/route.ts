import { NextResponse } from "next/server";
import type { OpenPrefsResult } from "openprefs";
import { openPrefs } from "../../../../lib/openPrefs";
import { readSettings } from "../../../../lib/settings";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyUntrusted(changes: unknown): Promise<OpenPrefsResult> {
  return Reflect.apply(openPrefs.apply, openPrefs, [changes]);
}

/** Revalidates and applies the user-selected changes as a new OpenPrefs proposal. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || !("changes" in body)) {
    return NextResponse.json({ error: "Malformed apply request." }, { status: 400 });
  }

  const result = await applyUntrusted(body.changes);
  return NextResponse.json({ result, state: readSettings() });
}
