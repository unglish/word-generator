import assert from 'node:assert/strict';

const writtenVowels = new Map([['æ', 'a'], ['ɛ', 'e'], ['ɪ', 'i'], ['ʌ', 'u']]);
const letters = new Set('bdfglmnpst');
const rule = 'medialOnsetDoubling';

function lateEdits(base) {
  const byEdit = new Map();
  for (const edit of base.edits.filter(edit => edit.rule === rule)) {
    assert.equal(edit.phase, 'word');
    assert.equal(edit.input.length, 1);
    assert.equal(edit.output.length, 2);
    const original = edit.input[0];
    assert.equal(original.origin.kind, 'selection');
    assert.equal(original.text.length, 1);
    const unit = base.units[original.origin.unitId];
    assert.equal(unit.phoneIds.length, 1);
    assert.equal(unit.selected, original.text);
    assert.equal(unit.afterDoubling, original.text);
    assert.equal(edit.after, original.text.repeat(2));
    for (const cell of edit.output) {
      assert.equal(cell.text, original.text);
      assert.equal(cell.origin.kind, 'rewrite');
      assert.equal(cell.origin.editId, edit.id);
      assert.deepEqual(cell.origin.sourceUnitIds, [unit.id]);
    }
    byEdit.set(edit.id, unit.phoneIds[0]);
  }
  return byEdit;
}

function owner(cell, base, byEdit) {
  if (!cell) return undefined;
  const { origin } = cell;
  if (origin.kind === 'rewrite' && byEdit.has(origin.editId)) return byEdit.get(origin.editId);
  const ids = origin.kind === 'rewrite'
    ? origin.sourceUnitIds.filter(id => base.units[id].afterDoubling.includes(cell.text))
    : [origin.unitId];
  if (ids.length !== 1) return undefined;
  const unit = base.units[ids[0]];
  return unit?.phoneIds.length === 1 ? unit.phoneIds[0] : undefined;
}

export function inspect(word) {
  const trace = word.trace;
  const base = trace.baseSpelling;
  const byEdit = lateEdits(base);
  assert.equal(base.surface, base.cells.map(cell => cell.text).join(''));
  const parts = trace.morphology?.realization?.emittedParts;
  if (parts) assert.equal(word.written.clean, parts.map(part => part.text).join(''));
  const root = parts?.find(part => part.role === 'root')?.text ?? base.surface;
  const prefix = parts?.find(part => part.role === 'prefix')?.text ?? '';
  const rootLength = base.phones.at(-1).syllableIndex + 1;
  const positions = [];
  for (let j = 1; j < base.cells.length - 1; j++) {
    const cell = base.cells[j];
    const phoneId = owner(cell, base, byEdit);
    const phone = base.phones[phoneId];
    if (!phone || phone.segment !== 'onset' || phone.segmentIndex !== 0 || !letters.has(phone.soundAtSpelling)) continue;
    if (cell.text !== phone.soundAtSpelling || owner(base.cells[j - 1], base, byEdit) === phoneId) continue;
    const previous = base.phones[phoneId - 1], next = base.phones[phoneId + 1];
    if (previous?.segment !== 'nucleus' || previous.syllableIndex + 1 !== phone.syllableIndex ||
        !['ˈ', 'ˌ'].includes(previous.boundary.stress) || next?.segment !== 'nucleus' ||
        next.syllableIndex !== phone.syllableIndex) continue;
    const vowel = writtenVowels.get(previous.soundAtSpelling);
    if (!vowel || base.cells[j - 1].text !== vowel || owner(base.cells[j - 1], base, byEdit) !== previous.id) continue;
    if (j > 1 && owner(base.cells[j - 2], base, byEdit) === previous.id) continue;
    const doubled = base.cells[j + 1].text === cell.text && owner(base.cells[j + 1], base, byEdit) === phoneId;
    const following = j + (doubled ? 2 : 1);
    if (!/^[aeiouy]$/.test(base.cells[following]?.text ?? '') || owner(base.cells[following], base, byEdit) !== next.id) continue;
    if (root.slice(0, following + 1) !== base.surface.slice(0, following + 1)) continue;
    const choice = trace.graphemeSelections[phoneId];
    const late = cell.origin.kind === 'rewrite' && byEdit.has(cell.origin.editId);
    if (late) {
      assert.ok(doubled);
      assert.equal(choice.doubled, false);
      assert.deepEqual(choice.letterRespelled, { form: cell.text.repeat(2), rule });
    }
    positions.push({
      rootLength, syllable: phone.syllableIndex, index: prefix.length + j, phoneId,
      letter: cell.text, vowel: previous.soundAtSpelling, doubled, late,
      nextTense: next.boundary.phoneme.tense === true, nextStress: next.boundary.stress,
    });
  }
  return { positions, edits: byEdit.size };
}
