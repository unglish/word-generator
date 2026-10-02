import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip, gzipSync } from 'node:zlib';
import { readRun } from '../../quality/capture.ts';
import { canonical } from '../../quality/serialization.ts';
import { createFollowingObserver } from './observe-following.ts';
import { treePins, executionEnvironment } from '../split-digraphs/freeze-capture.mjs';
import { installedDependencies } from '../phoneme-aware-doubling/dependency-closure.mjs';
import { regularArtifact } from '../aligned-shared-graphemes/analyze-shared.mjs';
import { groupKeys } from '../phoneme-aware-doubling/aggregate-doubling.mjs';

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

function eventDimensions(event) {
  return [event.boundary, event.selectionStratum, event.stratum, event.ownership,
    event.readingStatus ?? null, event.reason ?? null, event.interpretation,
    event.context?.kind ?? null, event.context?.origin ?? null, event.context?.letter ?? null];
}

export function validateAccounting({ counts, events }) {
  const sum = prefix => Object.entries(counts).filter(([key]) => key.startsWith(prefix)).reduce((n, [, value]) => n + value, 0);
  assert.equal(events.length, 2 * counts.phones, 'Incomplete event population');
  for (const boundary of ['selection', 'final-root']) {
    assert.equal(sum(`${boundary}:ownership:`), counts.phones, 'Ownership denominator mismatch');
    assert.equal(sum(`${boundary}:selectionCohort:`), counts.phones, 'Selection cohort mismatch');
    assert.equal(sum(`${boundary}:reading:`), counts[`${boundary}:ownership:single-owned`], 'Reading denominator mismatch');
  }
  assert.equal(sum('transition:'), counts.phones, 'Transition denominator mismatch');
  for (let i = 0; i < counts.phones; i++) {
    assert.equal(events[2 * i].phoneId, i); assert.equal(events[2 * i].boundary, 'selection');
    assert.equal(events[2 * i + 1].phoneId, i); assert.equal(events[2 * i + 1].boundary, 'final-root');
  }
}

/** Offline, read-only generation archive analysis; the supplied config must match the pinned manifest. */
export async function analyzeFollowing({ root, archive, out, manifestSha256, configuration }) {
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
  const before = await closure();
  const observe = createFollowingObserver(configuration);
  const groups = new Map(); const witnesses = new Map(); const artifacts = [];
  await mkdir(out); await mkdir(join(out, 'observations'));
  async function save(name, bytes) {
    await writeFile(join(out, name), bytes, { flag: 'wx' });
    artifacts.push({ file: name, bytes: bytes.length, sha256: sha(bytes) });
  }
  let words = 0;
  const expectedFiles = [];
  for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
    const file = `words/${profile.id}-${seed}.jsonl.gz`; expectedFiles.push(file);
    assert.equal(manifest.artifacts.filter(entry => entry.file === file).length, 1, 'Missing stream artifact');
    const observations = []; let nextDraw = 0;
    await rows(join(archive, file), row => {
      assert.equal(row.profile, profile.id); assert.equal(row.seed, seed); assert.equal(row.drawIndex, nextDraw++);
      const observation = observe(row.word);
      validateAccounting(observation);
      observations.push(JSON.stringify({ profile: row.profile, seed, drawIndex: row.drawIndex, counts: observation.counts, events: observation.events }));
      const dimensions = [...groupKeys(row), ['written-length', profile.id, row.word.written.clean.length],
        ['root-phone-length', profile.id, row.word.trace.baseSpelling.phones.length]];
      for (const dimension of dimensions) {
        const key = JSON.stringify(dimension);
        if (!groups.has(key)) groups.set(key, { dimensions: dimension, counts: {}, eventCounts: {} });
        const group = groups.get(key); merge(group.counts, observation.counts);
        for (const event of observation.events) {
          const eventKey = JSON.stringify(eventDimensions(event));
          merge(group.eventCounts, { [eventKey]: 1 });
        }
      }
      for (const event of observation.events) {
        const category = JSON.stringify([profile.id, ...eventDimensions(event)]);
        if (!witnesses.has(category)) witnesses.set(category, { category, profile: row.profile, seed, drawIndex: row.drawIndex,
          event: structuredClone(event), word: structuredClone(row.word) });
      }
      words++;
    });
    assert.equal(nextDraw, manifest.protocol.wordsPerReplicate, 'Incomplete stream');
    await save(`observations/${profile.id}-${seed}.jsonl.gz`, gzipSync(observations.join('\n') + '\n'));
    console.log(`Analyzed ${profile.id} ${seed}: ${nextDraw}`);
  }
  assert.deepEqual(manifest.artifacts.filter(entry => entry.file.startsWith('words/')).map(entry => entry.file).sort(), expectedFiles.sort(), 'Extra archive streams');
  const after = await closure();
  assert.deepEqual(after, before, 'Analysis inputs changed');
  await readRun(archive, true);
  assert.equal(sha(await readFile(join(archive, 'manifest.json'))), manifestSha256, 'Archive manifest changed');
  const report = { version: 'q14b-following-analysis-v1', archive, manifestSha256, words,
    groups: [...groups.values()].sort((a, b) => JSON.stringify(a.dimensions).localeCompare(JSON.stringify(b.dimensions))) };
  await save('report.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
  await save('witnesses.json.gz', gzipSync(JSON.stringify([...witnesses.values()])));
  await save('authority.json.gz', gzipSync(JSON.stringify({ before, node: process.version, nodeSha256: sha(await readFile(process.execPath)), configuration: canonical(configuration) })));
  await writeFile(join(out, 'complete.json'), JSON.stringify({ passed: true, words, manifestSha256, artifacts }, null, 2) + '\n', { flag: 'wx' });
  return report;
}
