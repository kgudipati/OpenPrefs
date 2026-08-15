import { NextResponse } from "next/server";
import type { OpenPrefsResult } from "openprefs";
import { openPrefs } from "../../../../lib/openPrefs";
import { readSettings } from "../../../../lib/settings";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function confirmUntrusted(proposal: unknown): Promise<OpenPrefsResult> {
  return Reflect.apply(openPrefs.confirm, openPrefs, [proposal]);
}

/** Applies an exact, user-approved proposal through OpenPrefs' confirmation boundary. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || !("proposal" in body)) {
    return NextResponse.json({ error: "Malformed confirmation request." }, { status: 400 });
  }

  const result = await confirmUntrusted(body.proposal);
  return NextResponse.json({ result, state: readSettings() });
}
