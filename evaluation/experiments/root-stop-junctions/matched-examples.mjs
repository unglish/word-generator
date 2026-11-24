import assert from "node:assert/strict";
import { resolve } from "node:path";

const { generateWord: baseline } = await import(resolve(process.argv[2], "src/index.ts"));
const { generateWord: candidate } = await import(resolve("src/index.ts"));
const stopPairs = new Set(["m.t","m.d","n.p","n.k","n.g","t.p","t.k","d.g"]);
const velar = new Set(["ŋ.k","ŋ.g"]);
function junction({ lexical }) {
  const [left,right] = lexical.root;
  if (left.coda.length !== 1 || right.onset.length !== 1) return "";
  return left.coda[0].sound + "." + right.onset[0].sound;
}
function lexicalPhonemes(word) {
  return word.lexical.root.flatMap(({onset,nucleus,coda}) => [
    ...onset.map(p=>p.sound),"|",...nucleus.map(p=>p.sound),"|",...coda.map(p=>p.sound),"|",
  ]);
}
const groups = {};
for(let seed=3000000;seed<3020000;seed++){
  const options={seed,mode:"lexicon",syllableCount:2,morphology:false};
  const from=baseline(options), to=candidate(options);
  const before=junction(from), after=junction(to);
  if(!before || !after || before===after || !stopPairs.has(before) && !velar.has(after)) continue;
  if(stopPairs.has(after)) continue;
  const a=lexicalPhonemes(from), b=lexicalPhonemes(to);
  if(a.length!==b.length || a.filter((value,index)=>value!==b[index]).length!==1) continue;
  const pair = stopPairs.has(before) ? before : after;
  groups[pair]=(groups[pair]??0)+1;
  if(groups[pair]>3) continue;
  const tracedFrom=baseline({...options,trace:true}), tracedTo=candidate({...options,trace:true});
  assert.equal(tracedFrom.written.clean,from.written.clean);
  assert.equal(tracedTo.written.clean,to.written.clean);
  const summary=(word)=>({
    word:word.written.clean,ipa:word.pronunciation,
    proposal:word.trace.stages.find(({name})=>name==="generateSyllables").after,
  });
  console.log(JSON.stringify({seed,before,after,baseline:summary(tracedFrom),candidate:summary(tracedTo)}));
}
console.error(JSON.stringify(groups));
