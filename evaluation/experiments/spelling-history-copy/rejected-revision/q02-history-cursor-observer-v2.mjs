import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

const results = [];
for (const role of ['baseline', 'candidate']) {
  const root = role === 'baseline' ? '/private/tmp/q02-trace-history-performance-v1/baseline' : '/private/tmp/q02-trace-history-performance-v2/candidate';
  const { englishConfig } = await import(pathToFileURL(`${root}/src/index.ts`).href);
  const { BaseSpelling } = await import(pathToFileURL(`${root}/src/core/base-spelling.ts`).href);
  const { createSharedConstructionPlanner } = await import(pathToFileURL(`${root}/src/core/spelling-construction.ts`).href);
  const { englishSharedSpellings } = await import(pathToFileURL(`${root}/src/elements/graphemes/shared.ts`).href);
  const sounds = ['æ', 'k', 's'];
  const forms = ['a', 'ck', 's'];
  const graphemes = forms.map((form, id) => ({ phoneme: sounds[id], form, frequency: 1, origin: 0,
    startWord: 1, midWord: 1, endWord: 1, reading: { kind: 'single-phone' } }));
  const base = new BaseSpelling(sounds.map((sound, id) => ({ id, part: 'root', syllableIndex: 0,
    segment: 'onset', segmentIndex: id, soundAtSpelling: sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)) } })),
  true, true, true, englishSharedSpellings, { doubling: undefined, graphemes });
  forms.forEach((form, id) => base.appendChoice(id, form, form, id, 0));
  base.setPhase('word');
  const planner = createSharedConstructionPlanner(englishSharedSpellings, { doubling: undefined, graphemes });
  const slot = { phase: 'word', partId: null };
  const attempt = planner.decide(base.constructionState(), slot, 'ks-to-x', [1, 2], () => 0);
  const marker = Symbol('cursor-observer');
  attempt.cursor[marker] = { retained: true };
  assert.equal(base.recordSharedAttempt(slot, 'ks-to-x', [1, 2], attempt), 0);
  const trace = base.snapshot();
  assert.equal(trace.version, 4);
  const entry = trace.shared.timeline.find(entry => entry.kind === 'shared');
  assert(entry);
  results.push({ role, version: trace.version, surface: trace.surface,
    timelineCursorSymbols: Object.getOwnPropertySymbols(entry.cursor).length,
    eventCursorSymbols: Object.getOwnPropertySymbols(trace.shared.events[0].cursor).length });
}
console.log(JSON.stringify(results));
await writeFile('/private/tmp/q02-history-cursor-observer-v2-result.json', JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
