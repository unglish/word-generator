import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {installedDependencies} from './dependency-closure.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator';
const commit='c0ff9c8cd7c512056832ec4863c78bc701e63e9e';
const out='/private/tmp/q11b-eligibility-probes-v1';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function pin(path){const b=await readFile(path);return{bytes:b.length,sha256:hash(b)};}
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function seal(){assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain','--untracked-files=no'),'');return{commit,
 files:Object.fromEntries(await Promise.all(git('ls-files','-z').split('\0').filter(Boolean).map(async path=>[path,await pin(join(root,path))]))),
 dependencies:await installedDependencies(root),node:{version:process.version,...await pin(process.execPath)},
 tools:{runner:await pin(fileURLToPath(import.meta.url)),closure:await pin(fileURLToPath(new URL('./dependency-closure.mjs',import.meta.url)))}};}
await mkdir(out);const save=(name,value)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
try{
 const before=await seal();await save('before.json',before);
 const {englishConfig}=await import(pathToFileURL(join(root,'src/index.ts')).href);
 const {canonical}=await import(pathToFileURL(join(root,'evaluation/quality/serialization.ts')).href);
 const {buildClusterRuntime}=await import(pathToFileURL(join(root,'src/core/cluster-runtime.ts')).href);
 const {evaluateMorphophonemicReplacement}=await import(pathToFileURL(join(root,'src/core/morphophonemic-guard.ts')).href);
 const definitions=[['s','sibilant','alveolar',false],['k','stop','velar',false],['t','stop','alveolar',false],['p','stop','bilabial',false],['b','stop','bilabial',true],['n','nasal','alveolar',true],['m','nasal','bilabial',true],['r','liquid','alveolar',true],['l','liquid','alveolar',true],['a','lowVowel','central',true],['i','highVowel','front',true]];
 const rows=[];
 const form=(phonemes=[],syllableCount=0,syllables)=>({written:'x',phonemes,syllableCount,...(syllables?{syllables}:{})});
 function add(id,onset,nucleus,coda,segment,index,next,mutate=()=>{},prefix,suffix,external=false){
  const config=structuredClone(englishConfig);
  const phones=definitions.map(([sound,mannerOfArticulation,placeOfArticulation,voiced])=>({sound,mannerOfArticulation,placeOfArticulation,voiced,onset:['a','i'].includes(sound)?0:1,coda:['a','i'].includes(sound)?0:1,nucleus:['a','i'].includes(sound)?1:0,startWord:1,midWord:1,endWord:1}));
  config.phonemes=phones;config.phonemeMaps=Object.fromEntries(['onset','nucleus','coda'].map(position=>[position,new Map(phones.filter(p=>p[position]>0).map(p=>[p.sound,[p]]))]));
  config.syllableStructure={...config.syllableStructure,maxOnsetLength:3,maxCodaLength:3,maxNucleusLength:1};
  config.sonorityHierarchy={mannerOfArticulation:{stop:1,sibilant:2,nasal:3,liquid:4,lowVowel:5,highVowel:5},placeOfArticulation:{},voicedBonus:0,tenseBonus:0};
  config.clusterConstraint=undefined;config.clusterWeights=undefined;config.invalidClusters={onset:[],coda:[],boundary:[]};
  config.clusterLimits={maxOnset:3,maxCoda:3,codaAppendants:['s'],attestedOnsets:[['t','r'],['k','r'],['p','r'],['p','l'],['s','t']],attestedCodas:[['s','k'],['s','t','s'],['k','s','t','s'],['n','t'],['m','p']]};
  config.codaConstraints={voicingAgreement:true,homorganicNasalStop:true};mutate(config);
  const rt=buildClusterRuntime(config);const resolve=sound=>rt.phonemeBySound.get(sound)??{sound,voiced:true,mannerOfArticulation:'midVowel',placeOfArticulation:'central',startWord:1,midWord:1,endWord:1};
  const rootPhones=[{onset:onset.map(resolve),nucleus:nucleus.map(resolve),coda:coda.map(resolve)}];
  const target={syllableIndex:0,segment,index};
  const canonicalPhone=resolve(next),replacement=external?{...canonicalPhone}:canonicalPhone;
  const original=canonical(rootPhones);
  const result=evaluateMorphophonemicReplacement(rt,rootPhones,target,replacement,prefix,suffix,resolve);
  assert.deepEqual(canonical(rootPhones),original);
  rows.push({id,configuration:canonical(config),root:original,target,replacement:canonical(replacement),
   replacementReference:external?{kind:'external-copy'}:{kind:'inventory',index:phones.indexOf(replacement)},prefix:prefix??null,suffix:suffix??null,result:canonical(result)});
 }
 add('root-sk-to-ss',[],['a'],['s','k'],'coda',1,'s');
 add('single-softening',[],['a'],['k'],'coda',0,'s');
 add('licensed-sts',[],['a'],['s','t','s'],'nucleus',0,'i');
 add('licensed-ksts',[],['a'],['k','s','t','s'],'nucleus',0,'i');
 add('interior-neighbours',[],['a'],['k','s','t','s'],'coda',1,'t');
 add('onset-denial',['t','r'],['a'],[],'onset',1,'s');
 add('onset-acceptance',['k','r'],['a'],[],'onset',0,'p');
 add('flat-prefix-licensed',['r'],['a'],[],'onset',0,'r',undefined,form(['r']));
 add('flat-suffix-licensed',[],['a'],['k'],'coda',0,'s',undefined,undefined,form(['s']));
 add('nucleus-mixed-coda',[],['a'],[],'nucleus',0,'i',c=>{c.codaConstraints.bannedNucleusCodaCombinations=[{nucleus:['i'],coda:['t']}];},undefined,form(['t']));
 add('mixed-voicing',[],['a'],['k'],'coda',0,'b',undefined,undefined,form(['t']));
 add('mixed-place',[],['a'],['m'],'coda',0,'n',undefined,undefined,form(['p']));
 add('affix-boundary',[],['a'],['k'],'coda',0,'s',c=>{c.clusterConstraint={banned:[['s','t']],repair:'drop-coda'};},undefined,form([],1,[{onset:['t'],nucleus:['a'],coda:[]}]));
 add('position-pool',[],['a'],['k'],'coda',0,'s',c=>{c.phonemeMaps.coda.delete('s');});
 add('actual-final-denial',[],['a'],['k'],'coda',0,'s',c=>{c.codaConstraints.allowedFinal=['k'];});
 add('affixed-final-acceptance',[],['a'],['k'],'coda',0,'s',c=>{c.codaConstraints.allowedFinal=['k'];},undefined,form(['k']));
 add('full-coda-length',[],['a'],['k'],'coda',0,'t',c=>{c.clusterLimits.maxCoda=1;},undefined,form(['k']));
 add('mixed-unattested',['r'],['a'],[],'onset',0,'s',undefined,form(['p']));
 add('root-duplicates-not-hidden',['r','r'],['a'],[],'onset',1,'r',undefined,form(['r']));
 add('fallback-regex',['p','r'],['a'],[],'onset',0,'k',c=>{delete c.clusterLimits.attestedOnsets;c.invalidClusters.onset=['kr'];});
 add('weight-suppression',[],['a'],['k','s'],'coda',0,'t',c=>{c.clusterLimits.attestedCodas.push(['t','s']);c.clusterWeights={coda:{'t,s':0}};});
 add('non-final-only-weight',[],['a'],['k','s'],'coda',0,'t',c=>{c.clusterLimits.attestedCodas.push(['t','s']);c.clusterWeights={coda:{nonFinal:{'t,s':0}}};},undefined,form([],1,[{onset:['t'],nucleus:['a'],coda:[]}]));
 add('banned-coda',[],['a'],['k'],'coda',0,'s',c=>{c.codaConstraints.bannedCodas=['s'];});
 add('nucleus-length',[],['a','a'],[],'nucleus',0,'i');
 add('external-canonical-copy',[],['a'],['k'],'coda',0,'s',undefined,undefined,undefined,true);
 await save('probes.json',{scope:'Pure configured guard fixtures, not generated-word quality evidence. Input reference source is declared independently of the returned guard decision.',cases:rows});
 const after=await seal();assert.deepEqual(after,before);
 await save('complete.json',{passed:true,cases:rows.length,probes:await pin(join(out,'probes.json')),after});console.log(JSON.stringify({passed:true,cases:rows.length}));
}catch(error){await save('failure.json',{error:String(error),stack:error.stack});throw error;}
