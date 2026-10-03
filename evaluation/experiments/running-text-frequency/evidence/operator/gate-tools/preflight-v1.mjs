import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const api=await import(pathToFileURL(root+'/src/index.ts'));
const {createFrequencyTextConfig}=await import(pathToFileURL(root+'/evaluation/corpus/frequency-runtime.ts'));
const fit=JSON.parse(await readFile('/private/tmp/q19-registered-fit-v1/artifact.json','utf8'));
const config=process.env.Q19_GATE_ARM==='candidate'?createFrequencyTextConfig(api.englishConfig,fit.models.candidate).config:api.englishConfig;
const direct=api.createGenerator(config);
const wrapper=await import('./generator.ts');
const text=await import('./text-generator.ts');
for(const mode of ['lexicon','text']){
 const target=mode==='text'?text:wrapper;
 const randA=api.createSeededRng(42),randB=api.createSeededRng(42);
 for(let i=0;i<100;i++)assert.deepEqual(target.generateWord({mode,rand:randA,trace:true}),direct.generateWord({mode,rand:randB,trace:true}));
 assert.equal(randA(),randB());
 assert.deepEqual(target.generateWords(100,{mode,seed:123,trace:true}),direct.generateWords(100,{mode,seed:123,trace:true}));
}
const registration=JSON.parse(await readFile(new URL('./binding-registration.json',import.meta.url),'utf8'));
for(const record of registration.records){
 const original=await readFile(record.original,'utf8'),wrapped=await readFile(record.wrapper,'utf8');
 assert.equal(createHash('sha256').update(original).digest('hex'),record.originalSha256);
 assert.equal(createHash('sha256').update(wrapped).digest('hex'),record.wrapperSha256);
 assert.equal(wrapped.replace('from "./generator.js"','from "./generate.js"').replace(`from "${root}/src/utils/letters.ts"`,'from "../utils/letters.js"'),original);
}
console.log(JSON.stringify({passed:true,arm:process.env.Q19_GATE_ARM,completePublicWordComparisons:400,nextRngProbes:2,originalGateBodiesAuthenticated:true}));
