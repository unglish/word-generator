import { generateWord, createSeededRng } from './control-committed/src/index.ts';
import { readFileSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGzip, gunzipSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const base='/private/tmp/q13-closure-audit-v1';
const packet=base+'/committed/evaluation/experiments/spelling-coverage';
const original=JSON.parse(gunzipSync(readFileSync(packet+'/control-manifest.json.gz')));
const source=JSON.parse(gunzipSync(readFileSync(packet+'/control-sources.json.gz')));
const sha=b=>createHash('sha256').update(b).digest('hex');
function verifySource(){for(const r of source.generator)if(readFileSync(base+'/control-committed/'+r.path,'utf8')!==r.content)throw Error('Source changed '+r.path);}
verifySource();
const out=base+'/reproduced-control';mkdirSync(out);mkdirSync(out+'/words');
const registration={sourceDigest:original.manifest.generator.sourceDigest,words:200000,profiles:original.manifest.protocol.profiles,wordsPerStream:10000,oldCaptureIdentity:original.manifest.generator.commit,oldDirty:original.manifest.generator.dirty,currentNode:process.version,scope:'Fresh public generation from exact archived runtime bytes. Original capture provenance is preserved separately.'};
writeFileSync(out+'/registration.json',JSON.stringify(registration,null,2)+'\n',{flag:'wx'});
const receipts=[];
try{
for(const p of registration.profiles)for(const seed of p.seeds.development){
 const file=`words/${p.id}-${seed}.jsonl.gz`;const rand=createSeededRng(seed);
 async function* lines(){for(let drawIndex=0;drawIndex<10000;drawIndex++)yield JSON.stringify({profile:p.id,seed,drawIndex,word:generateWord({...p.options,rand,trace:true})})+'\n';}
 await pipeline(Readable.from(lines()),createGzip(),createWriteStream(out+'/'+file,{flags:'wx'}));
 const b=readFileSync(out+'/'+file);const expected=original.manifest.artifacts.find(r=>r.file===file);
 receipts.push({file,bytes:b.length,sha256:sha(b),matchesOriginalCompressedBytes:b.length===expected.bytes&&sha(b)===expected.sha256});
 verifySource();writeFileSync(out+'/progress.json',JSON.stringify({streams:receipts},null,2)+'\n');console.log(file,receipts.at(-1).matchesOriginalCompressedBytes);
}
verifySource();writeFileSync(out+'/complete.json',JSON.stringify({passed:true,words:200000,streams:receipts,allOriginalCompressedHashesMatch:receipts.every(r=>r.matchesOriginalCompressedBytes)},null,2)+'\n',{flag:'wx'});
}catch(e){writeFileSync(out+'/failure.json',JSON.stringify({error:String(e),streamsCompleted:receipts.length},null,2)+'\n',{flag:'wx'});throw e;}
