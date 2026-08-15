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

function indentedCodeLine(line) {
  if (line.startsWith("    ")) return line.slice(4);
  if (line.startsWith("\t")) return line.slice(1);
  return undefined;
}

/**
 * Finds copyable Markdown examples that contain the obsolete adapter success property.
 *
 * Prose and inline code are intentionally ignored. Backtick fences, tilde fences, and indented code
 * blocks are scanned, including an unclosed fence that extends to the end of the document.
 *
 * @param {string} markdown Markdown source to inspect.
 * @returns {readonly { line: number }[]} Opening line numbers for matching fenced blocks.
 */
export function findLegacySuccessExamples(markdown) {
  const matches = [];
  const lines = markdown.split(/\r?\n/);
  let activeFence;
  let activeIndentedBlock;

  function inspectBlock(block) {
    if (block !== undefined && legacySuccessProperty.test(block.lines.join("\n"))) {
      matches.push({ line: block.line });
    }
  }

  function startBlock(line, index) {
    const fence = openingFence(line);
    if (fence !== undefined) {
      activeFence = { ...fence, line: index + 1, lines: [] };
      return;
    }

    const code = indentedCodeLine(line);
    if (code !== undefined) {
      activeIndentedBlock = { line: index + 1, lines: [code] };
    }
  }

  for (const [index, line] of lines.entries()) {
    if (activeFence !== undefined) {
      if (closesFence(line, activeFence)) {
        inspectBlock(activeFence);
        activeFence = undefined;
      } else {
        activeFence.lines.push(line);
      }
      continue;
    }

    if (activeIndentedBlock === undefined) {
      startBlock(line, index);
      continue;
    }

    const code = indentedCodeLine(line);
    if (code !== undefined) {
      activeIndentedBlock.lines.push(code);
    } else if (line.trim().length === 0) {
      activeIndentedBlock.lines.push("");
    } else {
      inspectBlock(activeIndentedBlock);
      activeIndentedBlock = undefined;
      startBlock(line, index);
    }
  }

  inspectBlock(activeFence);
  inspectBlock(activeIndentedBlock);
  return matches;
}
