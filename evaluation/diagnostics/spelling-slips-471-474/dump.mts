// usage: tsx dump.ts <src/index.ts abs path> <out.jsonl> [N=20000] [firstSeed=2000000] [optsJSON]
import { createWriteStream } from "node:fs";
const [src, outPath, nArg, seedArg, optsArg] = process.argv.slice(2);
const { generateWord } = await import(src);
const out = createWriteStream(outPath);
const N = Number(nArg ?? 20000);
const first = Number(seedArg ?? 2_000_000);
const opts = optsArg ? JSON.parse(optsArg) : {};
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const seed = first + i;
  const w: any = generateWord({ ...opts, seed, trace: true }); const t = w.trace;
  out.write(JSON.stringify({
    seed, w: w.written.clean, ipa: w.pronunciation,
    syl: w.syllables.map((s: any) => ({ o: s.onset.map((p: any) => p.sound), n: s.nucleus.map((p: any) => p.sound), c: s.coda.map((p: any) => p.sound) })),
    G: t.graphemeSelections.map((g: any) => ({ i: g.index, p: g.phoneme, pos: g.position, si: g.syllableIndex, sel: g.selected, em: g.emitted, d: g.doubled, sp: g.selection?.syllablePosition })),
    rep: t.repairs.map((r: any) => ({ rule: r.rule, b: r.before, a: r.after, d: r.detail })),
    sr: (t.stages.find((s: any) => s.name === "generateWrittenForm")?.after) ?? null,
    m: t.morphology ? { tpl: t.morphology.template, pre: t.morphology.prefix, suf: t.morphology.suffix, bt: t.morphology.boundaryTransforms ?? t.morphology.transforms } : null,
  }) + "\n");
}
out.end(); console.error("ms", Date.now() - t0);
