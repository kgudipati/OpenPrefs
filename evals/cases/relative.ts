import type { EvalCase } from "../harness/types.js";

/** Requests whose exact target depends on host-supplied current preference values. */
export const relativeCases: readonly EvalCase[] = [
  {
    id: "relative-001",
    class: "relative",
    input: "Make the text bigger.",
    startingState: { textSize: "medium" },
    expected: { status: "applied", changes: [{ id: "textSize", value: "large" }] },
  },
  {
    id: "relative-002",
    class: "relative",
    input: "Make the text smaller.",
    startingState: { textSize: "medium" },
    expected: { status: "applied", changes: [{ id: "textSize", value: "small" }] },
  },
  {
    id: "relative-003",
    class: "relative",
    input: "Turn the notification volume up one level.",
    startingState: { notificationVolume: 6 },
    expected: { status: "applied", changes: [{ id: "notificationVolume", value: 7 }] },
  },
  {
    id: "relative-004",
    class: "relative",
    input: "Make the layout more compact.",
    startingState: { density: "comfortable" },
    expected: { status: "applied", changes: [{ id: "density", value: "compact" }] },
  },
  {
    id: "relative-005",
    class: "relative",
    input: "Move the sidebar to the other side.",
    startingState: { sidebarPosition: "left" },
    expected: { status: "applied", changes: [{ id: "sidebarPosition", value: "right" }] },
  },
];
