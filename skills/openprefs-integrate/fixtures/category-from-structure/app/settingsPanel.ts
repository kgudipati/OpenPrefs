import { setEmail, setMentionsOnly, setPush } from "./notificationSettings";

/** Controls rendered together by the existing settings panel. */
export const deliveryControls = [
  { key: "email", kind: "toggle", label: "Email", update: setEmail },
  { key: "push", kind: "toggle", label: "Push", update: setPush },
  { key: "mentionsOnly", kind: "toggle", label: "Mentions only", update: setMentionsOnly },
] as const;
