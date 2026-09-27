import assert from "node:assert/strict";

const key = values => JSON.stringify(values);

/** Pure observation of retained root sampler events; no pronunciation inference from final letters. */
export function observeDoubling(word, ordinaryRelations) {
  const base = word.trace?.baseSpelling;
  const choices = word.trace?.graphemeSelections;
  assert.equal(base?.version, 3, "Q12c requires observed v3 spelling units");
  assert(Array.isArray(choices), "Missing grapheme decisions");
  assert.equal(base.units.length, choices.length, "Missing spelling unit or choice");
  assert.equal(base.phones.length, base.units.length, "Unrepresented source phone");
  const allowed = new Set(ordinaryRelations.map(key));
  const counts = {
    words: 1, units: base.units.length, sampledAttempts: 0, sampledSuccesses: 0,
    sampledFailures: 0, directlyCounted: 0, skipped: 0, quotaIncrements: 0,
    unsupportedOrdinaryExpansions: 0, sToCkExpansions: 0,
    wordsWithSampledSuccess: 0, wordsWithUnsupportedOrdinaryExpansion: 0, wordsWithSToCkExpansion: 0,
  };
  const events = [];
  for (const [index, unit] of base.units.entries()) {
    const choice = choices[index];
    const phone = base.phones[index];
    assert.equal(unit.id, index, "Unit ordering");
    assert.equal(unit.choiceId, index, "Unit choice identity");
    assert.equal(choice.index, index, "Choice ordering");
    assert.equal(phone.id, index, "Phone ordering");
    assert.deepEqual(unit.phoneIds, [index], "Single-phone ownership");
    assert.equal(phone.soundAtSpelling, choice.phoneme, "Source sound identity");
    assert.equal(unit.selected, choice.selected, "Selected spelling identity");
    assert.equal(typeof unit.afterDoubling, "string", "Missing sampler output");
    assert([0, 1].includes(unit.doublingIncrement), "Missing actual quota increment");
    const decision = choice.doubling;
    assert.equal(typeof decision?.attempted, "boolean", "Missing doubling decision");
    const success = Object.hasOwn(decision, "result");
    let kind;
    if (success) {
      assert.equal(decision.attempted, true, "Successful outcome without attempt");
      assert.equal(typeof decision.result, "string", "Invalid successful result");
      assert.equal(decision.result, unit.afterDoubling, "Sampler output disagreement");
      assert.equal(unit.doublingIncrement, 1, "Successful expansion did not consume quota");
      kind = "sampled-success";
      counts.sampledSuccesses++;
      counts.wordsWithSampledSuccess = 1;
    } else {
      assert.equal(unit.afterDoubling, unit.selected, "Unrecorded expansion");
      if (decision.attempted) {
        assert.equal(decision.reason, "roll-failed", "Unexplained attempted outcome");
        assert.equal(unit.doublingIncrement, 0, "Failed roll consumed quota");
        kind = "sampled-failure";
        counts.sampledFailures++;
      } else if (unit.doublingIncrement) {
        assert.equal(decision.reason, "multi-char-grapheme", "Unexplained direct quota increment");
        assert(unit.selected.length > 1, "Direct quota increment on single letter");
        kind = "direct-counted";
        counts.directlyCounted++;
      } else {
        assert.equal(typeof decision.reason, "string", "Unexplained skipped decision");
        kind = "skipped";
        counts.skipped++;
      }
    }
    if (decision.attempted) {
      assert(Number.isInteger(decision.probability) && decision.probability > 0 && decision.probability <= 100,
        "Invalid sampled probability");
      counts.sampledAttempts++;
    }
    const relation = [choice.phoneme, unit.selected, unit.afterDoubling];
    const unsupported = success && !allowed.has(key(relation));
    const sToCk = success && key(relation) === key(["s", "c", "ck"]);
    counts.unsupportedOrdinaryExpansions += Number(unsupported);
    counts.sToCkExpansions += Number(sToCk);
    counts.wordsWithUnsupportedOrdinaryExpansion = Math.max(counts.wordsWithUnsupportedOrdinaryExpansion, Number(unsupported));
    counts.wordsWithSToCkExpansion = Math.max(counts.wordsWithSToCkExpansion, Number(sToCk));
    counts.quotaIncrements += unit.doublingIncrement;
    events.push({ unitId: index, relation, kind, reason: decision.reason ?? null,
      probability: decision.probability ?? null, unsupportedOrdinary: unsupported, sToCk });
  }
  assert.equal(counts.sampledAttempts, counts.sampledSuccesses + counts.sampledFailures);
  assert.equal(counts.units, counts.sampledAttempts + counts.directlyCounted + counts.skipped);
  assert.equal(counts.quotaIncrements, counts.sampledSuccesses + counts.directlyCounted);
  return { counts, events };
}
