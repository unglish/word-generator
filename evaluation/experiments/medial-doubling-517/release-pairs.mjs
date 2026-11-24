import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
const {generateWord: base}=await import(pathToFileURL(process.argv[2]).href);
const {generateWord: candidate}=await import(pathToFileURL(process.argv[3]).href);
const short={æ:"AE",ɛ:"EH",ɪ:"IH",ʌ:"AH"};
const dict=new Set(readFileSync("/usr/share/dict/words","utf8").toLowerCase().split(/\r?\n/));
const result={2:[],3:[]}, seen=new Set();
for(let seed=1;seed<=30000;seed++){
 for (const syllables of [2,3]){
  if(result[syllables].length>=25)continue;
  const opts={seed,syllableCount:syllables,mode:"lexicon",morphology:false,trace:true};
  const y=candidate(opts);
  const edits=y.trace.baseSpelling.edits.filter(e=>e.rule==="medialOnsetDoubling");
  if(edits.length!==1 || seen.has(y.written.clean)||dict.has(y.written.clean))continue;
  const [edit]=edits;
  const origin=edit.input[0].origin;
  assert.equal(origin.kind,"selection");
  const phone=y.trace.baseSpelling.phones[y.trace.baseSpelling.units[origin.unitId].phoneIds[0]];
  if(phone.syllableIndex!==1)continue;
  const x=base(opts);
  if(seen.has(x.written.clean)||dict.has(x.written.clean))continue;
  assert.deepEqual(x.lexical,y.lexical);
  assert.deepEqual(x.trace.selection,y.trace.selection);
  assert.equal(x.pronunciation,y.pronunciation);
  const offset=edit.start;
  assert.equal(y.written.clean,x.written.clean.slice(0,offset)+x.written.clean[offset]+x.written.clean.slice(offset));
  const expected=short[x.syllables[0].nucleus[0].sound];
  assert.ok(expected);
  result[syllables].push({before:x.written.clean,after:y.written.clean,ipa:x.pronunciation,syllables,
    stratum:String(syllables),expected,seed,offset,letter:edit.before});
  seen.add(x.written.clean);
  seen.add(y.written.clean);
 }
 if(result[2].length===25 && result[3].length===25)break;
}
const pairs=[...result[2],...result[3]];
assert.equal(pairs.length,50);
console.log(JSON.stringify(pairs,null,2));
