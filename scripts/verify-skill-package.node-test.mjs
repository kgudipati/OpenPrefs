import assert from "node:assert/strict";
import test from "node:test";
import { findLegacySuccessExamples } from "./markdown-code-blocks.mjs";

test("allows an inline invalidity warning in prose", () => {
  const markdown = "The legacy `{ success: true }` shape is invalid.";

  assert.deepEqual(findLegacySuccessExamples(markdown), []);
});

test("rejects a fenced legacy return example", () => {
  const markdown = ["```ts", "return { success: true };", "```"].join("\n");

  assert.deepEqual(findLegacySuccessExamples(markdown), [{ line: 1 }]);
});

test("rejects a fenced legacy whitespace variant", () => {
  const markdown = ["```ts", "return { success:true };", "```"].join("\n");

  assert.deepEqual(findLegacySuccessExamples(markdown), [{ line: 1 }]);
});

test("rejects a four-space indented legacy return example", () => {
  const markdown = "    return { success: true };";

  assert.deepEqual(findLegacySuccessExamples(markdown), [{ line: 1 }]);
});

test("allows a fenced valid success example", () => {
  const markdown = ["```ts", "return { ok: true };", "```"].join("\n");

  assert.deepEqual(findLegacySuccessExamples(markdown), []);
});
