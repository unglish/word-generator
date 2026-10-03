import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {installedDependencies} from './dependency-closure.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator';
const commit='52832cb7301bab6f52dffbf92a5b6980116bd747';
const out='/private/tmp/q11b-transaction-probes-v1';
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
 const load=path=>import(pathToFileURL(join(root,path)).href);
 const {englishConfig}=await load('src/index.ts');
 const {canonical}=await load('evaluation/quality/serialization.ts');
 const {buildClusterRuntime}=await load('src/core/cluster-runtime.ts');
 const {bindMorphophonemicGuard}=await load('src/core/morphophonemic-guard.ts');
 const {FinalPhones}=await load('src/core/final-phones.ts');
 const {TraceCollector}=await load('src/core/trace.ts');
 const {prepareMorphology,writeMorphology}=await load('src/core/morphology/attach.ts');
 const cases=[];
 const softening={name:'soften',replaceSound:'s',writtenMatch:/k$/,writtenReplace:'s'};
 function execute(id,config,rootWord,plan){
  const rt=buildClusterRuntime(config),trace=new TraceCollector();
  // Declared lexical-stage input references are restored from complete inventory metadata.
  const word=structuredClone(rootWord);
  for(const syllable of word.syllables)for(const segment of ['onset','nucleus','coda'])syllable[segment]=syllable[segment].map(phone=>{
   const known=rt.phonemeBySound.get(phone.sound);assert.deepEqual(canonical(known),canonical(phone));return known;
  });
  const ledger=new FinalPhones(),ids=ledger.register('root',word.syllables);
  trace.morphologyTrace={template:plan.template,syllableReduction:0,...(plan.prefix?{prefix:plan.prefix.written}:{}),...(plan.suffix?{suffix:plan.suffix.written}:{})};
  let draws=0;
  const context={word,trace,finalPhoneState:{ledger,ids},syllableCount:word.syllables.length,currSyllableIndex:0,rand:()=>{draws++;return 0.5;}};
  const prepared=prepareMorphology({config,evaluateMorphophonemicReplacement:bindMorphophonemicGuard(rt)},context,plan);
  assert(prepared);writeMorphology(context,prepared);
  cases.push({id,configuration:canonical(config),word:canonical({...context.word,trace:trace.toTrace(true)}),draws});
 }
 function add(id,coda,rules,prefix,mutate=()=>{}){
  const config=structuredClone(englishConfig);mutate(config);
  const suffix={type:'suffix',written:'x',phonemes:[],syllableCount:0,frequency:1,stressEffect:'none',morphophonemicRules:rules};
  config.morphology.suffixes=[suffix];if(prefix)config.morphology.prefixes=[prefix];
  const resolve=s=>config.phonemes.find(p=>p.sound===s);const word={syllables:[{onset:[],nucleus:[resolve('aʊ')],coda:coda.map(resolve)}],written:{clean:'ask',hyphenated:'ask'},pronunciation:''};
  execute(id,config,word,{template:prefix?'both':'suffixed',suffix,...(prefix?{prefix}:{})});
 }
 add('atomic-rejection',['s','k'],[softening]);
 add('accepted-softening',['k'],[softening]);
 add('ordered-reject-accept-reject',['s','k'],[{...softening,priority:1},{name:'stop-after-rejection',replaceSound:'t',priority:2},{...softening,name:'soften-after-acceptance',priority:3}]);
 add('condition-unmatched',['k'],[{...softening,phonologicalCondition:{position:'preceding',sounds:['g']}}]);
 add('identity-written-inventory',['k'],[{name:'identity',replaceSound:'k',writtenMatch:/k$/,writtenReplace:'z'},{name:'written',writtenMatch:/z$/,writtenReplace:'v'},{name:'unregistered',replaceSound:'q',writtenMatch:/v$/,writtenReplace:'q'}]);
 add('nucleus-coda-rejection',['ŋ'],[{name:'nuclear-change',target:'nucleus',replaceSound:'æ',writtenMatch:/k$/,writtenReplace:'v'}]);
 add('fallback-coda-accepted',['k','s','f'],[{name:'nuclear-replay-probe',target:'nucleus',replaceSound:'i:'}],undefined,c=>{delete c.clusterLimits.attestedOnsets;delete c.clusterLimits.attestedCodas;});
 const observed=JSON.parse(await readFile(join(root,'evaluation/experiments/morphophonemic-cluster-legality/observed-collision-roots.json'),'utf8'));
 for(const witness of observed){
  const config=structuredClone(englishConfig),plan={template:witness.template};
  for(const part of ['prefix','suffix'])if(witness.configurationIndices[part]!==undefined)plan[part]=config.morphology[part+'es'][witness.configurationIndices[part]];
  execute(`observed-${witness.policy}-${witness.profile}-${witness.drawIndex}`,config,witness.before,plan);
 }
 await save('probes.json',{scope:'Hand-built lexical-stage transaction fixtures plus authenticated archived lexical roots, not newly generated-word quality samples. Full public corpus capture/replay remains separate.',cases});
 const after=await seal();assert.deepEqual(after,before);
 await save('complete.json',{passed:true,cases:cases.length,probes:await pin(join(out,'probes.json')),after});console.log(JSON.stringify({passed:true,cases:cases.length}));
}catch(error){await save('failure.json',{error:String(error),stack:error.stack});throw error;}
