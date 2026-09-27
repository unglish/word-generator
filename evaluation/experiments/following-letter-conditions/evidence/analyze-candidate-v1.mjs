import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {englishConfig} from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
import {analyzeFollowing} from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/evaluation/experiments/following-letter-conditions/analyze-following.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator';
const archive='/private/tmp/q14b-following-letters-candidate-v1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const complete=JSON.parse(await readFile(archive+'-freeze/complete.json'));
assert.equal(complete.passed,true);assert.equal(complete.words,200000);
const beforeBytes=await readFile(archive+'-freeze/before.json');
assert.equal(sha(beforeBytes),complete.beforeSha256);
const before=JSON.parse(beforeBytes);
const manifestBytes=await readFile(archive+'/manifest.json');
assert.equal(sha(manifestBytes),complete.manifest.sha256);
assert.equal(manifestBytes.length,complete.manifest.bytes);
const registrationBytes=await readFile(root+'/evaluation/experiments/following-letter-conditions/measurement.json');
assert.equal(sha(registrationBytes),before.registrationSha256);
const registration=JSON.parse(registrationBytes);
for(const [name,pin] of Object.entries(before.before.files.src)) {
 const bytes=await readFile(root+'/src/'+name);assert.equal(sha(bytes),pin.sha256,name);assert.equal(bytes.length,pin.bytes,name);
}
const configuration={...englishConfig,splitVowels:registration.splitVowels,followingLetters:registration.followingLetters};
await analyzeFollowing({root,archive,out:'/private/tmp/q14b-candidate-analysis-v1',manifestSha256:complete.manifest.sha256,configuration});
