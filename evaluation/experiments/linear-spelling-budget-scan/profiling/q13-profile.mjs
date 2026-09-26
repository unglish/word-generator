import assert from 'node:assert/strict';
import {Session} from 'node:inspector/promises';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=process.cwd();
const output='/private/tmp/q13-cpu-profiles-v2';mkdirSync(output,{recursive:true});
const frozen=JSON.parse(readFileSync(join(root,'evaluation/experiments/spelling-coverage/source-freeze.json'),'utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
function checkSources(){for(const file of frozen.sourceFiles)assert.equal(sha(readFileSync(join(root,file.file))),file.sha256,file.file);}
checkSources();
const api=await import(pathToFileURL(join(root,'src/index.ts')).href);
const legacy=api.createGenerator({...api.englishConfig,writtenFormConstraints:{...api.englishConfig.writtenFormConstraints,policy:undefined}});
const session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:1000});
const cases=[
{id:'active-batch-1',batch:true,api,options:{seed:42}},
{id:'omitted-retained-loop',batch:false,retain:true,api:legacy,options:{}},
{id:'active-batch-2',batch:true,api,options:{seed:42}},
{id:'active-traced',batch:false,api,options:{trace:true}},
{id:'active-monosyllables',batch:false,api,options:{syllableCount:1,morphology:false}},
];
const reports=[];
for(const entry of cases){
const warm=api.createSeededRng(0);for(let i=0;i<50;i++)entry.api.generateWord({rand:warm});
const rand=api.createSeededRng(42);let calls=0;let certificates=0;let visited=0;
let words=entry.retain?[]:undefined;let spellings=[];
await session.post('Profiler.start');
if(entry.batch){words=entry.api.generateWords(10000,entry.options);}
else {for(let i=0;i<10000;i++){const word=entry.api.generateWord({...entry.options,rand:()=>{calls++;return rand();}});if(entry.retain)words.push(word);else spellings.push(word.written.clean);certificates+=word.trace?.baseSpelling?.certificates?.length??0;visited+=(word.trace?.spellingBudgets??[]).reduce((sum,e)=>sum+e.visitedAssignments,0);}}
const {profile}=await session.post('Profiler.stop');
if(words)spellings=words.map(word=>word.written.clean);
const filename=join(output,entry.id+'.cpuprofile');writeFileSync(filename,JSON.stringify(profile),{flag:'wx'});
const report={id:entry.id,mode:entry.batch?'public generateWords batch':'public generateWord continuous RNG',count:10000,seed:42,options:entry.options,trace:!!entry.options.trace,profileFile:filename,sha256:sha(readFileSync(filename)),samples:profile.samples?.length,calls:entry.batch?null:calls,certificates,visitedAssignments:visited,spellingDigest:sha(JSON.stringify(spellings)),sampleDurationMicros:profile.endTime-profile.startTime};reports.push(report);console.log(JSON.stringify(report));
}
session.disconnect();checkSources();
assert.equal(reports[0].spellingDigest,reports[2].spellingDigest);
writeFileSync(join(output,'metadata.json'),JSON.stringify({sourceDigest:frozen.generatorDigest,node:process.version,samplingIntervalMicros:1000,warning:'Diagnostic CPU samples; profile durations include profiling overhead and are not isolated benchmarks.',reports},null,2)+'\n',{flag:'wx'});
