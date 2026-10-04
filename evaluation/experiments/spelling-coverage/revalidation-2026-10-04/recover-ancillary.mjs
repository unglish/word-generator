import {classifyWord,METRIC_DEFINITIONS} from './frozen-observer/evaluation/quality/metrics.ts';
import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync,createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
const base='/private/tmp/q13-closure-audit-v1',arm=process.argv[2],dir=base+'/reproduced-'+arm;
const hash=d=>createHash('sha256').update(d).digest('hex');
const manifest=JSON.parse(readFileSync(dir+'/manifest.json')).manifest;
const sources=JSON.parse(gunzipSync(readFileSync(dir+'/sources.json.gz')));
const aliases=JSON.parse(sources.references.find(r=>r.path==='data/cmu/phoneme-normalization.json').content).generatedAliases;
const samples=[],witnesses={},distributions={};let words=0;
for(const p of manifest.protocol.profiles){
 const counts={phonemes:{},trigrams:{}};
 const inc=(obj,key)=>obj[key]=(obj[key]??0)+1;
 for(const seed of p.seeds.development){
  const file=`words/${p.id}-${seed}.jsonl.gz`,expected=manifest.artifacts.find(r=>r.file===file);
  const verify=()=>{const b=readFileSync(dir+'/'+file);if(b.length!==expected.bytes||hash(b)!==expected.sha256)throw Error('Shard integrity '+file);};verify();let draw=0;
  for await(const line of createInterface({input:createReadStream(dir+'/'+file).pipe(createGunzip()),crlfDelay:Infinity})){
   const row=JSON.parse(line);if(row.profile!==p.id||row.seed!==seed||row.drawIndex!==draw)throw Error('Coordinate');draw++;words++;
   const w=row.word,observations=classifyWord(w);
   for(const s of w.syllables)for(const phone of [...s.onset,...s.nucleus,...s.coda]){const sound=phone.sound.replace(/ʰ/g,'');inc(counts.phonemes,aliases[sound]??sound);}
   const spelling=w.written.clean.toLowerCase();for(let i=0;i+2<spelling.length;i++){const t=spelling.slice(i,i+3);if(/^[a-z]{3}$/.test(t))inc(counts.trigrams,t);}
   if(row.drawIndex<manifest.protocol.reviewDrawsPerReplicate)samples.push(row);
   for(const definition of METRIC_DEFINITIONS){if(!observations[definition.id])continue;const key=`${p.id}/${definition.id}`,examples=witnesses[key]??(witnesses[key]=[]);if(examples.length<2)examples.push(row);}
  }
  if(draw!==10000)throw Error('Draw count');verify();
 }
 distributions[p.id]=counts;
}
if(words!==200000)throw Error('Corpus count');
const receipts=[];
for(const [file,value] of [['review-samples.json.gz',samples],['witnesses.json.gz',witnesses],['distributions.json.gz',distributions]]){
 const bytes=gzipSync(JSON.stringify(value)+'\n'),expected=manifest.artifacts.find(r=>r.file===file);
 if(bytes.length!==expected.bytes||hash(bytes)!==expected.sha256)throw Error('Reconstruction differs '+file);
 writeFileSync(dir+'/'+file,bytes,{flag:'wx'});receipts.push({file,bytes:bytes.length,sha256:hash(bytes)});
}
writeFileSync(base+'/'+arm+'-ancillary-recovery.json',JSON.stringify({passed:true,words,receipts},null,2)+'\n',{flag:'wx'});console.log('Recovered original ancillary bytes',arm);
