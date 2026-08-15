const legacySuccessProperty = /\bsuccess\s*:\s*true\b/;

function openingFence(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
  if (match === null) return undefined;

  const marker = match[1];
  return { character: marker[0], length: marker.length };
}

function closesFence(line, fence) {
  const match = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
  if (match === null) return false;

  const marker = match[1];
  return marker[0] === fence.character && marker.length >= fence.length;
}

/**
 * Finds copyable Markdown examples that contain the obsolete adapter success property.
 *
 * Prose and inline code are intentionally ignored. Backtick and tilde fenced blocks are scanned,
 * including an unclosed fence that extends to the end of the document.
 *
 * @param {string} markdown Markdown source to inspect.
 * @returns {readonly { line: number }[]} Opening line numbers for matching fenced blocks.
 */
export function findLegacySuccessExamples(markdown) {
  const matches = [];
  const lines = markdown.split(/\r?\n/);
  let active;

  function inspectActiveFence() {
    if (active !== undefined && legacySuccessProperty.test(active.lines.join("\n"))) {
      matches.push({ line: active.line });
    }
  }

  for (const [index, line] of lines.entries()) {
    if (active === undefined) {
      const fence = openingFence(line);
      if (fence !== undefined) {
        active = { ...fence, line: index + 1, lines: [] };
      }
    } else if (closesFence(line, active)) {
      inspectActiveFence();
      active = undefined;
    } else {
      active.lines.push(line);
    }
  }

  inspectActiveFence();
  return matches;
}
