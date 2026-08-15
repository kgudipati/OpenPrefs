export interface LegacyPreferences {
  readonly trackingEnabled: boolean;
  readonly f2: "a" | "b" | "c";
  readonly emailAlerts: boolean;
}

let current: LegacyPreferences = {
  trackingEnabled: false,
  f2: "b",
  emailAlerts: true,
};

export function readLegacyPreferences(): LegacyPreferences {
  return { ...current };
}

export function setTrackingEnabled(value: boolean): void {
  current = { ...current, trackingEnabled: value };
}

export function setF2(value: "a" | "b" | "c"): void {
  current = { ...current, f2: value };
}

export function setEmailAlerts(value: boolean): void {
  current = { ...current, emailAlerts: value };
}
