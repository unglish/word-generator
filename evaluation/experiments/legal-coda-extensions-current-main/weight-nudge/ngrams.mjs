import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root,name]=process.argv.slice(2);
const imp=p=>import(pathToFileURL(root+'/'+p));
const {createGenerator,englishConfig,createSeededRng,generateWord}=await imp('src/index.ts');
const {countNormalizedPhonemes}=await imp('src/core/phoneme-normalization.ts');
const {computePhonemeQualityMetrics}=await imp('src/core/phoneme-quality.ts');
const {phonemeGateViolations}=await imp('src/core/phoneme-quality-gates.ts');
const read=p=>JSON.parse(readFileSync(root+'/'+p));
const protocol=JSON.parse(readFileSync('/tmp/pr313-weight-nudge/protocol.json'));
const weights=protocol.variants[name];assert(weights);
const replacements=new Map(englishConfig.phonemes.map(p=>[p,{...p,coda:weights[p.sound]??p.coda}]));
const config={...englishConfig,phonemes:[...replacements.values()],phonemeMaps:Object.fromEntries(Object.entries(englishConfig.phonemeMaps).map(([pos,map])=>[pos,new Map([...map].map(([sound,list])=>[sound,list.map(p=>replacements.get(p))]))]))};
const gen=createGenerator(config);
const limits=read('src/config/phoneme-thresholds.json');delete limits.phonemeOverrides;
const normalization=read('data/cmu/phoneme-normalization.json');const reference=read('data/cmu/cmu-lexicon-phonemes.json');
const add=(o,k,n=1)=>o[k]=(o[k]??0)+n;
const phone=p=>typeof p==='string'?p:p.sound;
function tally(syllables){const out={};for(const s of syllables)for(const pos of ['onset','nucleus','coda'])for(const p of s[pos]){add(out,'phones');if(phone(p)==='n'||phone(p)==='z')add(out,phone(p)+'/'+pos);}return out;}
function trace(w,t){const first=w.trace.stages.find(s=>s.name==='generateSyllables');assert(first);for(const[k,v]of Object.entries(tally(first.after)))add(t.root,k,v);for(const[k,v]of Object.entries(tally(w.syllables)))add(t.final,k,v);for(const e of w.trace.structural)if(e.event==='codaExtensionRejected')add(t.rejections,e.extension+'/'+e.reason);for(const s of first.after)for(let i=1;i<s.coda.length;i++)if(phone(s.coda[i-1])===phone(s.coda[i]))add(t,'rootDuplicates');for(const s of w.syllables){if(s.coda.map(phone).join('')==='ksts')add(t,'ksts');}if(Object.keys(t.witnesses).length<3&&w.trace.structural.some(e=>e.event==='codaExtensionRejected'))t.witnesses[w.written.clean]=w;}
const thresholds=read('src/config/ngram-thresholds.json');const rand=createSeededRng(42);const counts={2:{},3:{}};const witnesses=[];
for(let i=0;i<200000;i++){const w=gen.generateWord({rand,trace:true});const s=w.written.clean;for(const n of [2,3])for(let j=0;j<=s.length-n;j++)add(counts[n],s.slice(j,j+n));if(s.includes('ugh'))witnesses.push({draw:i,word:w});}
const report={name,words:200000,witnesses,metrics:{}};
for(const n of [2,3]){const cmu=read('data/cmu/cmu-lexicon-'+(n===2?'bigrams':'trigrams')+'.json');const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);const total=sum(counts[n]),ct=sum(cmu);const rows=Object.entries(cmu).map(([gram,count])=>({gram,reference:count/ct,generated:(counts[n][gram]??0)/total,ratio:((counts[n][gram]??0)/total)/(count/ct)}));const upper=rows.filter(r=>r.reference>=.001).sort((a,b)=>b.ratio-a.ratio)[0];const lower=rows.filter(r=>r.reference>=(n===2?thresholds.minBigramBaselineFreq:thresholds.minTrigramBaselineFreq)).sort((a,b)=>a.ratio-b.ratio)[0];report.metrics[n]={total,upper,lower,ugh:counts[n].ugh??0,upperPass:upper.ratio<=(n===2?thresholds.maxBigramOverRepresentation:thresholds.maxTrigramOverRepresentation),lowerPass:lower.ratio>=(n===2?thresholds.minBigramRepresentation:thresholds.minTrigramRepresentation)};}
writeFileSync('/tmp/pr313-weight-nudge/'+name+'-ngrams.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.metrics));
