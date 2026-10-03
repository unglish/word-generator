import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator';
const out='/private/tmp/q11b-replay-identity-probe-v1';await mkdir(out);
const {createGenerator,englishConfig}=await import(pathToFileURL(root+'/src/index.ts'));
const {replayMorphologyPreparation}=await import(pathToFileURL(root+'/src/core/morphology/preparation-evidence.ts'));
const {createSeededRng}=await import(pathToFileURL(root+'/src/utils/random.ts'));
const {canonical}=await import(pathToFileURL(root+'/evaluation/quality/serialization.ts'));
const config=structuredClone(englishConfig);
delete config.clusterLimits.attestedOnsets;delete config.clusterLimits.attestedCodas;
config.morphology.suffixes=[{type:'suffix',written:'x',phonemes:[],syllableCount:0,stressEffect:'none',frequency:1,morphophonemicRules:[{name:'nuclear-replay-probe',target:'nucleus',replaceSound:'i:'}]}];
for(const mode of ['lexicon','text'])config.morphology.templateWeights[mode]={bare:0,prefixed:0,suffixed:1,both:0};
const generator=createGenerator(config),rand=createSeededRng(20261005);let checked=0,found=false;
await writeFile(out+'/configuration.json',JSON.stringify(canonical(config),null,2)+'\n',{flag:'wx'});
for(let index=0;index<1000;index++){
 const word=generator.generateWord({rand,trace:true});checked++;
 try{replayMorphologyPreparation(word,config);}catch(error){
  await writeFile(out+'/witness.json',JSON.stringify({drawIndex:index,word,error:String(error)},null,2)+'\n',{flag:'wx'});
  found=true;break;
 }
}
const files={};for(const name of ['configuration.json',...(found?['witness.json']:[])]){const bytes=await readFile(out+'/'+name);files[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
await writeFile(out+'/complete.json',JSON.stringify({completed:true,checked,replayFailureObserved:found,files,scope:'Bounded developmental public-API reproducer for configuration without attested clusters; not a population rate or corpus gate.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checked,replayFailureObserved:found}));
