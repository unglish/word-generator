import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root,output]=process.argv.slice(2);
const api=await import(pathToFileURL(root+'/src/index.ts'));
const {countNormalizedPhonemes}=await import(pathToFileURL(root+'/src/core/phoneme-normalization.ts'));
const {computePhonemeQualityMetrics}=await import(pathToFileURL(root+'/src/core/phoneme-quality.ts'));
const protocol=JSON.parse(readFileSync('/tmp/pr313-calibration/protocol.json'));
const normalization=JSON.parse(readFileSync(root+'/data/cmu/phoneme-normalization.json'));
const reference=JSON.parse(readFileSync(root+'/data/cmu/cmu-lexicon-phonemes.json'));
const add=(d,k,n=1)=>d[k]=(d[k]??0)+n;
const sounds=s=>typeof s==='string'?s:s.sound;
function tally(syllables){const d={};syllables.forEach((s,i)=>{for(const position of ['onset','nucleus','coda'])for(const p of s[position]){add(d,'phones');if(sounds(p)==='z'){add(d,'z');add(d,'z/'+position);add(d,'z/'+position+'/'+(i===syllables.length-1?'final-syllable':'nonfinal-syllable'));if(position==='coda')add(d,'z/coda-shape/'+s.coda.map(sounds).join('|'));}}});return d;}
const runs=[];
for(const profile of protocol.traceProfiles)for(const seed of protocol.developmentSeeds){
 const stream=api.createSeededRng(seed);let draws=0;const rand=()=>{draws++;return stream();};
 const r={profile,seed,words:0,draws:0,counts:{},losses:{},root:{},final:{},stages:{},events:{},strata:{},witnesses:{}};
 function remember(key,word,draw){if(!(key in r.witnesses))r.witnesses[key]={draw,word};}
 for(let draw=0;draw<protocol.traceWordsPerStream;draw++){
  const word=api.generateWord({...profile,rand,trace:true});r.words++;
  const c=countNormalizedPhonemes([word],normalization);for(const [k,v]of Object.entries(c.counts))add(r.counts,k,v);for(const[k,v]of Object.entries(c.losses))add(r.losses,k,v);
  const final=tally(word.syllables),generated=word.trace.stages.find(s=>s.name==='generateSyllables');assert(generated);
  for(const[k,v]of Object.entries(final))add(r.final,k,v);for(const[k,v]of Object.entries(tally(generated.after)))add(r.root,k,v);
  const morph=word.trace.morphology;const stratum=morph?.prefix?(morph.suffix?'both':'prefix'):(morph?.suffix?'suffix':'bare');const strata=r.strata[stratum]??={words:0,z:0,phones:0};strata.words++;strata.z+=final.z??0;strata.phones+=final.phones??0;
  for(const stage of word.trace.stages){const before=tally(stage.before),after=tally(stage.after),d=r.stages[stage.name]??={words:0,zBefore:0,zAfter:0,zGained:0,zLost:0};d.words++;d.zBefore+=before.z??0;d.zAfter+=after.z??0;const delta=(after.z??0)-(before.z??0);d.zGained+=Math.max(0,delta);d.zLost+=Math.max(0,-delta);if(delta && stage.name!=='generateSyllables')remember(stage.name+(delta>0?'/gain':'/loss'),word,draw);}
  for(const event of word.trace.structural){if(event.event==='codaExtensionRejected'){add(r.events,event.extension+'/'+event.reason);if(event.coda.includes('z')){add(r.events,event.extension+'/'+event.reason+'/contains-z');remember('rejected/'+event.reason+'/z',word,draw);}}else if(event.event==='finalS'||event.event==='nasalStopExtension'){add(r.events,event.event);}}
 }
 r.draws=draws;r.metrics=computePhonemeQualityMetrics(r.counts,reference,0.5);runs.push(r);console.log(profile.morphology,seed,'z',r.final.z,'draws',draws);
}
writeFileSync(output,JSON.stringify({root,protocol,runs},null,2),{flag:'wx'});
