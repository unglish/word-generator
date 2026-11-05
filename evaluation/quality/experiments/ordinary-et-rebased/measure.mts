// Usage: node --import tsx probe.ts <repoRoot> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [root, out] = process.argv.slice(2);
const api = await import(join(root, "src/index.ts"));
const protocol = JSON.parse(readFileSync(join(root, "evaluation/quality/protocol.json"), "utf8"));
const N = Number(process.env.N ?? 10000);
type C = Record<string, number>;
const inc = (c: C, k: string, n = 1) => { c[k] = (c[k] ?? 0) + n; };
const result = {};
for (const profile of protocol.profiles) {
  const counts: C = {}; const examples: Record<string, unknown[]> = {};
  const ex = (k: string, v: unknown) => { (examples[k] ??= []).length < 8 && examples[k].push(v); };
  for (const seed of profile.seeds.development) {
    const rand = api.createSeededRng(seed);
    for (let draw = 0; draw < N; draw++) {
      const w = api.generateWord({ ...profile.options, rand, trace: true });
      const clean: string = w.written.clean;
      inc(counts, "words");
      if (/eat$/.test(clean)) inc(counts, "rawFinal:eat");
      const sel = w.trace.graphemeSelections;
      for (let i = 0; i + 1 < sel.length; i++) {
        if (sel[i].phoneme !== "ɛ" || sel[i + 1].phoneme !== "t") continue;
        const ctx = sel[i].syllableIndex === sel[i + 1].syllableIndex ? "same-syllable" : "cross-syllable";
        inc(counts, `ɛt:${ctx}:${sel[i].selected}`);
        inc(counts, `ɛt:${ctx}:total`);
        if (sel[i].selection?.fallback) inc(counts, `ɛt:fallback:${sel[i].selected}`);
        if (sel[i].afterCondition.includes("e")) inc(counts, `ɛt:eAvailable`);
        ex(`ɛt:${ctx}:${sel[i].selected}`, { profile: profile.id, seed, draw, clean, pron: w.pronunciation });
      }
      // magic-e rule: roles of the matched letters from the base-spelling ledger.
      const bs = w.trace.baseSpelling;
      for (const e of bs?.edits ?? []) {
        if (e.rule !== "spellingRule:magic-e") continue;
        inc(counts, "magicE:fired");
        const seg = (cell: any) => cell.origin.kind === "selection"
          ? bs.phones[bs.units[cell.origin.unitId].phoneIds[0]].segment : "rewrite";
        const roles = e.input.map(seg);
        const key = roles.join("+");
        inc(counts, `magicE:roles:${key}`);
        const ok = roles[0] === "nucleus" && roles[1] === "nucleus";
        if (!ok) {
          const next = sel.find((s: any) => s.index === bs.units[e.input[2].origin.unitId]?.phoneIds[0]);
          inc(counts, "magicE:misfire");
          inc(counts, `magicE:misfire:${e.before[0]}:${key}`);
          if (e.before[0] === "y" && next?.phoneme === "t") inc(counts, "magicE:misfire:yet");
          ex(`magicE:misfire:${key}`, { profile: profile.id, seed, draw, clean, pron: w.pronunciation, before: e.before, after: e.after });
        } else ex("magicE:legit", { clean, pron: w.pronunciation, before: e.before, after: e.after });
      }
    }
  }
  result[profile.id] = { counts, examples };
}
writeFileSync(out, JSON.stringify(result, null, 1));
for (const [id, r] of Object.entries(result)) console.log(id, JSON.stringify(Object.fromEntries(Object.entries(r.counts).sort())));
