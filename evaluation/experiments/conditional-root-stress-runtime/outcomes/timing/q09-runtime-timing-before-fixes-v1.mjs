import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {trustedInputs} from '/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator/evaluation/experiments/conditional-root-stress-runtime/capture.mjs';
import {protectOutput} from '/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator/evaluation/experiments/conditional-root-stress-runtime/analyze.mjs';
import {canonical} from '/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator/evaluation/quality/serialization.ts';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePath=fileURLToPath(import.meta.url);
export async function measure(api,trace,clock=()=>performance.now()) {
 const report={attemptedWords:0,completedWords:0,attemptedApiCalls:0,completedApiCalls:0};
 const batch=(count,options)=>{report.attemptedWords+=count;report.attemptedApiCalls++;const words=api.generateWords(count,options);assert.equal(words.length,count);report.completedWords+=words.length;report.completedApiCalls++;return words;};
 const one=options=>{report.attemptedWords++;report.attemptedApiCalls++;const word=api.generateWord(options);report.completedWords++;report.completedApiCalls++;return word;};
 try {
  const firstStart=clock();batch(50,{seed:0,trace});
  const start=clock();const words=batch(10000,{seed:42,trace});report.batchMs=clock()-start;
  assert(Number.isFinite(report.batchMs)&&report.batchMs>0);report.wordsPerSecond=10000000/report.batchMs;
  report.firstTestMs=clock()-firstStart;
  report.wordBytesSha256=sha(JSON.stringify(words));
  const secondStart=clock();for(let i=0;i<50;i++)one({seed:900000+i,trace});
  report.trials=[];
  for(let trial=0;trial<3;trial++){
   const batches=[];
   for(let batchIndex=0;batchIndex<5;batchIndex++){
    const start=clock();for(let i=0;i<200;i++)one({seed:trial*100000+batchIndex*200+i,trace});
    const elapsed=clock()-start;assert(Number.isFinite(elapsed)&&elapsed>0);batches.push(elapsed);
   }
   report.trials.push({batchMs:batches,variance:Math.max(...batches)/Math.min(...batches)});
  }
  report.secondTestMs=clock()-secondStart;
  report.medianVariance=report.trials.map(x=>x.variance).sort((a,b)=>a-b)[1];
  assert.equal(report.completedWords,13100);assert.equal(report.completedApiCalls,3052);
  report.gates=trace?{status:'not-applicable-to-existing-untraced-gates'}:{status:'evaluated',throughput:report.wordsPerSecond>=4500,medianVariance:report.medianVariance<3,firstTestDeadline:report.firstTestMs<=20000,secondTestDeadline:report.secondTestMs<=20000};
  return {...report,completed:true};
 } catch(error){return {...report,completed:false,error:{name:error.name,message:error.message,stack:error.stack}};}
}
export async function run({variant,trace,out,expectedSelf}) {
 const root='/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator';
 const original='/private/tmp/q09-runtime-control-9e772f2-v1';
 const freeze='/private/tmp/q09-runtime-capture-freeze-v1.json';
 const expectedFreeze='c217a04a03b0613e1121283b95f5d16396d23182bc32a1e647e34728aa517b38';
 assert(['control','active'].includes(variant));assert(typeof trace==='boolean');assert.notEqual(process.env.CI,'true');
 assert.equal(sha(await readFile(sourcePath)),expectedSelf);await protectOutput(out,[root,original]);
 const options={root,original,freeze,expectedFreeze};const frozen=await trustedInputs(options);
 const module=await import(pathToFileURL(`${variant==='control'?original:root}/src/index.ts`));
 const config=structuredClone(module.englishConfig);
 if(variant==='control')delete config.pronunciation.stress.rootPattern;
 else config.pronunciation.stress.rootPattern=structuredClone(frozen.protocol.policy.active);
 assert.deepStrictEqual(canonical(config),frozen.configs[variant]);
 const api=module.createGenerator(config);const result=await measure(api,trace);
 let sourceIntegrityPassed=false,integrityError=null;
 try{await trustedInputs(options);assert.deepStrictEqual(canonical(config),frozen.configs[variant]);assert.equal(sha(await readFile(sourcePath)),expectedSelf);sourceIntegrityPassed=true;}
 catch(error){integrityError={name:error.name,message:error.message,stack:error.stack};}
 const report={schema:'q09-configured-timing-v1',variant,trace,sourceFreezeSha256:expectedFreeze,benchmarkSha256:expectedSelf,
  engine:frozen.engine,config:canonical(config),sourceIntegrityPassed,integrityError,...result};
 await writeFile(out,JSON.stringify(report)+'\n',{flag:'wx'});return report;
}
if(process.argv[1]&&resolve(process.argv[1])===sourcePath){
 const [variant,mode,out,expectedSelf]=process.argv.slice(2);assert.equal(process.argv.length,6);assert(['false','true'].includes(mode));
 const result=await run({variant,trace:mode==='true',out:resolve(out),expectedSelf});
 console.log({variant,trace:result.trace,completed:result.completed,sourceIntegrityPassed:result.sourceIntegrityPassed,wordsPerSecond:result.wordsPerSecond,gates:result.gates});
 if(!result.completed||!result.sourceIntegrityPassed)process.exitCode=1;
}
