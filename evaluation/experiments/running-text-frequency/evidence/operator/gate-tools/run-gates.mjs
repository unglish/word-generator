import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {installedDependencies} from '../dependency-closure.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const head='2144c816efaec4005911e774288258c0ed25f77a';
const toolsDir=dirname(fileURLToPath(import.meta.url));
const out='/private/tmp/q19-gates-v1';
const node=process.execPath;
const npm='/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/npm';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pin(path){const bytes=await readFile(path);return{bytes:bytes.length,sha256:hash(bytes)};}
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const toolNames=['run-gates.mjs','generator.ts','text-generator.ts','quality.test.ts','generate.perf.test.ts','generate-text.perf.test.ts',
 'quality.config.ts','perf.config.ts','text-perf.config.ts','binding-registration.json','batching-amendment.json','preflight.mjs','../dependency-closure.mjs'];
async function seal(){
 assert.equal(git('rev-parse','HEAD'),head);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 for(const key of ['QUALITY_GATE_SAMPLE_SIZE','QUALITY_MODE_SAMPLE_SIZE','QUALITY_HEARTBEAT_EVERY','CI','NODE_OPTIONS','NODE_PATH','ESBUILD_BINARY_PATH','TSX_TSCONFIG_PATH'])assert(!process.env[key],`Unregistered override ${key}`);
 return{head,tracked:Object.fromEntries(await Promise.all(git('ls-files','-z').split('\0').filter(Boolean).map(async path=>[path,await pin(join(root,path))]))),
  tools:Object.fromEntries(await Promise.all(toolNames.map(async name=>[name,await pin(join(toolsDir,name))]))),
  dependencies:await installedDependencies(root,['tsx','vitest','typescript']),toolDependencies:await installedDependencies(toolsDir,['vitest']),
  node:{path:await realpath(node),...await pin(node)},npm:await pin(npm),
  fit:await pin('/private/tmp/q19-registered-fit-v1/artifact.json'),
  environment:Object.fromEntries(Object.entries(process.env).map(([key,value])=>[key,hash(value)]))};
}
async function distPins(){
 const files={};
 async function visit(path,relative=''){
  for(const entry of await readdir(path,{withFileTypes:true})){
   const name=relative?relative+'/'+entry.name:entry.name;
   if(entry.isDirectory())await visit(join(path,entry.name),name);else files[name]=await pin(join(path,entry.name));
  }
 }
 try{await visit(join(root,'dist'));return files;}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
await mkdir(out);
const save=(name,value)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const initial=await seal();await save('initial.json',initial);
const results=[];
let compileSucceeded=false;
async function reportState(file){try{const path=join(root,file);return{...await pin(path),modified:(await stat(path)).mtimeMs};}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function run(name,command,args,env={},needsDist=false){
 const before=await seal();assert.deepEqual(before,initial);
 const compiledBefore=needsDist?await distPins():null;
 const reportFiles=[...(name.includes('quality')?['quality-report.json']:[]),...(name==='original-trigrams'?['memory/trigram-2m-analysis.json','memory/trigram-2m-analysis.md']:[])];
 const reportsBefore=Object.fromEntries(await Promise.all(reportFiles.map(async file=>[file,await reportState(file)])));
 await save(name+'-before.json',{before,compiledBefore,reportsBefore,compiledSourceEligible:needsDist?compileSucceeded:null,command:[command,...args],environmentOverrides:env});
 const child=spawn(command,args,{cwd:root,env:{...process.env,PATH:'/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin:'+process.env.PATH,...env},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',bytes=>{log+=bytes;});child.stderr.on('data',bytes=>{log+=bytes;});
 const outcome=await new Promise(resolve=>{child.on('error',error=>resolve({code:null,signal:null,startError:String(error)}));child.on('close',(code,signal)=>resolve({code,signal}));});
 await writeFile(join(out,name+'.log'),log,{flag:'wx'});
 const after=await seal();assert.deepEqual(after,before);
 if(needsDist)assert.deepEqual(await distPins(),compiledBefore);
 const record={name,compiledSourceEligible:needsDist?compileSucceeded:null,command:[command,...args],environmentOverrides:env,...outcome,log:await pin(join(out,name+'.log'))};
 // Preserve each emitted report before the next command overwrites its conventional output.
 for(const file of reportFiles){
  try{const bytes=await readFile(join(root,file));const destination=name+'-'+file.replaceAll('/','-');await writeFile(join(out,destination),bytes,{flag:'wx'});record[destination]={...await pin(join(out,destination)),state:JSON.stringify(await reportState(file))===JSON.stringify(reportsBefore[file])?'unchanged-existing-report':'created-or-modified-report'};}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 results.push(record);await save(name+'-after.json',{after,compiledAfter:needsDist?await distPins():null,record});
 await writeFile(join(out,'progress.json'),JSON.stringify(results,null,2)+'\n');console.log(`${name}: exit ${outcome.code}`);return record;
}
// These commands exercise unchanged default APIs. The explicit-config bindings below are separate.
await run('original-unit',npm,['test']);
compileSucceeded=(await run('compile-diagnostics',node,[join(root,'node_modules/typescript/bin/tsc')])).code===0;
await run('original-quality',npm,['run','test:quality']);
for(const arm of ['control','candidate'])await run('configured-quality-'+arm,node,[join(root,'node_modules/vitest/vitest.mjs'),'run','--config',join(toolsDir,'quality.config.ts')],{Q19_GATE_ARM:arm});
await run('original-trigrams',npm,['run','analyze:trigrams'],{},true);
await run('original-trace',npm,['run','audit:trace'],{},true);
// Caller must launch this workflow only after all thread-owned capture/replay jobs have terminated.
await run('original-performance',npm,['run','test:perf']);
for(let pair=1;pair<=6;pair++)for(const mode of ['lexicon','text'])for(const arm of ['control','candidate']){
 const config=mode==='text'?'text-perf.config.ts':'perf.config.ts';
 await run(`pair-${pair}-${mode}-${arm}`,node,[join(root,'node_modules/vitest/vitest.mjs'),'run','--config',join(toolsDir,config),'--reporter=verbose'],{Q19_GATE_ARM:arm});
}
await save('complete.json',{passed:true,scope:'Execution and provenance complete; individual gate failures retained and must be reported separately.',results,after:await seal()});
