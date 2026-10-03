import assert from "node:assert/strict";
import {it as test} from "vitest";
import type {Phoneme,Syllable} from "../types.js";
import type {AffixForm} from "./morphology/realization.js";
import type {AffixSyllable} from "../config/language.js";
import type {MorphophonemicGuardRuntime,MorphophonemicGuardResult} from "./morphophonemic-guard.js";
import type {MorphophonemicTarget} from "./morphology-projection.js";
import {evaluateMorphophonemicReplacement} from "./morphophonemic-guard.js";
const definitions: Array<[string,Phoneme["mannerOfArticulation"],Phoneme["placeOfArticulation"],boolean]> = [
  ["s","sibilant","alveolar",false],["k","stop","velar",false],["t","stop","alveolar",false],
  ["p","stop","bilabial",false],["b","stop","bilabial",true],["n","nasal","alveolar",true],
  ["m","nasal","bilabial",true],["r","liquid","alveolar",true],["l","liquid","alveolar",true],
  ["a","lowVowel","central",true],["i","highVowel","front",true],
];
const phones:Phoneme[]=definitions.map(([sound,mannerOfArticulation,placeOfArticulation,voiced])=>({sound,mannerOfArticulation,placeOfArticulation,voiced,
  onset:["a","i"].includes(sound)?0:1,coda:["a","i"].includes(sound)?0:1,nucleus:["a","i"].includes(sound)?1:0,startWord:1,midWord:1,endWord:1}));
const bySound=new Map(phones.map(p=>[p.sound,p]));
const resolve=(sound:string):Phoneme=>{assert(bySound.has(sound));return bySound.get(sound)!;};
const syl=(onset:string[]=[],nucleus:string[]=["a"],coda:string[]=[]):Syllable=>({onset:onset.map(resolve),nucleus:nucleus.map(resolve),coda:coda.map(resolve)});
const form=(phonemes:string[]=[],syllableCount=0,syllables?:AffixSyllable[]):AffixForm=>({written:"x",phonemes,syllableCount,...(syllables?{syllables}:{})});
function runtime():MorphophonemicGuardRuntime{
  const onset=[["t","r"],["k","r"],["p","r"],["p","l"],["s","t"]],coda=[["s","k"],["s","t","s"],["k","s","t","s"],["n","t"],["m","p"]];
  const prefixes=(clusters:string[][])=>new Set(clusters.flatMap(parts=>parts.slice(1).map((_,i)=>parts.slice(0,i+1).join("|"))));
  return {config:{syllableStructure:{maxOnsetLength:3,maxCodaLength:3,maxNucleusLength:1},codaConstraints:{voicingAgreement:true,homorganicNasalStop:true}},
    phonemeBySound:bySound,positionPhonemes:Object.fromEntries(["onset","nucleus","coda"].map(position=>[position,phones.filter(p=>p[position]>0)])),
    sonorityLevels:new Map(phones.map(p=>[p,({stop:1,sibilant:2,nasal:3,liquid:4,lowVowel:5,highVowel:5} as Partial<Record<Phoneme["mannerOfArticulation"],number>>)[p.mannerOfArticulation]??0])),
    invalidClusterRegexes:{onset:null,coda:null,nucleus:null},clusterLimits:{maxOnset:3,maxCoda:3},codaAppendantSet:new Set(["s"]),
    attestedOnsetSet:new Set(onset.map(p=>p.join("|"))),attestedOnsetPrefixSet:prefixes(onset),
    attestedCodaSet:new Set(coda.map(p=>p.join("|"))),attestedCodaPrefixSet:prefixes(coda)};
}
const target=(segment:MorphophonemicTarget["segment"],index=0,syllableIndex=0):MorphophonemicTarget=>({syllableIndex,segment,index});
function check(root:readonly Syllable[],where:MorphophonemicTarget,next:string,rt=runtime(),prefix?:AffixForm,suffix?:AffixForm){return evaluateMorphophonemicReplacement(rt,root,where,resolve(next),prefix,suffix,resolve);}
function has(result:MorphophonemicGuardResult,reason:MorphophonemicGuardResult["rejections"][number]["reason"]){assert.equal(result.accepted,false);assert(result.rejections.some(row=>row.reason===reason),JSON.stringify(result));}
test("blocks observed root /sk/ to /ss/ without mutating the derivation",()=>{
  const root=[syl([],["a"],["s","k"])],before=structuredClone(root);
  has(check(root,target("coda",1),"s"),"repetition");assert.deepEqual(root,before);
});
test("retains licensed single-coda softening and separated /sts/ and /ksts/",()=>{
  assert(check([syl([],["a"],["k"])],target("coda"),"s").accepted);
  for(const coda of [["s","t","s"],["k","s","t","s"]])assert(check([syl([],["a"],coda)],target("nucleus"),"i").accepted);
});
test("both neighbours of an interior replacement are checked",()=>{
  has(check([syl([],["a"],["k","s","t","s"])],target("coda",1),"t"),"repetition");
});
test("custom onset substitutions use full attested onset licensing",()=>{
  has(check([syl(["t","r"])],target("onset",1),"s"),"attestation");
  assert(check([syl(["k","r"])],target("onset"),"p").accepted);
});
test("distinct flat-prefix/root and root/flat-suffix repetitions stay source-owned",()=>{
  const prefixed=check([syl(["r"])],target("onset"),"r",runtime(),form(["r"]));
  assert(prefixed.accepted);assert.equal(prefixed.boundaryRepetitionLicenses.length,1);
  assert.deepEqual(prefixed.boundaryRepetitionLicenses[0].members.map(member=>member.source.part),["prefix","root"]);
  const result=check([syl([],["a"],["k"])],target("coda"),"s",runtime(),undefined,form(["s"]));
  assert(result.accepted);assert.equal(result.assembledTarget.index,0);
});
test("nucleus replacement checks a mixed-source coda conflict",()=>{
  const rt=runtime();rt.bannedNucleusCodaMap=new Map([["i",new Set(["t"])]]);
  const result=check([syl()],target("nucleus"),"i",rt,undefined,form(["t"]));
  has(result,"nucleus-coda");assert(result.rejections.some(row=>row.parts.includes("suffix")));
});
test("aggregate coda features catch voicing/place conflicts across morphology domains",()=>{
  has(check([syl([],["a"],["k"])],target("coda"),"b",runtime(),undefined,form(["t"])),"voicing");
  has(check([syl([],["a"],["m"])],target("coda"),"n",runtime(),undefined,form(["p"])),"place");
});
test("selected syllabic affix boundary bans are checked before mutation",()=>{
  const rt=runtime();rt.bannedSet=new Set(["s|t"]);
  has(check([syl([],["a"],["k"])],target("coda"),"s",rt,undefined,form([],1,[{onset:["t"],nucleus:["a"],coda:[]}])),"boundary");
});
test("canonical position pool rejects an unavailable replacement",()=>{
  const rt=runtime();rt.positionPhonemes.coda=rt.positionPhonemes.coda.filter(p=>p.sound!=="s");
  has(check([syl([],["a"],["k"])],target("coda"),"s",rt),"inventory");
});
test("actual initial/final position includes selected flat affixes",()=>{
  const rt=runtime();rt.allowedFinalSet=new Set(["k"]);
  has(check([syl([],["a"],["k"])],target("coda"),"s",rt),"word-final");
  // Final restriction follows the actual final phone, not the original root edge.
  assert(check([syl([],["a"],["k"])],target("coda"),"s",rt,undefined,form(["k"])).accepted);
});
test("coda length and appendant status are evaluated on complete assembly",()=>{
  const rt=runtime();rt.clusterLimits!.maxCoda=1;
  has(check([syl([],["a"],["k"])],target("coda"),"t",rt,undefined,form(["k"])),"length");
});
test("invalid coordinates fail before any proposal is returned",()=>{
  assert.throws(()=>check([syl()],target("nucleus",9),"i"),/outside/);
});

