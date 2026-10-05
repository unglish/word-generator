import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {englishConfig} from "../../../src/config/english.ts";
import {BaseSpelling} from "../../../src/core/base-spelling.ts";
import {spellingBoundaryContexts} from "../../../src/core/spelling-context.ts";
import {createCompletionCandidatePool} from "../../../src/core/spelling-completion-pool.ts";
import {createCompletionProjectionGuard} from "../../../src/core/spelling-completion-projection.ts";
const split=JSON.parse(readFileSync(new URL("configuration.json",import.meta.url)));
const config=structuredClone({...englishConfig,splitVowels:split});
const before=structuredClone(config);
for(const [sound,form,allowed] of [["k","c",true],["j","j",false],["ʃ","s",false]]){
 const entries=[[sound,form],["u","u"],["t","t"]];
 const phones=entries.map(([sound],id)=>({id,part:"root",syllableIndex:0,segment:id===0?"onset":id===1?"nucleus":"coda",segmentIndex:0,soundAtSpelling:sound,boundary:{phoneme:englishConfig.phonemes.find(p=>p.sound===sound)}}));
 const base=new BaseSpelling(phones,true,true,true);
 entries.forEach(([sound,form],id)=>{const index=config.graphemes.findIndex(g=>g.phoneme===sound&&g.form===form&&(sound!=="k"||g.reading?.kind==="following-letter"));assert(index>=0);base.appendChoice(id,form,form,index,0);});
 const view=base.constructionState();const original=structuredClone(view);const slot=spellingBoundaryContexts(phones)[1].slot;
 const pool=createCompletionCandidatePool(config)(slot,{previousForm:form,doublingCount:0});
 assert.equal(pool.status,"available");const oo=pool.proposals.find(p=>p.form==="oo");assert(oo,"Isolated oo must be eligible");assert.equal(oo.reading.kind,"single-phone");
 const result=createCompletionProjectionGuard(config,split.supports)(view,1,oo.inventoryIndex,[]);
 assert.equal(result.status,allowed?"preserved":"refused");if(!allowed)assert.equal(result.reason,"neighbor-reading");
 assert.deepEqual(view,original);
}
assert.deepEqual(config,before);
assert.equal(englishConfig.graphemes.find(g=>g.phoneme==="u"&&g.form==="oo").isolatedSyllableWeight,0);
console.log("PASS: isolated oo eligibility, hard-c preservation, unsupported-neighbor refusals, immutable views and initial inventory");
