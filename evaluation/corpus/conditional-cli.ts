import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeConditionalExperiment } from "./conditional-builder.js";

export function parseConditionalArguments(args: readonly string[], cwd: string): { help: true } | { help: false; source: string; out: string } {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!["--source", "--out"].includes(flag) || values.has(flag) || !value || value.startsWith("--")) {
      throw new Error("Provide exactly --source PATH and --out NEW_PATH; unknown, repeated and incomplete arguments fail.");
    }
    values.set(flag, value);
  }
  if (values.size !== 2) throw new Error("Both --source and --out are required.");
  return { help: false, source: resolve(cwd, values.get("--source")!), out: resolve(cwd, values.get("--out")!) };
}
async function main(): Promise<void> {
  const options = parseConditionalArguments(process.argv.slice(2), process.cwd());
  if (options.help) {
    console.log("Usage: node --import tsx evaluation/corpus/conditional-cli.ts --source PINNED_CMUDICT --out FRESH_ARTIFACT.json\nUses the committed Q17 registration, training-only inference, development-only smoothing selection and matched held-out evaluation. No runtime generator or historical scorer changes.");
    return;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const envelope = await writeConditionalExperiment(root, options.source, options.out);
  console.log(JSON.stringify({ digest: envelope.digest, out: options.out }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
