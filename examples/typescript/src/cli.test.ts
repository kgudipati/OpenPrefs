import { execFile, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const exampleRoot = fileURLToPath(new URL("..", import.meta.url));
const tsxCli = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));

describe("the TypeScript CLI", () => {
  it("applies a multi-preference request through confirmation into host state", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      [tsxCli, "src/cli.ts", "turn off marketing notifications and use dark mode"],
      {
        cwd: exampleRoot,
        env: { ...process.env, OPENAI_API_KEY: "" },
      },
    );

    expect(stdout).toContain("Resolved proposal:");
    expect(stdout).toContain("Confirmation prompt: Apply these preference changes?");
    expect(stdout).toContain('"status": "applied"');
    const finalState = stdout.slice(stdout.indexOf("Final state:"));
    expect(finalState).toContain('"theme": "dark"');
    expect(finalState).toContain('"marketingNotifications": false');
  });

  it("refuses to start the hosted demo without OPENAI_API_KEY", () => {
    const result = spawnSync(process.execPath, [tsxCli, "src/hostedCli.ts", "use dark mode"], {
      cwd: exampleRoot,
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("OPENAI_API_KEY is required for the hosted resolver demo.");
    expect(result.stdout).toBe("");
  });
});
