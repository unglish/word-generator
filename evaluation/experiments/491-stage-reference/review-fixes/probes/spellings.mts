import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const api=await import(pathToFileURL(resolve(process.argv[2] ?? ".", "src/index.ts")).href);
const {createSeededRng}=await import(pathToFileURL(resolve("src/utils/random.ts")).href);
const initial=[];
for(let seed=470;seed<=474;seed++){
 const words=api.generateWords(4000,{seed,mode:"lexicon",trace:true});
 const seen={onsetless:0,prefixed:0,items:[]};
 for(const w of words){
  const t=w.trace, root=t.stages.find(s=>s.name==="repairNucleusWordPositions").after;
  const onsetless=root[0].onset.length===0;
  if(onsetless)seen.onsetless++;
  if(t.morphology.prefix)seen.prefixed++;
  if(!/^(?:(?:ie)|(?:oo)|(?:ee))/.test(w.written.clean))continue;
  seen.items.push({spelling:w.written.clean,pronunciation:w.pronunciation,shape:root[0],plans:t.syllablePlans,affixes:t.morphology,graphemes:t.graphemeSelections.filter(x=>x.syllableIndex===0),repairs:t.repairs});
 }
 initial.push({seed,...seen});
}
const ia={ia:{},ian:{},items:[],bigrams:0,trigrams:0,sion:[]};
for(const [seed,count] of [[2028,30000],[2029,5000]]){
 const rr=createSeededRng(seed);
 let state=seed;
 const rand=()=>{state=(state+0x6d2b79f5)>>>0;return rr()};
 for(let i=0;i<count;i++){
  const checkpoint=state,w=api.generateWord({rand,mode:"lexicon"});
  const txt=w.written.clean;
  if(seed===2028){ia.bigrams+=txt.length-1;ia.trigrams+=Math.max(0,txt.length-2);}
  if(seed===2028?!txt.includes("ia"):!txt.endsWith("sion"))continue;
  const tr=api.generateWord({seed:checkpoint,mode:"lexicon",trace:true});
  if(tr.written.clean!==txt)throw new Error("RNG replay diverged");
  const t=tr.trace;
  if(seed===2029){ia.sion.push({txt,affixes:t.morphology});continue;}
  const root=t.morphology.realization?.emittedParts.find(x=>x.role==="root")?.text??txt;
  const affix=t.morphology.suffix??"bare";
  for(const key of ["ia","ian"]) if(txt.includes(key)){
   const cls=root.includes(key)?"root":"boundary:"+affix;
   ia[key][cls]=(ia[key][cls]??0)+txt.split(key).length-1;
  }
  ia.items.push({spelling:txt,root,pronunciation:tr.pronunciation,affixes:t.morphology,graphemes:t.graphemeSelections,repairs:t.repairs});
 }
}
console.log(JSON.stringify({initial,ia}));
