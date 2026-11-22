import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const api = await import(pathToFileURL(resolve(process.argv[2] ?? ".", "src/index.ts")).href);
const {createSeededRng} = await import(pathToFileURL(resolve("src/utils/random.ts")).href);
const phones = new Set(["ʃ","t","ŋ","ə","ʌ","z"]);
const soundTotals = {};
const affixSources = {};
const codaLengths = {};
const codaKeys = {};
function tally(table, key, amount=1) { table[key]=(table[key]??0)+amount; }
function count(group, phonemes) {
  const entry = soundTotals[group] ??= {};
  for (const p of phonemes) {
    tally(entry, "all");
    if (phones.has(p)) tally(entry, p === "ʌ" ? "ə" : p);
  }
}
for (const morphology of [false,true]) {
 const rand = createSeededRng(morphology ? 42 : 7);
 for(let i=0;i<40000;i++){
  const word=api.generateWord({rand,mode:"lexicon",morphology,trace:true});
  const trace=word.trace;
  const root=trace.stages.find(s=>s.name==="repairNucleusWordPositions").after;
  const lengths = codaLengths[morphology?"finished":"bare"] ??= {};
  const coda=root.at(-1).coda;
  tally(lengths,coda.length);
  if(!morphology && coda.length>1)tally(codaKeys,coda.join(" "));
  if(!morphology)continue;
  const affixes=trace.morphology?.realization;
  for(const syllable of root){
    for(const part of ["onset","nucleus","coda"]) count("root."+part,syllable[part]);
  }
  count("rootFinalCoda",coda);
  count("prefix",affixes?.prefix?.resolved.phonemes??[]);
  const planned=trace.morphology?.suffix;
  if(planned && affixes?.suffix){
   count("suffix",affixes.suffix.resolved.phonemes);
   const entry=affixSources[planned] ??= {};
   tally(entry,"uses");
   for(const p of affixes.suffix.resolved.phonemes) if(phones.has(p))tally(entry,p);
  }
 }
}
console.log(JSON.stringify({soundTotals,codaLengths,codaKeys,affixSources}));
