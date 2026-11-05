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
const results=[];
for(const seed of protocol.seeds){const random=createSeededRng(seed);let draws=0;const rand=()=>{draws++;return random();};const t={root:{},final:{},rejections:{},witnesses:{}};function* words(){for(let i=0;i<protocol.sampleSize;i++){const w=gen.generateWord({rand,mode:'lexicon',morphology:false,trace:i<10000});if(i<10000)trace(w,t);yield w;}}const {counts,losses}=countNormalizedPhonemes(words(),normalization);const metrics=computePhonemeQualityMetrics(counts,reference,limits.minCommonBaselinePct);results.push({seed,draws,counts,losses,metrics,violations:phonemeGateViolations(metrics.topOverRepresented,limits),trace:t});console.log(name,seed,JSON.stringify(results.at(-1).violations));}
const t={root:{},final:{},rejections:{},witnesses:{}};const rand=createSeededRng(42);const spellings=new Set();const trigrams={};let chars=0;
for(let i=0;i<50000;i++){const w=gen.generateWord({rand,mode:'text',trace:true});trace(w,t);const s=w.written.clean;spellings.add(s);chars+=s.length;for(let j=0;j<s.length-2;j++)add(trigrams,s.slice(j,j+3));}
for(let seed=0;seed<100;seed++){const a=gen.generateWord({seed}),b=gen.generateWord({seed,trace:true});assert.equal(a.written.clean,b.written.clean);assert.equal(a.pronunciation,b.pronunciation);if(name==='control')assert.equal(JSON.stringify(a),JSON.stringify(generateWord({seed})));}
writeFileSync('/tmp/pr313-weight-nudge/'+name+'.json',JSON.stringify({name,weights,results,defaultText:{sampleSize:50000,trace:t,unique:spellings.size,chars,trigrams},determinismChecks:100},null,2),{flag:'wx'});
