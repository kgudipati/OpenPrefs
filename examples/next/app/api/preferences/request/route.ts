import { NextResponse } from "next/server";
import { openPrefs } from "../../../../lib/openPrefs";
import { readSettings } from "../../../../lib/settings";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Resolves one natural-language preference request without bypassing confirmation policy. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || typeof body.text !== "string") {
    return NextResponse.json({ error: "Malformed preference request." }, { status: 400 });
  }

  const result = await openPrefs.request(body.text);
  return NextResponse.json({ result, state: readSettings() });
}
