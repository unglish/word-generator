// usage: tsx dump.mts <checkout> <out.jsonl> [N] [seed0] [optsJSON]
import { createWriteStream } from "node:fs";
const [co, outp, Ns, s0s, optsS] = process.argv.slice(2);
const { generateWord } = await import(`${co}/src/index.ts`);
const out = createWriteStream(outp);
const N = Number(Ns ?? 20000), s0 = Number(s0s ?? 2_000_000);
const opts = optsS ? JSON.parse(optsS) : {};
let mismatch = 0;
for (let i = 0; i < N; i++) {
  const seed = s0 + i;
  const w: any = generateWord({ seed, trace: true, ...opts });
  if (i < 500) { const u: any = generateWord({ seed, ...opts }); if (u.written.clean !== w.written.clean) mismatch++; }
  const t = w.trace;
  const parts = t.morphology?.realization?.emittedParts ?? t.morphology?.realization?.assembledParts;
  out.write(JSON.stringify({
    seed, w: w.written.clean, ipa: w.pronunciation,
    syl: w.syllables.map((s: any) => ({ o: s.onset.map((p: any) => p.sound), n: s.nucleus.map((p: any) => p.sound), c: s.coda.map((p: any) => p.sound) })),
    G: t.graphemeSelections.map((g: any) => ({ i: g.index, p: g.phoneme, pos: g.position, si: g.syllableIndex, em: g.emitted, r: g.respelled?.form, fb: g.selection?.fallback })),
    rep: t.repairs.map((r: any) => ({ rule: r.rule, d: r.detail, b: r.before, a: r.after })),
    suf: parts?.find((p: any) => p.role === "suffix")?.text,
    orth: t.orthography ? { s: t.orthography.surface, u: t.orthography.graphemeUnits.map((u: any) => [u.graphemeSelectionIndex, u.start, u.end, u.present]) } : null,
  }) + "\n");
}
out.end(); console.error("traced!=untraced in first 500:", mismatch);
