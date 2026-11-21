// usage: node --import tsx count.ts <src/index.ts path> <out.jsonl> [N] [firstSeed] [optsJSON]
import { createWriteStream } from "node:fs";
import { analyze, finalTail, isIcAc, isSoftLetter, finalBucket } from "./analyze.mts";

const [, , srcPath, outPath, nArg, seedArg, optsArg] = process.argv;
const { generateWord } = await import(srcPath);
const N = Number(nArg ?? 20000);
const first = Number(seedArg ?? 2_000_000);
const opts = optsArg ? JSON.parse(optsArg) : {};
const out = createWriteStream(outPath);
const tally = new Map<string, number>();
const ex = new Map<string, string[]>();
const bump = (k: string, w: string) => {
  tally.set(k, (tally.get(k) ?? 0) + 1);
  const e = ex.get(k) ?? [];
  if (e.length < 6) e.push(w);
  ex.set(k, e);
};
let skipped = 0;
for (let i = 0; i < N; i++) {
  const seed = first + i;
  const w: any = generateWord({ seed, trace: true, ...opts });
  const { occ, skipped: sk } = analyze(w);
  if (sk) skipped++;
  const t = w.trace;
  const tags = new Set<string>();
  for (const o of occ) {
    if (o.sound === "s") {
      if (isSoftLetter(o.next)) tags.add("soft-c /s/ before e/i/y");
      continue;
    }
    if (isSoftLetter(o.next)) {
      tags.add("460 any /k/ c before e/i/y");
      if (o.where === "root-internal") {
        tags.add("460 root-internal");
        tags.add("460 root-internal next=" + (o.nextRule ? o.nextRule : o.nextOwner) + ">" + o.next);
      } else if (o.where === "root-final+suffix") {
        tags.add("460 root-final + suffix");
        tags.add("460 root-final + -" + o.suffix);
      } else tags.add("460 " + o.where);
    }
    if (finalTail(o)) {
      if (isIcAc(o)) tags.add("469 kept -ic/-ac" + (o.rest ? "+" + o.rest : ""));
      else {
        tags.add("469 total (final c / cs outside -ic/-ac)");
        tags.add("469 " + finalBucket(o));
        if (o.rest.startsWith("se")) tags.add("469 c+s+e");
        if (o.rest === "") tags.add("469 bare word-final c");
      }
    }
    if (o.rest === "" ) tags.add("word-final c (all)");
  }
  for (const k of tags) bump(k, w.written.clean);
  out.write(JSON.stringify({
    seed, w: w.written.clean, ipa: w.pronunciation, tags: [...tags],
    occ: occ.filter((o) => o.sound === "k").map((o) => `${o.where}:${o.prev2}${o.prev}c${o.rest.slice(0, 3)}`),
    G: t.graphemeSelections.map((g: any) => `${g.phoneme}>${g.emitted}`).join(" "),
    rep: t.repairs.map((r: any) => r.rule),
    edits: t.baseSpelling?.edits?.map((e: any) => e.rule) ?? [],
    m: t.morphology?.template, sfx: t.morphology?.suffix,
    root: t.morphology?.realization?.assembledParts?.find((p: any) => p.role === "root")?.text,
    base: t.baseSpelling?.surface,
  }) + "\n");
}
out.end();
console.log("N", N, "first", first, "opts", JSON.stringify(opts), "skipped", skipped);
for (const [k, v] of [...tally].sort((a, b) => a[0].localeCompare(b[0]))) console.log(k.padEnd(60), String(v).padStart(6), " ", ex.get(k)!.join(" "));
