import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip, gzipSync } from 'node:zlib';
import { readRun } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/quality/capture.ts';
import { canonical } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/quality/serialization.ts';
import { createSplitObserver } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/experiments/split-digraphs/observe-split.ts';
import { treePins, executionEnvironment } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/experiments/split-digraphs/freeze-capture.mjs';
import { installedDependencies } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/experiments/phoneme-aware-doubling/dependency-closure.mjs';
import { regularArtifact } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/experiments/aligned-shared-graphemes/analyze-shared.mjs';
import { groupKeys } from '/private/tmp/q14a-completion-prefix-context-v1/evaluation/experiments/phoneme-aware-doubling/aggregate-doubling.mjs';

const sha = data => createHash('sha256').update(data).digest('hex');
function merge(target, values) {
  for (const [key, amount] of Object.entries(values)) {
    assert(Number.isSafeInteger(amount) && amount >= 0);
    target[key] = (target[key] ?? 0) + amount;
    assert(Number.isSafeInteger(target[key]));
  }
}
async function rows(path, consume) {
  await pipeline(createReadStream(path), createGunzip(), async source => {
    source.setEncoding('utf8'); let pending = '';
    for await (const chunk of source) {
      pending += chunk; let end;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        assert(line.length, 'Empty archive row'); consume(JSON.parse(line));
      }
    }
    assert.equal(pending, '', 'Unterminated archive row');
  });
}

