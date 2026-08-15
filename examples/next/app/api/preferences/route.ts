import { NextResponse } from "next/server";
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

/** Returns the current host-owned settings snapshot to the example page. */
export async function GET() {
  return NextResponse.json({ state: readSettings() });
}

/** Handles updates from the example's conventional settings controls. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const changes = conventionalUpdate(body.changes);
  if (changes === undefined) {
    return NextResponse.json({ error: "Invalid conventional setting." }, { status: 400 });
  }
  return NextResponse.json({ state: updateSettings(changes) });
}
