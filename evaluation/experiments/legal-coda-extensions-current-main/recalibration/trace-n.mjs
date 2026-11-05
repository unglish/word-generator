import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root,out]=process.argv.slice(2);
const {generateWord,createSeededRng}=await import(pathToFileURL(root+'/src/index.ts'));
const protocol=JSON.parse(readFileSync('/tmp/pr313-calibration/protocol.json'));
const add=(d,k,v=1)=>d[k]=(d[k]??0)+v;
const phone=p=>typeof p==='string'?p:p.sound;
function tally(syllables){const c={};for(const [i,s]of syllables.entries())for(const pos of ['onset','nucleus','coda'])for(const p of s[pos]){add(c,'phones');if(phone(p)==='n'){add(c,'n');add(c,'n/'+pos);add(c,'n/'+pos+'/'+(i===syllables.length-1?'final':'nonfinal'));}}return c;}
const runs=[];
for(const seed of protocol.developmentSeeds){const rand=createSeededRng(seed);const r={seed,words:0,root:{},final:{},stages:{},lengths:{},selection:{},events:{},witnesses:{}};
for(let draw=0;draw<10000;draw++){
 const w=generateWord({rand,mode:'lexicon',morphology:false,trace:true});r.words++;
 const stage=w.trace.stages.find(s=>s.name==='generateSyllables');assert(stage);
 for(const[k,v]of Object.entries(tally(stage.after)))add(r.root,k,v);
 const f=tally(w.syllables);for(const[k,v]of Object.entries(f))add(r.final,k,v);
 const l=r.lengths[f.phones]??={words:0,n:0};l.words++;l.n+=f.n??0;
 const s=w.trace.selection;add(r.selection,'attempts',s.attemptsExecuted);add(r.selection,s.status);add(r.selection,'selectedRootPhonemes',s.selected.phonemes);
 for(const stage of w.trace.stages){const before=tally(stage.before),after=tally(stage.after),d=r.stages[stage.name]??={gained:0,lost:0};const delta=(after.n??0)-(before.n??0);d.gained+=Math.max(0,delta);d.lost+=Math.max(0,-delta);if(delta&&stage.name!=='generateSyllables'&&!r.witnesses[stage.name])r.witnesses[stage.name]={draw,word:w};}
 for(const e of w.trace.structural){if(e.event==='codaExtensionRejected'&&e.coda.includes('n')){add(r.events,e.extension+'/'+e.reason);const key=e.extension+'/'+e.reason;if(!r.witnesses[key])r.witnesses[key]={draw,word:w};}}
}
const delta=Object.entries(r.stages).filter(([k])=>k!=='generateSyllables').reduce((s,[,d])=>s+d.gained-d.lost,0);assert.equal(r.root.n+delta,r.final.n);runs.push(r);console.log(seed,r.final.n,r.root.n);}
writeFileSync(out,JSON.stringify({root,runs},null,2),{flag:'wx'});
