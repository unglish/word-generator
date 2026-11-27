import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { loadSurfaceScorer } from "./reference.js";
import { duplicateRate } from "./guide.js";
import { median } from "./statistics.js";
const { trigram, membership } = await loadSurfaceScorer();
const lines = gunzipSync(readFileSync(process.argv[2])).toString().trimEnd().split("\n").slice(1).map(l => l.split(","));
const t: number[] = []; let rare = 0, realP = 0, realS = 0;
for (const [, , spelling, ph] of lines) {
  const p = ph.split(" "); const s = trigram.score(p);
  if (s.percentile !== null) t.push(s.percentile);
  if (membership.rarePairs(p).length) rare++;
  if (membership.isReferencePronunciation(p)) realP++;
  if (membership.isReferenceSpelling(spelling)) realS++;
}
console.log({ n: lines.length, vocab: trigram.vocabulary, triMedian: median(t), triBelow10: t.filter(x => x < 10).length / t.length, triN: t.length,
  rare: rare / lines.length, rareN: rare, realP: realP / lines.length, realPN: realP, realS: realS / lines.length, realSN: realS, ref: membership.referenceRarePairRate,
  dupPooledPhones: duplicateRate(lines.map(l => l[3])), dupPooledSpelling: duplicateRate(lines.map(l => l[2])) });
const bySeed = new Map<string, string[][]>(); for (const l of lines) { const g = bySeed.get(l[0]) ?? []; g.push(l); bySeed.set(l[0], g); }
const r = [...bySeed.values()].map(g => duplicateRate(g.map(l => l[3])).rate!);
console.log("per-seed phone dup mean", r.reduce((a, b) => a + b) / r.length, Math.min(...r), Math.max(...r));
