import { analyzeSplit } from '/private/tmp/q14a-completion-context-v1/evaluation/experiments/split-digraphs/analyze-split.mjs';
import { englishConfig } from '/private/tmp/q14a-completion-context-v1/src/index.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='/private/tmp/q14a-completion-context-v1',base='/private/tmp/q14a-completion-context-evidence-v1';
const archive=base+'/candidate-archive';
const configuration=structuredClone({...englishConfig,splitVowels:JSON.parse(readFileSync(base+'/measured-configuration.json'))});
await analyzeSplit({root,archive,out:base+'/candidate-analysis',manifestSha256:createHash('sha256').update(readFileSync(archive+'/manifest.json')).digest('hex'),configuration});
