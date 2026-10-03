import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {createGunzip} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {projectMorphologyReplacement} from './morphology-projection.ts';
const archive='/private/tmp/q11b-composed-control-default-v1';
const out='/private/tmp/q11b-projection-corpus-preflight-v1';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pin(path){let bytes=0;const sha=createHash('sha256');for await(const chunk of createReadStream(path)){bytes+=chunk.length;sha.update(chunk);}return{bytes,sha256:sha.digest('hex')};}
await mkdir(out);
const sealed=JSON.parse(await readFile(archive+'-freeze/complete.json','utf8'));
assert(sealed.passed);assert.deepEqual(await pin(archive+'/manifest.json'),sealed.manifest);
const manifest=JSON.parse(await readFile(archive+'/manifest.json','utf8')).manifest;
const runner=fileURLToPath(import.meta.url),projection=fileURLToPath(new URL('./morphology-projection.ts',import.meta.url));
const before={runner:await pin(runner),projection:await pin(projection),manifest:await pin(archive+'/manifest.json')};
const api=await import(pathToFileURL('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator/src/index.ts'));
const inventory=new Map(api.englishConfig.phonemes.map(phone=>[phone.sound,phone]));
const resolve=sound=>{const phone=inventory.get(sound);assert(phone,`Unregistered phone ${sound}`);return phone;};
let words=0,assemblies=0,unavailable=0,bridges=0;const byTemplate={};const artifacts=[];
for(const record of manifest.artifacts.filter(record=>record.file.startsWith('words/'))){
 const path=archive+'/'+record.file;assert.deepEqual(await pin(path),{bytes:record.bytes,sha256:record.sha256});
 const input=createReadStream(path),unzip=createGunzip();input.on('error',error=>unzip.destroy(error));
 const lines=createInterface({input:input.pipe(unzip),crlfDelay:Infinity});let count=0;
 for await(const line of lines){
  const row=JSON.parse(line);const preparation=row.word.trace?.morphologyPreparation;words++;count++;
  if(!preparation?.prepared){unavailable++;continue;}
  const root=structuredClone(preparation.before.syllables);
  const beforePhones=preparation.phonesBefore,afterPhones=preparation.phonesAfter;
  assert(beforePhones&&afterPhones);
  assert.deepEqual(afterPhones.changes.slice(0,beforePhones.changes.length),beforePhones.changes);
  const coordinates=new Map(beforePhones.final.map(phone=>[phone.id,phone]));
  for(const change of afterPhones.changes.slice(beforePhones.changes.length)){
   const coord=coordinates.get(change.id);assert(coord);
   const current=root[coord.syllable][coord.segment][coord.index];assert.equal(current.sound,change.before);
   root[coord.syllable][coord.segment][coord.index]=resolve(change.after);
  }
  const first=root.flatMap((syllable,syllableIndex)=>['onset','nucleus','coda'].flatMap(segment=>
   syllable[segment].map((phoneme,index)=>({target:{syllableIndex,segment,index},phoneme}))))[0];assert(first);
  const prepared=preparation.prepared;
  const projected=projectMorphologyReplacement(root,first.target,first.phoneme,prepared.prefix?.resolved,prepared.suffix?.resolved,resolve);
  assert.equal(projected.rootSyllableStart,prepared.rootSyllableStart);
  const identities=new Map(afterPhones.initial.map(phone=>[phone.id,phone.source]));
  const expected=preparation.after.syllables.map(()=>({onset:[],nucleus:[],coda:[]}));
  for(const phone of afterPhones.final){
   const source=identities.get(phone.id);assert(source);
   if(source.kind==='bridge'){bridges++;continue;}
   expected[phone.syllable][phone.segment].push({sound:phone.sound,part:source.part});
  }
  const actual=projected.syllables.map(syllable=>Object.fromEntries(['onset','nucleus','coda'].map(segment=>[segment,
   syllable[segment].map(phone=>({sound:phone.phoneme.sound,part:phone.source.part}))])));
  assert.deepEqual(actual,expected,`${row.profile}/${row.seed}/${row.drawIndex}`);
  assemblies++;byTemplate[preparation.template]=(byTemplate[preparation.template]??0)+1;
 }
 assert.equal(count,10000);assert.deepEqual(await pin(path),{bytes:record.bytes,sha256:record.sha256});
 artifacts.push({file:record.file,words:count,bytes:record.bytes,sha256:record.sha256});console.log(`${record.file}: ${count} records inspected`);
}
assert.equal(words,200000);assert.equal(assemblies,57343);assert.equal(assemblies+unavailable,words);
assert.deepEqual({runner:await pin(runner),projection:await pin(projection),manifest:await pin(archive+'/manifest.json')},before);
await writeFile(out+'/complete.json',JSON.stringify({passed:true,words,assemblies,unavailable,bridges,byTemplate,before,artifacts,
 scope:'Prototype proposal projection agrees on every phone sound and root/prefix/suffix ownership in all emitted nonbare default-policy baseline assemblies before random bridges. Source ledger coordinates are separately authenticated by the prior complete independent structural replay; this preflight does not claim a replacement-policy result.'},null,2)+'\n',{flag:'wx'});
