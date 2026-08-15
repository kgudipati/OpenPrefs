import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "openprefs-skill-package-"));

const documents = [
  "skills/openprefs-integrate/SKILL.md",
  "skills/openprefs-integrate/references/adapter-patterns.md",
  "skills/openprefs-integrate/references/classification-guide.md",
  "skills/openprefs-integrate/references/description-guide.md",
];

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

  await writeFile(join(installDirectory, "package.json"), '{"private":true}\n');
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(packDirectory, tarballs[0])],
    { cwd: installDirectory, stdio: "pipe" },
  );

  const installedPackage = join(installDirectory, "node_modules", "openprefs");
  const dangling = [];

  for (const document of documents) {
    const documentPath = join(installedPackage, document);
    const contents = await readFile(documentPath, "utf8");
    const links = contents.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g);

    for (const match of links) {
      const target = match[1];
      if (/^(?:[a-z]+:|#)/i.test(target)) continue;

      const pathWithoutFragment = decodeURIComponent(target.split("#", 1)[0]);
      const resolvedTarget = resolve(dirname(documentPath), pathWithoutFragment);
      try {
        await access(resolvedTarget);
      } catch {
        dangling.push(`${document} -> ${target}`);
      }
    }
  }

  if (dangling.length > 0) {
    throw new Error(`Dangling packaged skill references:\n${dangling.join("\n")}`);
  }

  console.log(`Verified ${documents.length} skill documents from a fresh tarball install.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
