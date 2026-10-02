import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {gzipSync} from 'node:zlib';
import * as api from '../../dist/index.js';
import {expandClusterConstraintBans} from '../../dist/config/language.js';
const corpus=JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url)));
const ids=new Map(corpus.inventory.map((p,i)=>[p,i]));
const pairs=expandClusterConstraintBans(api.englishConfig).flatMap(p=>p.map(s=>ids.get(s)));
const directories = process.argv.slice(2);
if (directories.length < 2 || directories.length > 3) throw new Error('Usage: node evaluation/repair-pilot/measure-rust-optimization.mjs BASE_BINDINGS_DIR RETAINED_BINDINGS_DIR [PRECOMPILED_KEYS_BINDINGS_DIR]');
const names = ['base', 'reserved', 'keys'].slice(0, directories.length);
const entries={};
const result={environment:{node:process.version,cpuAffinity:4},methodology:{samples:9,calls:100000,warmup:50000,order:'rotating',policy:'drop-coda',bannedPairs:pairs.length/2,trace:false,profile:'opt-level=s for all variants'},assets:{},parity:{},measurements:{}};
for(const name of names){const url=pathToFileURL(resolve(directories[names.indexOf(name)], 'unglish_wasm.js'));const bytes=readFileSync(new URL('unglish_wasm_bg.wasm',url));const bindings=await import(url.href);await bindings.default({module_or_path:bytes});entries[name]={raw:new bindings.RepairConfig(corpus.inventory.length,new Uint32Array(pairs)),adapter:await api.initializeRustRepair(api.englishConfig,{bindingsUrl:url,wasm:bytes})};result.assets[name]={bytes:bytes.length,gzipBytes:gzipSync(bytes).length};}
const ng={sound:'ŋ'},t={sound:'t'},v={sound:'æ'},p={sound:'p'};
const median=a=>[...a].sort((a,b)=>a-b)[4];let escaped;
for(const count of [2,7,16]){
 const word=Array.from({length:count},(_,i)=>({onset:i?[t,t]:[p],nucleus:[v],coda:i+1<count?[ng,ng]:[]}));
 const data=[1,count];for(const s of word){data.push(s.onset.length,s.nucleus.length,s.coda.length);for(const seg of [s.onset,s.nucleus,s.coda])for(const ph of seg)data.push(ids.get(ph.sound));}const packet=new Uint32Array(data);
 for(const method of ['raw','adapter']){
  function run(name,calls){for(let k=0;k<calls;k++){
   if(method==='raw')escaped=entries[name].raw.repair(packet,false);
   else {for(let i=0;i+1<count;i++){word[i].coda.length=0;word[i].coda.push(ng,ng);}entries[name].adapter.repair(word);escaped=word[0].coda.length;}
  }}
  const samples=Object.fromEntries(names.map(n=>[n,[]]));for(const n of names)run(n,50000);
  for(let trial=0;trial<9;trial++){const order=[...names.slice(trial%names.length),...names.slice(0,trial%names.length)];for(const n of order){const start=performance.now();run(n,100000);samples[n].push((performance.now()-start)*1e6/100000);}}
  result.measurements[`${count}-${method}`]={mediansNs:Object.fromEntries(names.map(n=>[n,median(samples[n])])),samplesNs:samples};
 }
}
for(const e of Object.values(entries)){e.raw.free();e.adapter.dispose();}
writeFileSync(new URL('./rust-optimization-results.local.json', import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify({assets:result.assets,measurements:Object.fromEntries(Object.entries(result.measurements).map(([k,v])=>[k,v.mediansNs]))},null,2));void escaped;
