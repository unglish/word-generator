import {readFileSync,mkdirSync,writeFileSync,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGzip,gunzipSync} from 'node:zlib';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const base='/private/tmp/q10b1-closure-audit-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const arm of ['control','candidate']){
 const packet=base+'/committed/evaluation/experiments/root-rime-compatibility/'+arm;
 const manifest=JSON.parse(readFileSync(packet+'/manifest.json')).manifest;
 const source=JSON.parse(gunzipSync(readFileSync(packet+'/sources.json.gz')));
 const root=base+'/'+arm+'-runtime';
 const {generateWord,createSeededRng}=await import(root+'/src/index.ts');
 const check=()=>{for(const r of source.generator)if(readFileSync(root+'/'+r.path,'utf8')!==r.content)throw Error('Changed '+r.path);};
 check();const out=base+'/reproduced-'+arm;mkdirSync(out);mkdirSync(out+'/words');
 writeFileSync(out+'/registration.json',JSON.stringify({arm,words:200000,sourceDigest:manifest.generator.sourceDigest,originalIdentity:manifest.generator,currentNode:process.version},null,2)+'\n',{flag:'wx'});
 const receipts=[];
 try{
 for(const p of manifest.protocol.profiles)for(const seed of p.seeds.development){
  const file=`words/${p.id}-${seed}.jsonl.gz`;const rand=createSeededRng(seed);
  async function* lines(){for(let drawIndex=0;drawIndex<10000;drawIndex++)yield JSON.stringify({profile:p.id,seed,drawIndex,word:generateWord({...p.options,rand,trace:true})})+'\n';}
  await pipeline(Readable.from(lines()),createGzip(),createWriteStream(out+'/'+file,{flags:'wx'}));
  const b=readFileSync(out+'/'+file),expected=manifest.artifacts.find(r=>r.file===file);
  receipts.push({file,bytes:b.length,sha256:sha(b),matchesOriginalCompressedBytes:b.length===expected.bytes&&sha(b)===expected.sha256});check();
  writeFileSync(out+'/progress.json',JSON.stringify({streams:receipts},null,2)+'\n');console.log(arm,file,receipts.at(-1).matchesOriginalCompressedBytes);
 }
 check();writeFileSync(out+'/complete.json',JSON.stringify({passed:true,words:200000,streams:receipts,allOriginalCompressedHashesMatch:receipts.every(r=>r.matchesOriginalCompressedBytes)},null,2)+'\n',{flag:'wx'});
 }catch(e){writeFileSync(out+'/failure.json',JSON.stringify({error:String(e),streamsCompleted:receipts.length},null,2)+'\n',{flag:'wx'});throw e;}
}
