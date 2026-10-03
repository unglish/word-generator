import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { capturePreflight, validateRegistration } from './capture-preflight.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator';
const expectedCommit='11bdf6a90ed28e1aba09c40b3901c54c6308437f';
const registrationPath=new URL('./measurement.json',import.meta.url);
const registration=JSON.parse(await readFile(registrationPath));
const protocol=await readFile(root+'/evaluation/quality/protocol.json');
const args={root,expectedCommit,registrationPath,arm:'candidate',captureModuleUrl:pathToFileURL(root+'/evaluation/quality/capture.ts')};
test('authenticates exact candidate, protocol, profile and module root',async()=>{
 const value=await capturePreflight(args);
 assert.equal(value.protocol.wordsPerReplicate,10000);
 assert.equal(value.protocol.profiles.length,4);
});
test('rejects changed protocol, unregistered arms and populations',()=>{
 assert.throws(()=>validateRegistration(registration,Buffer.concat([protocol,Buffer.from(' ')]),'candidate'));
 assert.throws(()=>validateRegistration(registration,protocol,'control'));
 assert.throws(()=>validateRegistration({...registration,wordsPerArm:10000},protocol,'candidate'));
});
test('rejects wrong commits and cross-checkout static generator imports',async()=>{
 await assert.rejects(()=>capturePreflight({...args,expectedCommit:registration.controlCommit}));
 await assert.rejects(()=>capturePreflight({...args,captureModuleUrl:pathToFileURL('/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator/evaluation/quality/capture.ts')}));
});
