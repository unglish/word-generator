import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { englishConfig } from '../../../src/index.ts';
import { captureRun } from '../../quality/capture.ts';
import { analyzeSplit } from './analyze-split.mjs';

test('bounded archive analysis verifies coordinates and config authority', async t => {
  const root = resolve(import.meta.dirname, '../../..');
  const directory = await mkdtemp(join(tmpdir(), 'q14a-analyze-')); t.after(() => rm(directory, {recursive:true,force:true}));
  const {splitVowels} = JSON.parse(await readFile(join(root,'evaluation/experiments/split-digraphs/measurement.json')));
  const configuration = {...englishConfig,splitVowels}; const archive=join(directory,'archive');
  const protocol={schemaVersion:1,id:'q14a-bounded',wordsPerReplicate:8,reviewDrawsPerReplicate:2,profiles:[{id:'bare',options:{mode:"lexicon",morphology:false},seeds:{development:[129,130],validation:[999,1000]}}]};
  await captureRun({root,out:archive,id:'q14a-bounded',cohort:'development',protocol,configuration});
  const manifestSha256=createHash('sha256').update(await readFile(join(archive,'manifest.json'))).digest('hex');
  const report=await analyzeSplit({root,archive,out:join(directory,'analysis'),manifestSha256,configuration});
  assert.equal(report.words,16);assert.equal(report.groups.find(group=>group.dimensions[0]==='all').counts.words,16);
  assert.equal(JSON.parse(await readFile(join(directory,'analysis/complete.json'))).passed,true);
  await assert.rejects(analyzeSplit({root,archive,out:join(directory,'bad'),manifestSha256,configuration:englishConfig}),/configuration/);
  await assert.rejects(analyzeSplit({root,archive,out:join(directory,'wrong'),manifestSha256:'0'.repeat(64),configuration}),/authority/);
});
