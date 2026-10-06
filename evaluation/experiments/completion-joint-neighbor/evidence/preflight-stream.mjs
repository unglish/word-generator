import assert from "node:assert/strict";
import {createReadStream,readFileSync,writeFileSync} from "node:fs";
import {createGunzip} from "node:zlib";
import {createInterface} from "node:readline";
import {createHash} from "node:crypto";
import {englishConfig} from "/private/tmp/q14a-completion-joint-neighbor-v2/src/index.ts";
import {createSplitObserver} from "/private/tmp/q14a-completion-joint-neighbor-v2/evaluation/experiments/split-digraphs/observe-split.ts";
const base="/private/tmp/q14a-completion-joint-neighbor-evidence-v2";
const file=base+"/candidate-archive/words/lexicon-bare-772709128.jsonl.gz";
const sha=()=>createHash("sha256").update(readFileSync(file)).digest("hex");
const before=sha();
const config={...englishConfig,splitVowels:JSON.parse(readFileSync(base+"/measured-configuration.json"))};
const observe=createSplitObserver(config);let words=0,joint=0;const counts={};
for await(const line of createInterface({input:createReadStream(file).pipe(createGunzip()),crlfDelay:Infinity})) {
 const row=JSON.parse(line);assert.equal(row.seed,772709128);assert.equal(row.drawIndex,words);
 const result=observe(row.word);
 for(const [key,n] of Object.entries(result.counts))counts[key]=(counts[key]??0)+n;
 joint+=row.word.trace.baseSpelling.completion.certificates.filter(c=>c.neighborReplacements?.length).length;
 words++;
}
assert.equal(words,10000);assert(joint>0);assert.equal(sha(),before);
writeFileSync(base+"/preflight-stream.json",JSON.stringify({passed:true,words,joint,counts,archiveSha256:before,scope:"One complete retained 10000-word stream producer-assisted replay; not independent full-corpus acceptance"},null,2)+"\n");
console.log(JSON.stringify({passed:true,words,joint}));
