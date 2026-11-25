import { generateWords } from "../../../../src/index.ts";
import { ipaToArpabet } from "../../../../src/phonotactic/ipa-to-arpabet.ts";
import { writeFileSync } from "node:fs";
const out: string[] = [];
const a = (ps: any[]) => ps.map(p => ipaToArpabet(p.sound) ?? "?" + p.sound).join(" ");
for (let seed = 201; seed <= 246; seed++) {
  const n = seed === 246 ? 904 : 1000;
  const ws = generateWords(n, { seed, mode: "lexicon", morphology: true, trace: true });
  ws.forEach((w, i) => {
    const t = w.trace!;
    out.push(JSON.stringify({
      seed, draw: i, spelling: w.written.clean,
      syl: w.syllables.map(s => [a(s.onset), a(s.nucleus), a(s.coda), s.stress ?? ""]),
      rootStart: w.lexical?.rootSyllableStart, rootLen: w.lexical?.root.length, lexLen: w.lexical?.syllables.length,
      template: t.morphology?.template, prefix: t.morphology?.prefix, suffix: t.morphology?.suffix,
      repairs: t.repairs.map(r => r.rule), structural: t.structural.map((s: any) => s.event), attempts: t.attempts,
    }));
  });
}
writeFileSync(process.argv[2], out.join("\n") + "\n");