/** Offline, read-only generation archive analysis; the supplied config must match the pinned manifest. */
export async function analyzeSplit({ root, archive, out, manifestSha256, configuration }) {
  const checkpointRoot = out + "-checkpoints";
  await mkdir(checkpointRoot, { recursive: true });
  const manifestBytes = await readFile(join(archive, 'manifest.json'));
  assert.equal(sha(manifestBytes), manifestSha256, 'Wrong archive authority');
  const { manifest } = await readRun(archive, true);
  assert.equal(manifest.cohort, 'development', 'Validation remains sealed');
  assert.deepEqual(canonical(configuration), manifest.generator.effectiveConfig, 'Wrong effective configuration');
  async function closure() {
    return { src: await treePins(join(root, 'src')), evaluation: await treePins(join(root, 'evaluation')),
      dependencies: await installedDependencies(root), environment: executionEnvironment(),
      nodeSha256: sha(await readFile(process.execPath)) };
  }
  for (const artifact of manifest.artifacts) await regularArtifact(archive, artifact.file);
  let before = await closure();
  const authorityPath = join(checkpointRoot, 'authority.json');
  const operatorSha256 = sha(await readFile(new URL(import.meta.url)));
  try {
    const prior = JSON.parse(await readFile(authorityPath, 'utf8'));
    assert.equal(prior.operatorSha256, operatorSha256, 'Checkpoint operator changed');
    assert.equal(prior.manifestSha256, manifestSha256);
    assert.deepEqual(prior.configuration, canonical(configuration));
    assert.deepEqual(before, prior.before, 'Checkpoint inputs changed');
    before = prior.before;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const temporary = authorityPath + '.' + process.pid + '.tmp';
    await writeFile(temporary, JSON.stringify({ before, manifestSha256, operatorSha256, configuration: canonical(configuration) }), { flag: 'wx' });
    await rename(temporary, authorityPath);
  }
  const observe = createSplitObserver(configuration);
  const groups = new Map(); const witnesses = new Map(); const artifacts = [];
  await mkdir(out, { recursive: true }); await mkdir(join(out, 'observations'), { recursive: true });
  async function save(name, bytes) {
    try { assert.deepEqual(await readFile(join(out, name)), bytes, 'Existing artifact differs'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await writeFile(join(out, name), bytes, { flag: 'wx' }); }
    artifacts.push({ file: name, bytes: bytes.length, sha256: sha(bytes) });
  }
  let words = 0;
  const expectedFiles = [];
  for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
    const file = `words/${profile.id}-${seed}.jsonl.gz`; expectedFiles.push(file);
    assert.equal(manifest.artifacts.filter(entry => entry.file === file).length, 1, 'Missing stream artifact');
    const checkpointPath = join(checkpointRoot, `${profile.id}-${seed}.json`);
    let checkpoint;
    try { checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (checkpoint) {
      const archivePin = manifest.artifacts.find(entry => entry.file === file);
      assert.equal(checkpoint.archiveSha256, archivePin.sha256);
      assert.equal(checkpoint.words, manifest.protocol.wordsPerReplicate);
      assert.equal(checkpoint.observationSha256, sha(await readFile(join(out, `observations/${profile.id}-${seed}.jsonl.gz`))));
      assert.equal(checkpoint.payloadSha256, sha(Buffer.from(JSON.stringify(checkpoint.payload))));
      for (const group of checkpoint.payload.groups) {
        const key = JSON.stringify(group.dimensions);
        if (!groups.has(key)) groups.set(key, { dimensions: group.dimensions, counts: {}, eventCounts: {} });
        merge(groups.get(key).counts, group.counts); merge(groups.get(key).eventCounts, group.eventCounts);
      }
      for (const witness of checkpoint.payload.witnesses) if (!witnesses.has(witness.checkpointKey)) { const { checkpointKey, ...value } = witness; witnesses.set(checkpointKey, value); };
      words += checkpoint.words;
      await save(`observations/${profile.id}-${seed}.jsonl.gz`, await readFile(join(out, `observations/${profile.id}-${seed}.jsonl.gz`)));
      console.log(`Resumed ${profile.id} ${seed}: ${checkpoint.words}`);
      continue;
    }
    const previousGroups = new Map([...groups].map(([key, group]) => [key, structuredClone(group)]));
    const previousWitnesses = new Set(witnesses.keys());
    const observations = []; let nextDraw = 0;
    await rows(join(archive, file), row => {
      assert.equal(row.profile, profile.id); assert.equal(row.seed, seed); assert.equal(row.drawIndex, nextDraw++);
      const observation = observe(row.word);
      observations.push(JSON.stringify({ profile: row.profile, seed, drawIndex: row.drawIndex, counts: observation.counts }));
      const dimensions = [...groupKeys(row), ['written-length', profile.id, row.word.written.clean.length],
        ['root-phone-length', profile.id, row.word.trace.baseSpelling.phones.length]];
      for (const dimension of dimensions) {
        const key = JSON.stringify(dimension);
        if (!groups.has(key)) groups.set(key, { dimensions: dimension, counts: {}, eventCounts: {} });
        const group = groups.get(key); merge(group.counts, observation.counts);
        for (const event of observation.events) {
          const eventKey = JSON.stringify([event.category, event.sound, event.stress]);
          merge(group.eventCounts, { [eventKey]: 1 });
        }
      }
      for (const event of observation.events) {
        const category = JSON.stringify([profile.id, event.category, event.sound, event.stress]);
        if (!witnesses.has(category)) witnesses.set(category, { category, profile: row.profile, seed, drawIndex: row.drawIndex,
          event: structuredClone(event), word: structuredClone(row.word) });
      }
      words++;
    });
    assert.equal(nextDraw, manifest.protocol.wordsPerReplicate, 'Incomplete stream');
    await save(`observations/${profile.id}-${seed}.jsonl.gz`, gzipSync(observations.join('\n') + '\n'));
    assert.deepEqual(await closure(), before, 'Stream checkpoint inputs changed');
    const streamGroups = [...groups].map(([key, group]) => {
      const prior = previousGroups.get(key);
      const difference = (values, old) => Object.fromEntries(Object.entries(values).map(([k,v]) => [k,v-(old?.[k]??0)]));
      return { dimensions: group.dimensions, counts: difference(group.counts, prior?.counts), eventCounts: difference(group.eventCounts, prior?.eventCounts) };
    });
    const payload = { groups: streamGroups, witnesses: [...witnesses].filter(([key]) => !previousWitnesses.has(key)).map(([category,value]) => ({ ...value, checkpointKey: category })) };
    const checkpointTemp = checkpointPath + '.' + process.pid + '.tmp';
    await writeFile(checkpointTemp, JSON.stringify({ words: nextDraw, archiveSha256: manifest.artifacts.find(entry => entry.file === file).sha256,
      observationSha256: sha(await readFile(join(out, `observations/${profile.id}-${seed}.jsonl.gz`))), payload,
      payloadSha256: sha(Buffer.from(JSON.stringify(payload))) }), { flag: 'wx' });
    await rename(checkpointTemp, checkpointPath);
    console.log(`Analyzed ${profile.id} ${seed}: ${nextDraw}`);
  }
  assert.deepEqual(manifest.artifacts.filter(entry => entry.file.startsWith('words/')).map(entry => entry.file).sort(), expectedFiles.sort(), 'Extra archive streams');
  const after = await closure();
  assert.deepEqual(after, before, 'Analysis inputs changed');
  await readRun(archive, true);
  assert.equal(sha(await readFile(join(archive, 'manifest.json'))), manifestSha256, 'Archive manifest changed');
  const report = { version: 'q14a-split-analysis-v1', archive, manifestSha256, words,
    groups: [...groups.values()].sort((a, b) => JSON.stringify(a.dimensions).localeCompare(JSON.stringify(b.dimensions))) };
  await save('report.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
  await save('witnesses.json.gz', gzipSync(JSON.stringify([...witnesses.values()])));
  await save('authority.json.gz', gzipSync(JSON.stringify({ before, node: process.version, nodeSha256: sha(await readFile(process.execPath)), configuration: canonical(configuration) })));
  await writeFile(join(out, 'complete.json'), JSON.stringify({ passed: true, words, manifestSha256, artifacts }, null, 2) + '\n', { flag: 'wx' });
  return report;
}
