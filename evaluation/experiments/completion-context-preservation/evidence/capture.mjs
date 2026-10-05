import assert from "node:assert/strict";
import {readFileSync,readdirSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {captureRun} from "/private/tmp/q14a-completion-context-v1/evaluation/quality/capture.ts";
import {englishConfig} from "/private/tmp/q14a-completion-context-v1/src/index.ts";
import {installedDependencies} from "/private/tmp/q14a-completion-context-v1/evaluation/experiments/phoneme-aware-doubling/dependency-closure.mjs";
const root="/private/tmp/q14a-completion-context-v1", evidence="/private/tmp/q14a-completion-context-evidence-v1";
const sha=b=>createHash("sha256").update(b).digest("hex");
function files(){const pins={};function walk(dir){for(const entry of readdirSync(root+"/"+dir,{withFileTypes:true})){const name=dir+"/"+entry.name;if(entry.isDirectory())walk(name);else if(entry.isFile()){const b=readFileSync(root+"/"+name);pins[name]={bytes:b.length,sha256:sha(b)};}else throw Error("Aliased source "+name);}}
for(const dir of ["src","evaluation/quality","scripts","data/cmu"])walk(dir);
for(const name of ["package.json","package-lock.json","tsconfig.json"]){const b=readFileSync(root+"/"+name);pins[name]={bytes:b.length,sha256:sha(b)};}return pins;}
const configuration=structuredClone({...englishConfig,splitVowels:JSON.parse(readFileSync(evidence+"/measured-configuration.json"))});
const protocol=JSON.parse(readFileSync(root+"/evaluation/quality/protocol.json"));
const before={sources:files(),dependencies:await installedDependencies(root),node:process.version,nodeExecutableSha256:sha(readFileSync(process.execPath)),configuration,protocol};
writeFileSync(evidence+"/capture-before.json",JSON.stringify(before,null,2)+"\n",{flag:"wx"});
const summary=await captureRun({root,out:evidence+"/candidate-archive",id:"completion-context-preservation-v1",cohort:"development",protocol,configuration,progress:console.log});
assert.equal(summary.profiles.reduce((n,p)=>n+p.words,0),200000);
assert.deepEqual(files(),before.sources);assert.deepEqual(await installedDependencies(root),before.dependencies);
writeFileSync(evidence+"/capture-complete.json",JSON.stringify({passed:true,words:200000,sourcePinsPreserved:true,manifestSha256:sha(readFileSync(evidence+"/candidate-archive/manifest.json"))},null,2)+"\n",{flag:"wx"});
