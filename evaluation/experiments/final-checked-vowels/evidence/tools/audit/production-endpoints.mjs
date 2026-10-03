import assert from 'node:assert/strict';
const checked = new Set(['ɪ','ɛ','æ','ʌ','ʊ']);
export function endpointCounts(word) {
  const result = {'endpoint/words':1};
  const add = key => {result[key]=(result[key]??0)+1;};
  for (const [name,syllables] of [['lexical',word.lexical.syllables],['surface',word.syllables]]) {
    const last = syllables.at(-1), sound = last.nucleus.at(-1).sound;
    if (!last.coda.length) {
      add(`endpoint/${name}/open/${sound}`);
      if (checked.has(sound)) {
        add(`endpoint/${name}/configuredViolation`);
        if (last.nucleus.length===1) add(`endpoint/${name}/legacyDiagnostic`);
        add(`endpoint/${name}/stress/${last.stress ?? 'unstressed'}`);
      }
    } else if (checked.has(sound)) add(`endpoint/${name}/closedChecked/${sound}`);
  }
  const root = word.lexical.root, rootStart = word.lexical.rootSyllableStart, lastRoot = root.at(-1);
  if (!lastRoot.coda.length && checked.has(lastRoot.nucleus.at(-1).sound)) {
    add(`endpoint/root/openChecked/${rootStart+root.length < word.lexical.syllables.length ? 'internal':'wordFinal'}`);
  }
  const trace=word.trace, packet=trace.finalNucleus;
  assert.deepEqual(packet.after,word.lexical.syllables);
  assert.deepEqual(packet.rootAfter,root); assert.deepEqual(root,trace.writerInput);
  const replacements=trace.finalWord.phones.realization.filter(c=>c.rule==='repairFinalCheckedVowel');
  const events=packet.repairs.filter(c=>c.rule==='repairFinalCheckedVowel');
  assert.equal(replacements.length,events.length);assert(replacements.length<=1);
  for (const [index,change] of replacements.entries()) {
    const origin=trace.finalWord.phones.initial[change.id].source;
    assert.equal(origin.kind,'segment');assert.equal(origin.part,'root');assert.equal(origin.segment,'nucleus');
    const position=trace.finalWord.phones.final.find(p=>p.id===change.id);
    assert.equal(position.segment,'nucleus');assert.equal(position.index,origin.index);
    assert.equal(position.syllable,rootStart+origin.syllable);assert.equal(position.syllable,packet.after.length-1);
    assert.equal(position.index,packet.after.at(-1).nucleus.length-1);assert.equal(packet.after.at(-1).coda.length,0);
    assert(checked.has(change.before.sound)&&!checked.has(change.after.sound));
    assert.equal(events[index].before,change.before.sound);assert.equal(events[index].after,change.after.sound);
    assert.deepEqual(root[origin.syllable].nucleus[origin.index],change.after);
    assert.deepEqual(packet.after[position.syllable].nucleus[position.index],change.after);
    assert.equal(trace.finalWord.phones.initial[change.id].initialSound,packet.rootBefore[origin.syllable].nucleus[origin.index].sound);
    add('endpoint/repair/events');add(`endpoint/repair/from/${change.before.sound}`);add(`endpoint/repair/to/${change.after.sound}`);
    add(`endpoint/repair/stress/${packet.after[position.syllable].stress ?? 'unstressed'}`);
  }
  return result;
}
