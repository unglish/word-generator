import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {gunzipSync} from "node:zlib";
import {englishConfig} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/index.ts";
import {createBaseSpellingEvidenceVerifier} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/core/spelling-evidence.ts";
const base="/private/tmp/q14a-completion-joint-neighbor-evidence-v2";
const witness=JSON.parse(gunzipSync(readFileSync(base+"/public-api-julicky-witness.json.gz")));
const trace=witness.candidate.word.trace.baseSpelling;
const verify=createBaseSpellingEvidenceVerifier({...englishConfig,splitVowels:JSON.parse(readFileSync(base+"/measured-configuration.json"))});
verify(trace);const original=structuredClone(trace);
const id=trace.completion.certificates.findIndex(c=>c.neighborReplacements?.length);
const tests=[
 ["neighbor-phone",c=>{c.neighborReplacements[0].phoneIds=[c.unitId]}],
 ["neighbor-unit",c=>{c.neighborReplacements[0].unitId=c.unitId}],
 ["neighbor-inventory",c=>{c.neighborReplacements[0].inventoryIndex=c.inventoryIndex}],
 ["neighbor-reading",c=>{c.neighborReplacements[0].reading={kind:"following-letter",require:["z"]}}],
 ["neighbor-output-id",c=>{c.neighborReplacements[0].outputCellIds[0]=999999}],
 ["partial-neighbor-output",c=>{c.neighborReplacements[0].outputCellIds.pop()}],
 ["duplicate-neighbor",c=>{c.neighborReplacements.push(structuredClone(c.neighborReplacements[0]))}],
];
const rejected=[];
for(const [name,mutate] of tests){const damaged=structuredClone(trace);mutate(damaged.completion.certificates[id]);assert.throws(()=>verify(damaged));rejected.push(name);}
assert.deepEqual(trace,original);
writeFileSync(base+"/joint-tampering-results.json",JSON.stringify({passed:true,rejected,originalUnchanged:true,scope:"Producer-assisted replay corruption tests on exact retained publicAPI joint trace; no independent eligibility or whole-corpus acceptance claim"},null,2)+"\n");
console.log("Rejected all "+rejected.length+" joint-certificate corruptions; original trace unchanged");
