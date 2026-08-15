import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["evals/cli.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: ".evals-dist",
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
});
