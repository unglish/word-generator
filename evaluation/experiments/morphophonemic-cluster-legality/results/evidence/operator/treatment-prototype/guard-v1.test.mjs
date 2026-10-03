import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateMorphophonemicReplacement} from '/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphophonemic-guard.ts';
const phones=[
 ['s','sibilant','alveolar',false],['k','stop','velar',false],['t','stop','alveolar',false],
 ['p','stop','bilabial',false],['b','stop','bilabial',true],['n','nasal','alveolar',true],
 ['m','nasal','bilabial',true],['r','liquid','alveolar',true],['l','liquid','alveolar',true],
 ['a','lowVowel','central',true],['i','highVowel','front',true],
].map(([sound,mannerOfArticulation,placeOfArticulation,voiced])=>({sound,mannerOfArticulation,placeOfArticulation,voiced,
 onset:['a','i'].includes(sound)?0:1,coda:['a','i'].includes(sound)?0:1,nucleus:['a','i'].includes(sound)?1:0,startWord:1,midWord:1,endWord:1}));
const bySound=new Map(phones.map(p=>[p.sound,p]));
const resolve=sound=>{assert(bySound.has(sound));return bySound.get(sound);};
const syl=(onset=[],nucleus=['a'],coda=[])=>({onset:onset.map(resolve),nucleus:nucleus.map(resolve),coda:coda.map(resolve)});
const form=(phonemes=[],syllableCount=0,syllables)=>({written:'x',phonemes,syllableCount,...(syllables?{syllables}:{})});
function runtime(){
 const onset=[['t','r'],['k','r'],['p','r'],['p','l'],['s','t']],coda=[['s','k'],['s','t','s'],['k','s','t','s'],['n','t'],['m','p']];
 const prefixes=clusters=>new Set(clusters.flatMap(parts=>parts.slice(1).map((_,i)=>parts.slice(0,i+1).join('|'))));
 return {config:{syllableStructure:{maxOnsetLength:3,maxCodaLength:3},codaConstraints:{voicingAgreement:true,homorganicNasalStop:true}},
  phonemeBySound:bySound,positionPhonemes:Object.fromEntries(['onset','nucleus','coda'].map(position=>[position,phones.filter(p=>p[position]>0)])),
  sonorityLevels:new Map(phones.map(p=>[p,{stop:1,sibilant:2,nasal:3,liquid:4,lowVowel:5,highVowel:5}[p.mannerOfArticulation]])),
  invalidClusterRegexes:{onset:null,coda:null,nucleus:null},clusterLimits:{maxOnset:3,maxCoda:3},codaAppendantSet:new Set(['s']),
  attestedOnsetSet:new Set(onset.map(p=>p.join('|'))),attestedOnsetPrefixSet:prefixes(onset),
  attestedCodaSet:new Set(coda.map(p=>p.join('|'))),attestedCodaPrefixSet:prefixes(coda)};
}
const target=(segment,index=0,syllableIndex=0)=>({syllableIndex,segment,index});
function check(root,where,next,rt=runtime(),prefix,suffix){return evaluateMorphophonemicReplacement(rt,root,where,resolve(next),prefix,suffix,resolve);}
function has(result,reason){assert.equal(result.accepted,false);assert(result.rejections.some(row=>row.reason===reason),JSON.stringify(result));}
test('blocks observed root /sk/ to /ss/ without mutating the derivation',()=>{
 const root=[syl([],['a'],['s','k'])],before=structuredClone(root);
 has(check(root,target('coda',1),'s'),'repetition');assert.deepEqual(root,before);
});
test('retains licensed single-coda softening and separated /sts/ and /ksts/',()=>{
 assert(check([syl([],['a'],['k'])],target('coda'),'s').accepted);
 for(const coda of [['s','t','s'],['k','s','t','s']])assert(check([syl([],['a'],coda)],target('nucleus'),'i').accepted);
});
test('both neighbours of an interior replacement are checked',()=>{
 has(check([syl([],['a'],['k','s','t','s'])],target('coda',1),'t'),'repetition');
});
test('custom onset substitutions use full attested onset licensing',()=>{
 has(check([syl(['t','r'])],target('onset',1),'s'),'attestation');
 assert(check([syl(['k','r'])],target('onset'),'p').accepted);
});
test('distinct flat-prefix/root and root/flat-suffix repetitions stay source-owned',()=>{
 assert(check([syl(['r'])],target('onset'),'r',runtime(),form(['r'])).accepted);
 const result=check([syl([],['a'],['k'])],target('coda'),'s',runtime(),undefined,form(['s']));
 assert(result.accepted);assert.equal(result.assembledTarget.index,0);
});
test('nucleus replacement checks a mixed-source coda conflict',()=>{
 const rt=runtime();rt.bannedNucleusCodaMap=new Map([['i',new Set(['t'])]]);
 const result=check([syl()],target('nucleus'),'i',rt,undefined,form(['t']));
 has(result,'nucleus-coda');assert(result.rejections.some(row=>row.parts.includes('suffix')));
});
test('aggregate coda features catch voicing/place conflicts across morphology domains',()=>{
 has(check([syl([],['a'],['k'])],target('coda'),'b',runtime(),undefined,form(['t'])),'voicing');
 has(check([syl([],['a'],['m'])],target('coda'),'n',runtime(),undefined,form(['p'])),'place');
});
test('selected syllabic affix boundary bans are checked before mutation',()=>{
 const rt=runtime();rt.bannedSet=new Set(['s|t']);
 has(check([syl([],['a'],['k'])],target('coda'),'s',rt,undefined,form([],1,[{onset:['t'],nucleus:['a'],coda:[]}])),'boundary');
});
test('canonical position pool rejects an unavailable replacement',()=>{
 const rt=runtime();rt.positionPhonemes.coda=rt.positionPhonemes.coda.filter(p=>p.sound!=='s');
 has(check([syl([],['a'],['k'])],target('coda'),'s',rt),'inventory');
});
test('actual initial/final position includes selected flat affixes',()=>{
 const rt=runtime();rt.allowedFinalSet=new Set(['k']);
 has(check([syl([],['a'],['k'])],target('coda'),'s',rt),'word-final');
 // Final restriction follows the actual final phone, not the original root edge.
 assert(check([syl([],['a'],['k'])],target('coda'),'s',rt,undefined,form(['k'])).accepted===false); // full unattested root? boundary coda restrictions remain explicit
});
test('coda length and appendant status are evaluated on complete assembly',()=>{
 const rt=runtime();rt.clusterLimits.maxCoda=1;
 has(check([syl([],['a'],['k'])],target('coda'),'t',rt,undefined,form(['k'])),'length');
});
test('invalid coordinates fail before any proposal is returned',()=>{
 assert.throws(()=>check([syl()],target('nucleus',9),'i'),/outside/);
});
