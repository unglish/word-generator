import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
import {englishConfig} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/index.ts";
import {BaseSpelling} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/core/base-spelling.ts";
import {buildGraphemeMaps} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/elements/graphemes/index.ts";
import {createCompletionPlanner as oldPlanner} from "/private/tmp/q14a-completion-joint-neighbor-v1/src/core/spelling-completion-planner.ts";
import {createCompletionPlanner as newPlanner} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/core/spelling-completion-planner.ts";
const graphemes=[
 {phoneme:"k",form:"c",frequency:1,origin:0,reading:{kind:"following-letter",forbid:["e","i","y"]}},
 {phoneme:"eɪ",form:"a",frequency:1,origin:0,reading:{kind:"open-vowel-or-split-marker"}},
 {phoneme:"t",form:"t",frequency:1,origin:0,reading:{kind:"single-phone"}},
 {phoneme:"eɪ",form:"e",frequency:1,origin:0,reading:{kind:"single-phone"},condition:{leftGraphemeContext:["c"]}},
 {phoneme:"k",form:"k",frequency:1,origin:0,reading:{kind:"single-phone"}},
];
const config={...englishConfig,graphemes,...buildGraphemeMaps(graphemes),doubling:undefined,sharedSpellings:[]};
const phones=graphemes.slice(0,3).map((g,id)=>({id,part:"root",syllableIndex:0,segment:["onset","nucleus","coda"][id],segmentIndex:0,soundAtSpelling:g.phoneme,boundary:{phoneme:englishConfig.phonemes.find(p=>p.sound===g.phoneme)}}));
const base=new BaseSpelling(phones,true,true,true);
for(const [id,g] of graphemes.slice(0,3).entries())base.appendChoice(id,g.form,g.form,id,0);
const view=base.constructionState(),before=structuredClone(view);
const unexpected=()=>{throw Error("Unexpected draw")};
const old=oldPlanner(config,[]).decide(view,1,[],unexpected);
const corrected=newPlanner(config,[]).decide(view,1,[],unexpected);
assert.equal(old.joint.sample.status,"selected");
assert.equal(corrected.joint.sample.status,"infeasible");
assert.equal(corrected.joint.proposals[1].refusal,"joint-nucleus-ineligible");
assert.deepEqual(view,before);
writeFileSync(new URL("context-eligibility-regression.json",import.meta.url),JSON.stringify({passed:true,old,corrected,scope:"Synthetic configured-context regression; proves refusal correction, not output quality or full corpus acceptance"},null,2)+"\n");
console.log("Old revision admits illegal prefix; corrected revision refuses it without RNG or state mutation");
