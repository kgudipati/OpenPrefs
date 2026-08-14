import { createOpenPrefs, type OpenPrefsResult, type PreferencesResolver } from "openprefs";
import { settingsAdapter } from "./adapter.js";
import { keywordResolver } from "./keywordResolver.js";
import { createOpenAIResolver } from "./llmResolver.js";
import { preferences } from "./manifest.js";
import { settingsStore } from "./settings.js";

function selectedResolver(): { readonly name: string; readonly resolver: PreferencesResolver } {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey !== undefined && apiKey.length > 0) {
    return {
      name: `OpenAI Responses API (${process.env.OPENPREFS_MODEL ?? "gpt-5.6"})`,
      resolver: createOpenAIResolver({
        apiKey,
        ...(process.env.OPENPREFS_MODEL === undefined
          ? {}
          : { model: process.env.OPENPREFS_MODEL }),
      }),
    };
  }
  return { name: "deterministic keyword resolver", resolver: keywordResolver };
}

function printJson(label: string, value: unknown): void {
  console.log(`${label}:`);
  console.log(JSON.stringify(value, null, 2));
}

async function confirmIfRequired(
  openPrefs: ReturnType<typeof createOpenPrefs>,
  result: OpenPrefsResult,
): Promise<OpenPrefsResult> {
  if (result.status !== "confirmation_required") {
    return result;
  }

  printJson("Resolved proposal", result.proposal);
  console.log("Confirmation prompt: Apply these preference changes?");
  for (const change of result.preview ?? []) {
    console.log(`  ${change.id}: ${String(change.before)} -> ${String(change.after)}`);
  }
  console.log("  Non-interactive demo response: yes");
  return openPrefs.confirm(result.proposal);
}

async function main(): Promise<void> {
  const text = process.argv.slice(2).join(" ").trim();
  if (text.length === 0) {
    console.error('Usage: npm run demo -- "turn off marketing notifications and use dark mode"');
    process.exitCode = 1;
    return;
  }

  const selected = selectedResolver();
  const openPrefs = createOpenPrefs({
    preferences,
    adapter: settingsAdapter,
    resolver: selected.resolver,
  });

  console.log(`Resolver: ${selected.name}`);
  console.log(`Request: ${text}`);
  const firstResult = await openPrefs.request(text);
  const finalResult = await confirmIfRequired(openPrefs, firstResult);
  if (firstResult.status !== "confirmation_required") {
    printJson("OpenPrefs result", firstResult);
  }
  printJson("Final result", finalResult);
  printJson("Final state", settingsStore.getState());
}

await main();
