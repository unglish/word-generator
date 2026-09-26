import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PHONEME_POLICY, PHONEME_UNITS, writePhonemeArtifact, type PhonemeBuildOptions } from "./phoneme-builder.js";

export const PHONEME_USAGE = `Usage: node scripts/build-cmu-phoneme-baseline.mjs --source PINNED_CMU --policy ${PHONEME_POLICY} --units ${PHONEME_UNITS} --out NEW_REFERENCE.json
Creates a new versioned reference. Requires the pinned raw dictionary; no fallback or overwrite.
Use --help without other arguments to show this help.`;

export function parsePhonemeArgs(args: string[]): PhonemeBuildOptions | "help" {
  if (args.length === 1 && args[0] === "--help") return "help";
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1];
    if (!["--source", "--policy", "--units", "--out"].includes(flag) || values.has(flag) || !value || value.startsWith("--")) {
      throw new Error(`Invalid, repeated, or valueless argument: ${flag}`);
    }
    values.set(flag, value);
  }
  if (values.size !== 4) throw new Error("All four source, policy, units, and output arguments are required.");
  if (values.get("--policy") !== PHONEME_POLICY || values.get("--units") !== PHONEME_UNITS) throw new Error("Unsupported selection policy or event units.");
  return { source: resolve(values.get("--source")!), out: resolve(values.get("--out")!), policy: PHONEME_POLICY, units: PHONEME_UNITS };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parsePhonemeArgs(process.argv.slice(2));
    if (options === "help") console.log(PHONEME_USAGE);
    else {
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
      const result = await writePhonemeArtifact(root, options);
      console.log(JSON.stringify({ artifact: options.out, digest: result.digest,
        entries: result.artifact.population.accepted, phoneEvents: result.artifact.phones.native.total }));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(PHONEME_USAGE);
    process.exitCode = 1;
  }
}
