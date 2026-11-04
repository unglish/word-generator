#!/usr/bin/env tsx
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGACY_SCORER } from "../evaluation/corpus/score-reference.js";
import { SCORE_POLICY, SCORE_PROJECTION, writeScoreArtifact, type ScoreBuildOptions } from "../evaluation/corpus/score-reference-builder.js";

export const SCORE_USAGE = `Usage: node --import tsx scripts/generate-baseline.ts --source PINNED_CMU --policy ${SCORE_POLICY} --projection ${SCORE_PROJECTION} --scorer ${LEGACY_SCORER.id} --out NEW_REFERENCE.json
Creates a separate score reference under the pinned historical scorer/table. No download, active-baseline overwrite, generated gap or new transition-table input.
Use --help alone to show this help.`;
export function parseScoreArgs(args: string[]): ScoreBuildOptions | "help" {
  if (args.length === 1 && args[0] === "--help") return "help";
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!["--source", "--policy", "--projection", "--scorer", "--out"].includes(flag) || values.has(flag) || !value || value.startsWith("--")) {
      throw new Error(`Invalid, repeated, or valueless argument: ${flag}`);
    }
    values.set(flag, value);
  }
  if (values.size !== 5) throw new Error("All five source, policy, projection, scorer and output arguments are required.");
  if (values.get("--policy") !== SCORE_POLICY || values.get("--projection") !== SCORE_PROJECTION || values.get("--scorer") !== LEGACY_SCORER.id) {
    throw new Error("Unsupported population, projection or scorer profile.");
  }
  return { source: resolve(values.get("--source")!), out: resolve(values.get("--out")!), policy: SCORE_POLICY, projection: SCORE_PROJECTION, scorer: LEGACY_SCORER.id };
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseScoreArgs(process.argv.slice(2));
    if (options === "help") console.log(SCORE_USAGE);
    else {
      const result = await writeScoreArtifact(resolve(dirname(fileURLToPath(import.meta.url)), ".."), options);
      console.log(JSON.stringify({ artifact: options.out, digest: result.digest, entries: result.artifact.scores.accounting.scored,
        scorer: LEGACY_SCORER.id, projection: SCORE_PROJECTION }));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error)); console.error(SCORE_USAGE); process.exitCode = 1;
  }
}
