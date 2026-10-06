import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createGenerator,englishConfig} from '/private/tmp/q14a-completion-joint-neighbor-v2/src/index.ts';
import {createGenerator as oldGenerator,englishConfig as oldConfig} from '/private/tmp/q14a-completion-isolated-u-v1/src/index.ts';
const capture=JSON.parse(readFileSync('/private/tmp/q14a-second-case-rng-capture.json','utf8'));
const splitVowels=JSON.parse(readFileSync('/private/tmp/q14a-completion-joint-neighbor-evidence-v2/measured-configuration.json','utf8'));
const preamble=capture.tape.slice(0,capture.boundaries[0]).map(x=>x.value);
const attempt=capture.tape.slice(capture.boundaries[19]).map(x=>x.value);
const control=oldGenerator({...oldConfig,splitVowels}),candidate=createGenerator({...englishConfig,splitVowels});
function diagnose(generator,joint){let i=0;const tape=[];const rand=()=>{const extra=joint&&new Error().stack.includes('spelling-completion-planner.ts:63:');const v=extra?0:(i<preamble.length?preamble[i++]:attempt[(i++-preamble.length)%attempt.length]);tape.push(v);return v;};const word=generator.generateWord({mode:'lexicon',morphology:false,trace:true,rand});return {word,tape};}
const red=diagnose(control,false),green=diagnose(candidate,true);
console.log(JSON.stringify({red:red.word.written.clean,green:green.word.written.clean,redAttempts:red.word.trace.attempts,greenAttempts:green.word.trace.attempts,redDraws:red.tape.length,greenDraws:green.tape.length}));
function replay(generator,tape){let i=0;const word=generator.generateWord({mode:'lexicon',morphology:false,trace:true,rand:()=>{assert(i<tape.length);return tape[i++];}});assert.equal(i,tape.length);return word;}
assert.deepEqual(replay(control,red.tape),red.word);assert.deepEqual(replay(candidate,green.tape),green.word);
assert.equal(red.word.written.clean,'sulkicmarened');assert.equal(green.word.written.clean,'shoolkicmarened');
assert.deepEqual(green.word.trace.baseSpelling.phones.map(p=>p.soundAtSpelling),red.word.trace.baseSpelling.phones.map(p=>p.soundAtSpelling));
assert(green.word.trace.baseSpelling.completion.certificates.some(c=>c.neighborReplacements?.length));
writeFileSync('/private/tmp/q14a-second-case-public-replay.json',JSON.stringify({scope:'Public API deterministic retained-attempt fixtures using separately frozen RNG tapes; candidate inserts explicit joint draw0. Not identical seed stream or corpus causal comparison.',sourceSeed:capture.seed,sourceDrawIndex:capture.drawIndex,sourceAttempt:19,preamble,retainedAttempt:attempt,red,green},null,2)+'\n');
