import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
const dir = resolve(process.argv[2]);
const { createSeededRng, generateWord } = await import(pathToFileURL(resolve('src/index.ts')).href);
const { ipaToArpabet } = await import(pathToFileURL(resolve('src/phonotactic/ipa-to-arpabet.ts')).href);
const protocol = JSON.parse(await readFile('evaluation/quality/protocol.json', 'utf8'));
const profile = protocol.profiles.find(entry => entry.id === 'lexicon-bare');
for (const seed of profile.seeds.development) {
  const records = [], firstWitness = new Map();
  const rand = createSeededRng(seed);
  for (let i=0; i<protocol.wordsPerReplicate; i++) {
    const word = generateWord({...profile.options, rand, trace:true});
    const root = word.lexical.root.map(s=>({stress:s.stress??null,slots:['onset','nucleus','coda'].map(k=>s[k].map(p=>[p.sound,ipaToArpabet(p.sound)]))}));
    const trace = word.trace;
    const structural = [...new Set(trace.structural.map(e=>e.event))];
    const repairs = [...new Set(trace.repairs.map(r=>r.rule))];
    for (const event of [...structural, ...repairs]) if (!firstWitness.has(event)) firstWitness.set(event, {seed, draw:i, event, spelling:word.written.clean, actual:root, trace});
    if (root.flatMap(s=>s.slots.flat()).some(([,token])=>token===null)) throw new Error('Unmapped probe phone, inspect sample');
    records.push(JSON.stringify({seed,draw:i,spelling:word.written.clean,root,structural,repairs}));
  }
  const bytes = Buffer.from(records.join('\n')+'\n');
  await writeFile(`${dir}/gold-${seed}.jsonl.gz`,gzipSync(bytes), {flag:'wx'});
  await writeFile(`${dir}/witness-${seed}.jsonl.gz`,gzipSync([...firstWitness.values()].map(r=>JSON.stringify(r)).join('\n')+'\n'), {flag:'wx'});
  console.log(JSON.stringify({seed,draws:records.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
}
