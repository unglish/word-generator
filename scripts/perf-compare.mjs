#!/usr/bin/env node
/**
 * Paired performance gate: times a base checkout and a head checkout back to
 * back on the same machine and fails when head is slower by more than a
 * relative threshold.
 *
 * A fixed words/sec floor cannot work on shared CI runners: the same commit
 * measures anywhere from ~2,600 to ~7,700 words/sec depending on which host
 * the job lands on. Pairing cancels the host out. Rounds alternate the order
 * (base-head, head-base, ...) so drift within the job (thermal, noisy
 * neighbours) hits both sides equally, and the gate uses the median of the
 * per-round head/base ratios, which one disturbed round cannot move.
 *
 * Usage:
 *   node scripts/perf-compare.mjs --base <dir> [--head .] [--rounds 10]
 *     [--words 5000] [--passes 3] [--max-slowdown 0.10]
 *
 * Both directories must be checkouts of this repository with `src/index.ts`.
 * The base checkout can reuse head's node_modules (symlink it).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = path.dirname(fileURLToPath(import.meta.url));
const sampleScript = path.join(here, "perf-sample.ts");

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    head: { type: "string", default: "." },
    rounds: { type: "string", default: "10" },
    words: { type: "string", default: "5000" },
    passes: { type: "string", default: "3" },
    "max-slowdown": { type: "string", default: "0.10" },
  },
});

if (!values.base) {
  console.error("perf-compare: --base <dir> is required");
  process.exit(2);
}

const rounds = Number(values.rounds);
const maxSlowdown = Number(values["max-slowdown"]);

function sample(dir) {
  const out = execFileSync(
    process.execPath,
    ["--import", "tsx", sampleScript, dir, values.words, values.passes],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return JSON.parse(out.trim().split("\n").at(-1));
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const wordsPerSec = ({ ms, words }) => Math.round((words / ms) * 1000);

const ratios = [];
console.log(`round  order      base w/s   head w/s   head/base time`);
for (let round = 0; round < rounds; round++) {
  const baseFirst = round % 2 === 0;
  const first = sample(baseFirst ? values.base : values.head);
  const second = sample(baseFirst ? values.head : values.base);
  const base = baseFirst ? first : second;
  const head = baseFirst ? second : first;
  const ratio = head.ms / base.ms;
  ratios.push(ratio);
  console.log(
    `${String(round + 1).padStart(5)}  ${baseFirst ? "base-head" : "head-base"}  ` +
      `${String(wordsPerSec(base)).padStart(8)}   ${String(wordsPerSec(head)).padStart(8)}   ${ratio.toFixed(3)}`,
  );
}

const med = median(ratios);
const slowdown = med - 1;
const verdict = slowdown > maxSlowdown ? "FAIL" : "pass";
console.log(
  `\nmedian head/base time ${med.toFixed(3)} (${slowdown >= 0 ? "+" : ""}${(slowdown * 100).toFixed(1)}%), ` +
    `range ${Math.min(...ratios).toFixed(3)}-${Math.max(...ratios).toFixed(3)}; ` +
    `limit +${(maxSlowdown * 100).toFixed(0)}% -> ${verdict}`,
);

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Paired perf gate: ${verdict}\n\nMedian head/base time **${med.toFixed(3)}** ` +
      `(limit ${(1 + maxSlowdown).toFixed(2)}) over ${rounds} alternating rounds; ` +
      `range ${Math.min(...ratios).toFixed(3)}-${Math.max(...ratios).toFixed(3)}.\n`,
  );
}

process.exit(verdict === "FAIL" ? 1 : 0);
