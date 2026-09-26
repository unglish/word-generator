import assert from 'node:assert/strict';
import {Session} from 'node:inspector/promises';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=process.cwd();const dir='/private/tmp/q13-cpu-profiles-v2';const sha=data=>createHash('sha256').update(data).digest('hex');
const frozen=JSON.parse(readFileSync(join(root,'evaluation/experiments/spelling-coverage/source-freeze.json'),'utf8'));
function check(){for(const f of frozen.sourceFiles)assert.equal(sha(readFileSync(join(root,f.file))),f.sha256);}
check();const api=await import(pathToFileURL(join(root,'src/index.ts')).href);
const legacy=api.createGenerator({...api.englishConfig,writtenFormConstraints:{...api.englishConfig.writtenFormConstraints,policy:undefined}});
const profiles=JSON.parse(readFileSync(join(dir,'metadata.json'),'utf8'));
const session=new Session();session.connect();await session.post('Profiler.enable');const reports=[];
for(const [id,selected,trace,batch] of [['active',api,false,true],['omitted',legacy,false,false],['traced',api,true,false]]){
const warm=api.createSeededRng(0);for(let i=0;i<50;i++)selected.generateWord({rand:warm});
const rand=api.createSeededRng(42);let words=[];
await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:false});
if(batch)words=selected.generateWords(10000,{seed:42});
else for(let i=0;i<10000;i++)words.push(selected.generateWord({rand,trace}));
const coverage=await session.post('Profiler.takePreciseCoverage');await session.post('Profiler.stopPreciseCoverage');
const spellingDigest=sha(JSON.stringify(words.map(w=>w.written.clean)));
const expected=profiles.reports.find(p=>p.id===(id==='active'?'active-batch-1':id==='omitted'?'omitted-retained-loop':'active-traced')).spellingDigest;assert.equal(spellingDigest,expected);
const file=join(dir,`call-counts-${id}.json`);writeFileSync(file,JSON.stringify(coverage),{flag:'wx'});
const record={id,count:10000,seed:42,trace,file,sha256:sha(readFileSync(file)),spellingDigest};reports.push(record);console.log(JSON.stringify(record));
}
session.disconnect();check();writeFileSync(join(dir,'call-counts-metadata.json'),JSON.stringify({sourceDigest:frozen.generatorDigest,node:process.version,mode:'V8 precise function coverage; diagnostic call counts, not a speed measurement',reports},null,2)+'\n',{flag:'wx'});
