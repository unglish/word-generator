#!/usr/bin/env tsx
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TRANSITION_POLICY, TRANSITION_UNITS, writeTransitionArtifact, type TransitionBuildOptions } from "../evaluation/corpus/transition-builder.js";

export const TRANSITION_USAGE = `Usage: node --import tsx scripts/generate-bigram-table.ts --source PINNED_CMU --policy ${TRANSITION_POLICY} --units ${TRANSITION_UNITS} --out NEW_REFERENCE.json
Creates a versioned native/base phone-transition reference at a fresh path. No download, fallback, runtime-table export, or overwrite.
Use --help without other arguments to show this help.`;

export function parseTransitionArgs(args: string[]): TransitionBuildOptions | "help" {
  if (args.length === 1 && args[0] === "--help") return "help";
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!["--source", "--policy", "--units", "--out"].includes(flag) || values.has(flag) || !value || value.startsWith("--")) {
      throw new Error(`Invalid, repeated, or valueless argument: ${flag}`);
    }
    values.set(flag, value);
  }
  if (values.size !== 4) throw new Error("All four source, policy, units, and output arguments are required.");
  if (values.get("--policy") !== TRANSITION_POLICY || values.get("--units") !== TRANSITION_UNITS) throw new Error("Unsupported selection policy or event units.");
  return { source: resolve(values.get("--source")!), out: resolve(values.get("--out")!), policy: TRANSITION_POLICY, units: TRANSITION_UNITS };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseTransitionArgs(process.argv.slice(2));
    if (options === "help") console.log(TRANSITION_USAGE);
    else {
      const result = await writeTransitionArtifact(resolve(dirname(fileURLToPath(import.meta.url)), ".."), options);
      console.log(JSON.stringify({ artifact: options.out, digest: result.digest,
        entries: result.artifact.population.accepted, transitions: result.artifact.transitions.base.total, units: result.artifact.units }));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(TRANSITION_USAGE);
    process.exitCode = 1;
  }
}