test("mixed clusters still require attestation after source-domain checks",()=>{
  has(check([syl(["r"])],target("onset"),"s",runtime(),form(["p"])),"attestation");
});
test("a morpheme license cannot hide two duplicates within the root",()=>{
  const result=check([syl(["r","r"])],target("onset",1),"r",runtime(),form(["r"]));
  has(result,"repetition");
  assert.equal(result.boundaryRepetitionLicenses[0].members.length,2);
});

test("fallback pattern bans and weighted cluster suppression remain effective",()=>{
  const onsetRuntime=runtime();delete onsetRuntime.attestedOnsetSet;delete onsetRuntime.attestedOnsetPrefixSet;
  onsetRuntime.invalidClusterRegexes.onset=/kr/;
  has(check([syl(["p","r"])],target("onset"),"k",onsetRuntime),"pattern");
  const codaRuntime=runtime();codaRuntime.attestedCodaSet!.add("t|s");
  codaRuntime.clusterWeights={coda:new Map([["t,s",0]])};
  has(check([syl([],["a"],["k","s"])],target("coda"),"t",codaRuntime),"cluster-weight");
});
test("banned coda sounds and configured nucleus size remain enforced",()=>{
  const rt=runtime();rt.bannedCodaSet=new Set(["s"]);
  has(check([syl([],["a"],["k"])],target("coda"),"s",rt),"banned-coda");
  has(check([syl([],["a","a"])],target("nucleus"),"i"),"length");
});
test("unregistered replacement metadata cannot silently enter the assembly",()=>{
  const rt=runtime();const replacement={...resolve("s"),sound:"q"};
  has(evaluateMorphophonemicReplacement(rt,[syl([],["a"],["k"])],target("coda"),replacement,undefined,undefined,resolve),"inventory");
});
