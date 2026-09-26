import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LENGTH_POLICY, LENGTH_UNITS, writeLengthArtifact, type LengthBuildOptions } from "../evaluation/corpus/length-builder.js";

export const LENGTH_USAGE = `Usage: node --import tsx scripts/build-cmu-baseline.ts --source PINNED_CMU --policy ${LENGTH_POLICY} --units ${LENGTH_UNITS} --out NEW_REFERENCE.json
Creates exact versioned length tables at a fresh path. Requires the pinned raw dictionary; no fallback or overwrite.
Use --help without other arguments to show this help.`;

export function parseLengthArgs(args: string[]): LengthBuildOptions | "help" {
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
  if (values.get("--policy") !== LENGTH_POLICY || values.get("--units") !== LENGTH_UNITS) throw new Error("Unsupported selection policy or event units.");
  return { source: resolve(values.get("--source")!), out: resolve(values.get("--out")!), policy: LENGTH_POLICY, units: LENGTH_UNITS };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseLengthArgs(process.argv.slice(2));
    if (options === "help") console.log(LENGTH_USAGE);
    else {
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
      const result = await writeLengthArtifact(root, options);
      console.log(JSON.stringify({ artifact: options.out, digest: result.digest,
        entries: result.artifact.population.accepted, units: result.artifact.units }));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(LENGTH_USAGE);
    process.exitCode = 1;
  }
}
