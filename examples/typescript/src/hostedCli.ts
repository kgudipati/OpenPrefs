const apiKey = process.env.OPENAI_API_KEY;

if (apiKey === undefined || apiKey.length === 0) {
  console.error("OPENAI_API_KEY is required for the hosted resolver demo.");
  process.exitCode = 1;
} else {
  await import("./cli.js");
}
