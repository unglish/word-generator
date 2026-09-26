#!/usr/bin/env tsx
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFreeze, type Inputs } from "./model-sensitivity-integrity.js";
import { runSensitivity, type StudyOptions } from "./model-sensitivity-runner.js";
export const USAGE = `Usage: node --import tsx evaluation/corpus/model-sensitivity-cli.ts freeze --source PINNED_CMU --archive ORIGINAL_DEVELOPMENT --identity PINNED_IDENTITY_TS --identity-report PINNED_REPORT_JSON --out NEW_FREEZE.json
  or: node --import tsx evaluation/corpus/model-sensitivity-cli.ts score --freeze REVIEWED_FREEZE.json --freeze-sha256 EXTERNAL_SHA --out FRESH_DIRECTORY
No download, generator call, sealed validation or adoption. Full score mode requires prior source review. --help must be used alone.`;
export function parseArgs(args: string[]): "help" | { mode: "freeze"; inputs: Inputs; out: string } | { mode: "score"; options: StudyOptions } {
  if (args.length === 1 && args[0] === "--help") return "help";
  const [mode, ...rest] = args;
  const allowed = mode === "freeze" ? ["--source", "--archive", "--identity", "--identity-report", "--out"]
    : mode === "score" ? ["--freeze", "--freeze-sha256", "--out"] : [];
  if (!allowed.length) throw new Error("Choose explicit freeze or score mode.");
  const flags = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index], value = rest[index + 1];
    if (!allowed.includes(key) || flags.has(key) || !value || value.startsWith("--")) throw new Error("Unknown, repeated or valueless argument.");
    flags.set(key, value);
  }
  if (flags.size !== allowed.length) throw new Error("Every input and fresh output argument is required.");
  const path = (key: string): string => resolve(flags.get(key)!);
  if (mode === "freeze") return { mode, out: path("--out"), inputs: { source: path("--source"), archive: path("--archive"), identity: path("--identity"), identityReport: path("--identity-report") } };
  if (!/^[a-f0-9]{64}$/.test(flags.get("--freeze-sha256")!)) throw new Error("Expected an externally reviewed SHA-256.");
  return { mode: "score", options: { freeze: path("--freeze"), freezeSha256: flags.get("--freeze-sha256")!, out: path("--out") } };
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args === "help") console.log(USAGE);
    else if (args.mode === "freeze") await writeFreeze(resolve(dirname(fileURLToPath(import.meta.url)), "../.."), args.inputs, args.out);
    else await runSensitivity(args.options);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); console.error(USAGE); process.exitCode = 1; }
}
