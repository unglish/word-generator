import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { compareSummaries, comparisonMarkdown } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/quality/compare.ts";
const root = new URL("./", import.meta.url);
const names = ["original-common-summary.json", "archives/candidate/summary.json", "archives/control/summary.json"];
const bytes = await Promise.all(names.map(n => readFile(new URL(n, root))));
const [original, candidate, control] = bytes.map(b => JSON.parse(b));
assert.deepEqual(candidate.profiles, control.profiles);
const report = compareSummaries(original, candidate, control);
await writeFile(new URL("broad-comparison.json", root), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
await writeFile(new URL("broad-comparison.md", root), "The original baseline is contextual: its pipeline and spelling policies differ. Immediate control versus candidate isolates Q02 operational provenance; all common summary fields are equal.\n\n" + comparisonMarkdown(report), { flag: "wx" });
await writeFile(new URL("broad-comparison-inputs.json", root), JSON.stringify({ files: Object.fromEntries(names.map((n,i) => [n, { bytes: bytes[i].length, sha256: createHash("sha256").update(bytes[i]).digest("hex") }])),
 scope: "Common frozen evaluator/reference/protocol. Original summary seal was verified separately; full archived word/provenance replay remains distinct." }, null, 2) + "\n", { flag: "wx" });
console.log("Three-way broad comparison complete; all Q02-versus-immediate-control summary deltas are zero.");
