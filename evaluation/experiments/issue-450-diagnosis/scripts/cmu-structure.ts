/**
 * CMU monosyllable onset/coda shape via #304 syllabify (not a new aligner).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseCmuRecords, selectCompatibleCmu } from "../../evaluation/corpus/cmu.js";
import { buildReference, syllabify, CMU_SHA256 } from "../../evaluation/review/wordlikeness/model.js";

const OUT_DIR = "/tmp/issue-450-diagnosis/packets";
mkdirSync(OUT_DIR, { recursive: true });
const text = readFileSync("/tmp/wordlikeness-cmudict.dict", "utf8");
const sha = createHash("sha256").update(text, "utf8").digest("hex");
if (sha !== CMU_SHA256) throw new Error("SHA mismatch");

const { entries } = selectCompatibleCmu(parseCmuRecords(text));
const model = buildReference(text);
const onsets = new Set(model.initial_onsets);

type Hist = Record<string, number>;
const add = (h: Hist, k: string | number) => {
  h[String(k)] = (h[String(k)] ?? 0) + 1;
};
const pct = (h: Hist) => {
  const n = Object.values(h).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, (100 * v) / n]));
};

const mono = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 1);
const onsetLen: Hist = {};
const codaLen: Hist = {};
const shapes: Hist = {};
let failed = 0;

for (const e of mono) {
  try {
    const syls = syllabify(e.tokens, onsets);
    if (syls.length !== 1) {
      failed++;
      continue;
    }
    const s = syls[0];
    add(onsetLen, s.onset.length);
    add(codaLen, s.coda.length);
    add(shapes, `${s.onset.length}-1-${s.coda.length}`);
  } catch {
    failed++;
  }
}

const packet = {
  method: "evaluation/review/wordlikeness/model.syllabify with #304 initial_onsets; monos by stress-vowel count",
  n: mono.length,
  failed,
  onsetLen,
  codaLen,
  shapes,
  onsetLenPct: pct(onsetLen),
  codaLenPct: pct(codaLen),
  topShapes: Object.entries(shapes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => ({ shape: k, n: v, pct: (100 * v) / (mono.length - failed) })),
};
writeFileSync(`${OUT_DIR}/cmu-structure-mono.json`, JSON.stringify(packet, null, 2));
console.log(JSON.stringify({ n: packet.n, failed, onsetLenPct: packet.onsetLenPct, codaLenPct: packet.codaLenPct, topShapes: packet.topShapes.slice(0, 8) }, null, 2));
