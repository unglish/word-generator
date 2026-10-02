import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGenerator,createSeededRng,englishConfig} from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
import {englishSplitVowelSupports} from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/elements/graphemes/split-vowels.ts';
import {createBaseSpellingEvidenceVerifier} from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/core/spelling-evidence.ts';
const config={...englishConfig,splitVowels:{supports:englishSplitVowelSupports,routes:{syllable:{forms:['ae','ie','oe','ue','ye'],probability:95},word:{swaps:englishConfig.silentE.swaps,probability:35,monosyllableMultiplier:2}}},followingLetters:{targets:[{phoneme:'s',form:'c'},{phoneme:'s',form:'sc'},{phoneme:'dʒ',form:'g'}]}};
const g=createGenerator(config),verify=createBaseSpellingEvidenceVerifier(config),a=createSeededRng(20260927),b=createSeededRng(20260927);let na=0,nb=0,formations=0,affixed=0;
for(let i=0;i<500;i++){
 const options={morphology:i%2===0,mode:i%3?'lexicon':'text'};
 const on=g.generateWord({...options,trace:true,rand:()=>{na++;return a();}}),off=g.generateWord({...options,rand:()=>{nb++;return b();}});
 verify(on.trace.baseSpelling);formations+=on.trace.baseSpelling.split.constructions.length;affixed+=+(!!on.trace.morphology?.realization);
 assert.equal(on.trace.stages.filter(s=>s.name==='generatePronunciation').length,1);
 delete on.trace;assert.deepEqual(on,off);assert.equal(na,nb);
}
assert.equal(a(),b());assert.ok(formations>0);assert.ok(affixed>0);
const r={passed:true,comparisons:500,publicCalls:1000,draws:na,formations,affixed,nextProbe:true};writeFileSync('/private/tmp/q02-composed-parity.json',JSON.stringify(r));console.log(r);
