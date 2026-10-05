import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const b='/private/tmp/q14a-completion-isolated-u-evidence-v1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const authority=JSON.parse(await readFile(b+'/candidate-analysis-checkpoints/authority.json'));
assert.equal(authority.operatorSha256,sha(await readFile(b+'/analyze-split-resumable.mjs')));
const manifestBytes=await readFile(b+'/candidate-archive/manifest.json');assert.equal(authority.manifestSha256,sha(manifestBytes));
const {manifest}=JSON.parse(manifestBytes);const checked=[];
for(const profile of manifest.protocol.profiles)for(const seed of profile.seeds.development){
const name=profile.id+'-'+seed;let checkpoint;
try{checkpoint=JSON.parse(await readFile(b+'/candidate-analysis-checkpoints/'+name+'.json'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
assert.equal(checkpoint.words,manifest.protocol.wordsPerReplicate);
assert.equal(checkpoint.payloadSha256,sha(Buffer.from(JSON.stringify(checkpoint.payload))));
const raw=await readFile(b+'/candidate-archive/words/'+name+'.jsonl.gz');
assert.equal(checkpoint.archiveSha256,sha(raw));assert.equal(checkpoint.archiveSha256,manifest.artifacts.find(a=>a.file==='words/'+name+'.jsonl.gz').sha256);
const bytes=await readFile(b+'/candidate-analysis/observations/'+name+'.jsonl.gz');assert.equal(checkpoint.observationSha256,sha(bytes));
const lines=gunzipSync(bytes).toString().trimEnd().split('\n');assert.equal(lines.length,checkpoint.words);const sums={};
for(const [i,line]of lines.entries()){const row=JSON.parse(line);assert.equal(row.profile,profile.id);assert.equal(row.seed,seed);assert.equal(row.drawIndex,i);for(const [key,value]of Object.entries(row.counts)){assert(Number.isSafeInteger(value)&&value>=0);sums[key]=(sums[key]??0)+value;}}
const all=checkpoint.payload.groups.find(g=>JSON.stringify(g.dimensions)==='["all"]');assert(all);
for(const [key,value]of Object.entries(all.counts))assert.equal(value,sums[key]??0,key);
for(const [key,value]of Object.entries(sums))assert.equal(value,all.counts[key]??0,key);
assert.equal(all.counts.words,checkpoint.words);
checked.push({stream:name,words:checkpoint.words,checkpointSha256:sha(await readFile(b+'/candidate-analysis-checkpoints/'+name+'.json')),observationSha256:sha(bytes)});
}
const report={scope:'Checkpoint durability and observation-count consistency only; full independent semantic recount remains mandatory',manifestSha256:authority.manifestSha256,operatorSha256:authority.operatorSha256,streams:checked,words:checked.reduce((n,s)=>n+s.words,0)};
console.log(JSON.stringify(report,null,2));
