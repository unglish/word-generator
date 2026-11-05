import { createReadStream, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readRun } from '../../evaluation/quality/capture.ts';
import assert from 'node:assert/strict';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
async function* archivedDraws(file) {
  const input = createReadStream(file).pipe(createGunzip());
  for await (const line of createInterface({input, crlfDelay: Infinity})) yield JSON.parse(line);
}
const [directory, output, kind] = process.argv.slice(2);
const run = await readRun(resolve(directory), true);
const rules = run.manifest.generator.effectiveConfig.codaConstraints.bannedNucleusCodaCombinations;
const forbidden = (n,c) => rules.some(rule => rule.nucleus.includes(n) && rule.coda.includes(c));
const profiles = {};
const witnesses = [];
for (const profile of run.manifest.protocol.profiles) {
  const result = profiles[profile.id] = { words: 0, layers: {}, repairs: {}, pairExclusionRepairs: 0, excludedEntries: 0 };
  for (const seed of profile.seeds[run.manifest.cohort]) {
    let index = 0;
    for await (const draw of archivedDraws(resolve(directory, `words/${profile.id}-${seed}.jsonl.gz`))) {
      assert.equal(draw.profile, profile.id); assert.equal(draw.seed, seed); assert.equal(draw.drawIndex, index++);
      result.words++;
      const word = draw.word, trace = word.trace;
      assert.ok(trace);
      const layers = [
        ['sampled', trace.stages.find(s=>s.name==='generateSyllables').after],
        ['structural', trace.stages.find(s=>s.name==='applyStress').before],
        ['rootStress', trace.stages.find(s=>s.name==='repairStressedNuclei').after],
        ['rootEdge', trace.stages.find(s=>s.name==='repairNucleusWordPositions').after],
        ['preparedRoot', trace.stages.find(s=>s.name==='generateWrittenForm').before],
      ];
      for (const [layer, syllables] of layers) {
        const stats = result.layers[layer] ??= { pairs: 0, violations: 0, words: 0 };
        let hits = 0;
        for (const syllable of syllables) for (const n of syllable.nucleus) for (const c of syllable.coda) {
          stats.pairs++; if (forbidden(n,c)) { stats.violations++; hits++; }
        }
        if (hits) {
          stats.words++;
          if (witnesses.filter(w=>w.profile===profile.id && w.layer===layer).length < 5)
            witnesses.push({profile: profile.id, seed, drawIndex: draw.drawIndex, layer, word});
        }
      }
      const events = trace.repairs.filter(event=>event.nucleusReplacement);
      let changes = 0;
      for (const name of ['repairStressedNuclei','repairNucleusWordPositions','repairFinalStressedNuclei']) {
        const stage = trace.stages.find(s=>s.name===name);
        if (!stage) continue;
        const counts = result.repairs[name] ??= {root: 0, affix: 0};
        assert.equal(stage.before.length, stage.after.length);
        for (let si=0; si<stage.before.length; si++) {
          const before=stage.before[si], after=stage.after[si];
          assert.deepEqual(before.onset,after.onset); assert.deepEqual(before.coda,after.coda);
          assert.equal(before.nucleus.length,after.nucleus.length);
          const ri = si - (name==='repairFinalStressedNuclei' ? word.lexical.rootSyllableStart : 0);
          const isRoot = name!=='repairFinalStressedNuclei' || (ri>=0 && ri<word.lexical.root.length);
          for (let ni=0;ni<before.nucleus.length;ni++) if(before.nucleus[ni]!==after.nucleus[ni]) {
            counts[isRoot?'root':'affix']++;
            if (!isRoot) continue;
            changes++;
            if (kind==='candidate') {
              const matches=events.filter(e=>e.rule===name && e.nucleusReplacement.syllableIndex===ri && e.nucleusReplacement.nucleusIndex===ni);
              assert.equal(matches.length,1);
              const event=matches[0], detail=event.nucleusReplacement;
              assert.equal(event.before,before.nucleus[ni]); assert.equal(event.after,after.nucleus[ni]);
              const coda = name==='repairFinalStressedNuclei' ? word.lexical.root[ri].coda.map(p=>p.sound) : before.coda;
              assert.deepEqual(detail.coda,coda);
              assert.ok(coda.every(c=>!forbidden(event.after,c)));
              assert.ok(Number.isFinite(detail.totalWeight) && detail.totalWeight>0 && detail.eligibleCandidateEntries>0);
              if(detail.positivePairExclusions) { result.pairExclusionRepairs++; result.excludedEntries+=detail.positivePairExclusions; }
            }
          }
        }
      }
      if(kind==='candidate') assert.equal(events.length,changes);
    }
    assert.equal(index,run.manifest.protocol.wordsPerReplicate);
  }
}
writeFileSync(output,JSON.stringify({manifest:run.manifest,profiles,witnesses},null,2));
console.log(JSON.stringify(profiles,null,2));
