import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { generateWord: beforeGenerate } = await import(pathToFileURL(process.argv[2]).href);

const { generateWord: afterGenerate } = await import(pathToFileURL(process.argv[3]).href);
const targetRules = new Set(['letterContext:soft-c', 'letterContext:hard-c-onset']);

function writtenParts(word) {
  const parts = word.trace.morphology.realization?.emittedParts;
  if (!parts) return { root: word.written.clean, prefix: '', suffix: '' };
  assert.equal(parts.map(part => part.text).join(''), word.written.clean);
  return Object.fromEntries(['root', 'prefix', 'suffix'].map(role =>
    [role, parts.find(part => part.role === role)?.text ?? '']));
}

function matchedWord(seed, mode) {
  const opts = { seed, mode, trace: true };
  const after = afterGenerate(opts);
  const repairs = after.trace.repairs.filter(r => targetRules.has(r.rule));
  if (repairs.length !== 1) return;
  const before = beforeGenerate(opts);
  if (before.pronunciation !== after.pronunciation || before.written.clean === after.written.clean) return;
  const [repair] = repairs;
  const oldBase = before.trace.baseSpelling;
  const newBase = after.trace.baseSpelling;
  if (repair.before !== oldBase.surface || repair.after !== newBase.surface) return;

  const oldParts = writtenParts(before);
  const newParts = writtenParts(after);
  if (oldParts.prefix !== newParts.prefix || oldParts.suffix !== newParts.suffix) return;

  const { rule, detail } = repair;
  const match = /^(sc|c|k) before "([aou])" [(]selection (\d+)[)]$/.exec(detail);
  assert.ok(match, detail);
  const [, from, vowel, phoneIdText] = match;
  const phoneId = Number(phoneIdText);
  const soft = rule === 'letterContext:soft-c';
  const to = soft ? 's' : 'c';
  const targetPhone = soft ? 's' : 'k';
  assert.equal(newBase.phones[phoneId].soundAtSpelling, targetPhone);
  if (oldBase.phones[phoneId]?.soundAtSpelling !== targetPhone) return;
  const respelling = after.trace.graphemeSelections[phoneId]?.letterRespelled;
  assert.equal(respelling?.rule, rule);
  assert.equal(respelling?.form, to);

  for (let i = oldParts.root.indexOf(from); i >= 0; i = oldParts.root.indexOf(from, i + 1)) {
    const end = i + from.length;
    const oldFollowing = oldParts.root[end] ?? oldParts.suffix[0];
    if (oldFollowing !== vowel || newParts.root !== oldParts.root.slice(0, i) + to + oldParts.root.slice(end)) continue;
    const ownsOriginal = [...from].every((char, j) => {
      const cell = oldBase.cells[i + j];
      if (cell?.text !== char) return false;
      const sourceIds = cell.origin.kind === 'rewrite'
        ? cell.origin.sourceUnitIds.filter(id => oldBase.units[id].afterDoubling.includes(char))
        : [cell.origin.unitId];
      return sourceIds.length === 1 &&
        oldBase.units[sourceIds[0]].phoneIds.length === 1 &&
        oldBase.units[sourceIds[0]].phoneIds[0] === phoneId;
    });
    if (!ownsOriginal) continue;
    const followingSuffix = end === oldParts.root.length;
    const droppedE = followingSuffix && oldBase.surface === oldParts.root + 'e';
    const followingSound = soft ? null : newBase.phones[phoneId + 1]?.soundAtSpelling;
    const category = soft ? droppedE ? 'suffix' : from === 'sc' ? 'sc' : 'c' + vowel : followingSound;
    return {
      category, mode, seed, before: before.written.clean, after: after.written.clean,
      pronunciation: before.pronunciation, changedAt: oldParts.prefix.length + i, from, to,
      vowel, followingSound, suffix: followingSuffix ? oldParts.suffix : null, repair,
    };
  }
}

const categories = new Map([['ca', 8], ['co', 8], ['cu', 8], ['sc', 8], ['suffix', 3], ['eɪ', 8], ['ɚ', 7]]);
const rows = Object.fromEntries([...categories.keys()].map(category => [category, []]));
const seen = new Set();
function collect(seed, mode) {
  const row = matchedWord(seed, mode);
  if (!row || !categories.has(row.category)) return;
  if (rows[row.category].length >= categories.get(row.category) || seen.has(row.before) || row.after === 's') return;
  seen.add(row.before);
  rows[row.category].push(row);
}

for (const seed of [8172032, 8172171]) collect(seed, 'lexicon');
for (const mode of ['lexicon', 'text']) {
  for (let seed = 1; seed <= 24000; seed++) {
    if (seen.size === 50) break;
    collect(seed, mode);
  }
}
const samples = [...categories.keys()].flatMap(category => rows[category]);
console.error(Object.fromEntries([...categories.keys()].map(category => [category, rows[category].length])));
assert.equal(samples.length, 50);
console.log(JSON.stringify(samples, null, 2));
