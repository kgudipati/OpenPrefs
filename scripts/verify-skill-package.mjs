import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findLegacySuccessExamples } from "./markdown-code-blocks.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageMetadata = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const packageLock = JSON.parse(await readFile(join(repositoryRoot, "package-lock.json"), "utf8"));
const changelog = await readFile(join(repositoryRoot, "CHANGELOG.md"), "utf8");
const releaseMatch = changelog.match(/^## \[([^\]]+)\] - \d{4}-\d{2}-\d{2}$/m);

if (releaseMatch === null) {
  throw new Error("CHANGELOG.md must contain a dated release heading.");
}

const expectedVersion = releaseMatch[1];
const actualVersions = [
  ["package.json", packageMetadata.version],
  ["package-lock.json", packageLock.version],
  ['package-lock.json packages[""].version', packageLock.packages?.[""]?.version],
];

for (const [source, actualVersion] of actualVersions) {
  if (actualVersion !== expectedVersion) {
    throw new Error(
      `${source} version '${actualVersion}' does not match expected release version '${expectedVersion}' from CHANGELOG.md.`,
    );
  }
}

const expectedTarballName = `${packageMetadata.name}-${expectedVersion}.tgz`;
const temporaryRoot = await mkdtemp(join(tmpdir(), "openprefs-skill-package-"));

const documentPaths = [
  "README.md",
  "docs/architecture.md",
  "skills/openprefs-integrate/SKILL.md",
  "skills/openprefs-integrate/eval.md",
  "skills/openprefs-integrate/references/adapter-patterns.md",
  "skills/openprefs-integrate/references/classification-guide.md",
  "skills/openprefs-integrate/references/description-guide.md",
];

async function findMarkdownDocuments(root) {
  const documents = [];

  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      documents.push(...(await findMarkdownDocuments(path)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      documents.push(path);
    }
  }

  return documents;
}

async function findForbiddenDocumentExamples(packageRoot) {
  const matches = [];

  for (const documentPath of await findMarkdownDocuments(packageRoot)) {
    const contents = await readFile(documentPath, "utf8");
    for (const example of findLegacySuccessExamples(contents)) {
      matches.push(
        `${relative(packageRoot, documentPath)}:${example.line} contains legacy success syntax in a Markdown code block`,
      );
    }
  }

  return matches;
}

async function findDanglingLinks(packageRoot, layout) {
  const dangling = [];

  for (const documentPath of documentPaths) {
    const absoluteDocumentPath = join(packageRoot, documentPath);
    const contents = await readFile(absoluteDocumentPath, "utf8");
    const links = contents.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g);

    for (const match of links) {
      const target = match[1];
      if (/^(?:[a-z]+:|#)/i.test(target)) continue;

      const pathWithoutFragment = decodeURIComponent(target.split("#", 1)[0]);
      const resolvedTarget = resolve(dirname(absoluteDocumentPath), pathWithoutFragment);
      try {
        await access(resolvedTarget);
      } catch {
        dangling.push(`${layout}: ${documentPath} -> ${target}`);
      }
    }
  }

  return dangling;
}

try {
  const packDirectory = join(temporaryRoot, "pack");
  const installDirectory = join(temporaryRoot, "install");
  await mkdir(packDirectory);
  await mkdir(installDirectory);

  execFileSync("npm", ["pack", "--ignore-scripts", "--pack-destination", packDirectory], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });

  const tarballs = (await readdir(packDirectory)).filter((entry) => entry.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one packed tarball, found ${tarballs.length}.`);
  }
  if (tarballs[0] !== expectedTarballName) {
    throw new Error(
      `Packed tarball '${tarballs[0]}' does not match expected filename '${expectedTarballName}'.`,
    );
  }

  await writeFile(join(installDirectory, "package.json"), '{"private":true}\n');
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(packDirectory, tarballs[0])],
    { cwd: installDirectory, stdio: "pipe" },
  );

  const installedPackage = join(installDirectory, "node_modules", "openprefs");
  const forbiddenDocumentMatches = await findForbiddenDocumentExamples(installedPackage);
  if (forbiddenDocumentMatches.length > 0) {
    throw new Error(
      `Forbidden code examples found in shipped documents:\n${forbiddenDocumentMatches.join("\n")}`,
    );
  }

  const dangling = [
    ...(await findDanglingLinks(repositoryRoot, "repository checkout")),
    ...(await findDanglingLinks(installedPackage, "fresh tarball install")),
  ];

  if (dangling.length > 0) {
    throw new Error(`Dangling packaged document references:\n${dangling.join("\n")}`);
  }

  console.log(
    `Verified ${documentPaths.length} packaged documents in the repository checkout and a fresh tarball install.`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
