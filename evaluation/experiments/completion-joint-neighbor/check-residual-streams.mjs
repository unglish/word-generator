import { readFileSync, writeFileSync } from "node:fs";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.ts";
const baseline = JSON.parse(readFileSync(new URL("baseline-residuals.json", import.meta.url)));
const splitVowels = JSON.parse(readFileSync(new URL("../completion-isolated-u/configuration.json", import.meta.url)));
const generator = createGenerator({ ...englishConfig, splitVowels });
const streams = [];
for (const witness of baseline.allAffectedTraceWitnesses) {
  const rand = createSeededRng(witness.seed);
  const jointAttempts = [];
  let last;
  for (let drawIndex = 0; drawIndex <= witness.drawIndex; drawIndex++) {
    const word = generator.generateWord({ mode: "lexicon", morphology: false, rand, trace: true });
    const ledger = word.trace.baseSpelling;
    for (const { attempt, certificateId } of ledger.completion.attempts) {
      if (attempt.status === "evaluated" && attempt.joint) jointAttempts.push({ drawIndex,
        written: word.written.clean, attempt, certificateId,
        certificate: certificateId === null ? null : ledger.completion.certificates[certificateId] });
    }
    last = { written: word.written.clean, phones: ledger.phones.map(phone => phone.soundAtSpelling) };
  }
  streams.push({ seed: witness.seed, draws: witness.drawIndex + 1, baseline: witness.written.clean, last, jointAttempts });
  console.log(JSON.stringify({ seed: witness.seed, draws: witness.drawIndex + 1, last, jointAttempts: jointAttempts.length,
    selected: jointAttempts.filter(entry => entry.certificateId !== null).length }));
}
writeFileSync(new URL("residual-stream-check.json", import.meta.url), JSON.stringify({
  scope: "Candidate continuous streams through former residual coordinates; changed RNG consumption can move later coordinates. Diagnostic only, not full acceptance.", streams,
}, null, 2) + "\n");
