import { setEmailAlerts, setF2, setTrackingEnabled } from "./legacyPreferences";

/** The old renderer accepts unlabeled controls; meaning was never documented for two of them. */
export const legacyControls = [
  { key: "trackingEnabled", kind: "toggle", update: setTrackingEnabled },
  { key: "f2", kind: "select", values: ["a", "b", "c"], update: setF2 },
  { key: "emailAlerts", kind: "toggle", label: "Email alerts", update: setEmailAlerts },
] as const;
