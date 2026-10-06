import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createGenerator,createSeededRng,englishConfig} from "../../../src/index.ts";
const baseline=JSON.parse(readFileSync(new URL("baseline-residuals.json",import.meta.url)));
const splitVowels=JSON.parse(readFileSync(new URL("../completion-isolated-u/configuration.json",import.meta.url)));
const generator=createGenerator({...englishConfig,splitVowels});
for(const witness of baseline.allAffectedTraceWitnesses){
 const rand=createSeededRng(witness.seed);let word;
 for(let i=0;i<=witness.drawIndex;i++)word=generator.generateWord({mode:"lexicon",morphology:false,rand,trace:true});
 assert.equal(word.written.clean,witness.written.clean);
 const ledger=word.trace.baseSpelling;
 const attempts=ledger.completion.attempts.filter(({attempt:a})=>a.status==="evaluated"&&a.sample.status==="infeasible");
 assert.equal(attempts.length,witness.finalUnresolvedCount);
 console.log(JSON.stringify({seed:witness.seed,drawIndex:witness.drawIndex,written:word.written.clean,infeasible:attempts.length,phones:ledger.phones.map(p=>p.soundAtSpelling)}));
}
