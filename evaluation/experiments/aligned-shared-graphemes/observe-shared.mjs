import assert from "node:assert/strict";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const owners = cell => ["shared", "rewrite"].includes(cell.origin.kind) ? cell.origin.sourceUnitIds : [cell.origin.unitId];
const migrated = ["ks-to-x", "gz-to-x", "cw-to-qu", "cx-to-x"];
const emptyCounts = () => ({ scans: 0, emptyScans: 0, sourceWindows: 0, ownershipUnavailable: 0,
  policyRefused: 0, neighborRefused: 0, eligibleTrials: 0, formed: 0, rollFailed: 0, rngDraws: 0,
  rngSkipped: 0, crossPartFormed: 0, sourceUnitsConsumed: 0, phonesConsumed: 0 });

export function completeObservedUnit(base, cells, unit) {
  const extent = cells.filter(cell => owners(cell).includes(unit.id));
  if (!extent.length) return false;
  const origin = extent[0].origin;
  if (origin.kind === "selection") return extent.every(cell => cell.origin.kind === "selection" && cell.origin.unitId === unit.id) &&
    same(extent.map(cell => cell.id), unit.sourceCellIds);
  if (!["licensed", "normalized"].includes(origin.kind)) return false;
  const certificate = origin.kind === "licensed" ? base.certificates[origin.certificateId] : base.normalizationCertificates[origin.certificateId];
  if (!certificate) return false;
  const replacement = origin.kind === "licensed" ? certificate.replacements.find(entry => entry.unitId === unit.id) : certificate;
  const edit = base.edits.find(entry => entry.id === origin.editId);
  if (!replacement || replacement.unitId !== unit.id || !same(replacement.phoneIds, unit.phoneIds) || !edit || (origin.kind === "normalized" && certificate.editId !== origin.editId)) return false;
  const output = edit.output.filter(cell => cell.origin.kind === origin.kind && cell.origin.unitId === unit.id);
  return extent.every(cell => cell.origin.kind === origin.kind && cell.origin.unitId === unit.id &&
    cell.origin.editId === origin.editId && cell.origin.certificateId === origin.certificateId) &&
    same(extent.map(cell => cell.id), output.map(cell => cell.id)) && extent.map(cell => cell.text).join("") === replacement.after;
}

/** Arithmetic/structural observation only; production reading-license replay is a separate check. */
export function observeSharedSpellings(word, rules) {
  const base = word.trace?.baseSpelling;
  assert(base && [3, 4].includes(base.version), "Shared comparison requires a retained v3/v4 ledger");
  const policy = new Map(rules.map(rule => [rule.id, rule]));
  assert.equal(policy.size, rules.length, "Duplicate observation rule IDs");
  const historicalRegexEdits = Object.fromEntries(migrated.map(id => [id,
    base.edits.filter(edit => edit.rule === `spellingRule:${id}`).length]));
  if (base.version === 3) return { version: 1, availability: "unavailable", reason: "historical-shared-eligibility-not-recorded",
    counts: null, rules: null, events: null, historicalRegexEdits };

  const shared = base.shared;
  for (const field of ["scans", "attempts", "constructions", "supersessions", "liveConstructionIds"]) {
    assert(Array.isArray(shared?.[field]), `Missing shared ${field}`);
  }
  const perRule = new Map(rules.map(rule => [rule.id, emptyCounts()]));
  const counts = { words: 1, constructions: shared.constructions.length, supersessions: shared.supersessions.length,
    unsupportedFormedSequences: 0, partialSourceConsumptions: 0, phoneMultiplicityViolations: 0,
    unsupportedInputOwnership: 0, silentlyDamagedConstructions: 0, liveConstructions: shared.liveConstructionIds.length,
    finalSharedCells: base.cells.filter(cell => cell.origin.kind === "shared").length,
    unresolvedCells: base.unresolvedCells };
  const events = [];
  for (const scan of shared.scans) {
    const rule = perRule.get(scan.ruleId); assert(rule, "Unconfigured scan");
    assert(Array.isArray(scan.candidates), "Missing candidate windows");
    rule.scans++; rule.emptyScans += Number(scan.candidates.length === 0);
    rule.sourceWindows += scan.candidates.length;
  }
  for (const { id, attempt, constructionId } of shared.attempts) {
    const totals = perRule.get(attempt.ruleId); assert(totals, "Unconfigured attempt");
    const result = attempt.result; let outcome; let reason = null; let drew = false;
    if (result.status === "unavailable") { totals.ownershipUnavailable++; outcome = "ownership-unavailable"; reason = result.reason; }
    else if (result.status === "neighbor-refused") { totals.neighborRefused++; outcome = "neighbor-refused"; reason = result.neighbors.reason; }
    else {
      assert.equal(result.status, "evaluated", "Unknown attempt result");
      const trial = result.trial;
      if (trial.status === "refused") { totals.policyRefused++; outcome = "policy-refused"; reason = trial.reason; }
      else {
        assert(["formed", "roll-failed"].includes(trial.status), "Unknown trial outcome");
        totals.eligibleTrials++; outcome = trial.status;
        drew = Object.hasOwn(trial, "roll");
        assert.equal(drew, trial.support.probability !== 100, "Missing/extra RNG evidence");
        if (trial.status === "formed") totals.formed++;
        else totals.rollFailed++;
      }
    }
    if (outcome.endsWith("refused") || outcome === "ownership-unavailable") assert.equal(typeof reason, "string", "Missing refusal reason");
    totals.rngDraws += Number(drew); totals.rngSkipped += Number(!drew);
    assert.equal(constructionId !== null, outcome === "formed", "Attempt/construction disagreement");
    events.push({ attemptId: id, ruleId: attempt.ruleId, slot: { ...attempt.slot }, sourceUnitIds: [...attempt.sourceUnitIds],
      outcome, reason, rngDraws: Number(drew), constructionId });
  }

  assert.equal(base.units.length, base.phones.length, "Incomplete original units");
  for (const [id, unit] of base.units.entries()) {
    assert.equal(unit.id, id, "Original unit identity");
    assert.equal(unit.sourceCellIds.length, unit.afterDoubling.length, "Incomplete original source cells");
    assert.deepEqual(unit.phoneIds, [id], "Original phone multiplicity");
  }
  // Appends only extend the tail. Preloading future original units preserves each
  // edit's prefix coordinates; source cursors below still forbid consuming them.
  let cells = base.units.flatMap(unit => unit.sourceCellIds.map((id, offset) => ({ id, text: unit.afterDoubling[offset],
    origin: { kind: "selection", unitId: unit.id, offset }, partId: base.phones[unit.id].syllableIndex })));
  const byEdit = new Map(shared.constructions.map(record => [record.editId, record]));
  const retirements = new Map(shared.supersessions.map(record => [record.editId, record]));
  assert.equal(byEdit.size, shared.constructions.length, "Duplicate construction edits");
  assert.equal(retirements.size, shared.supersessions.length, "Duplicate supersession edits");
  let formedEdits = 0; let retiredEdits = 0;
  const consumedPhones = new Set(); const live = new Map(); const damaged = new Set();
  for (const edit of base.edits) {
    assert.deepEqual(cells.slice(edit.start, edit.start + edit.input.length), edit.input, "Archived edit input mismatch");
    const construction = byEdit.get(edit.id);
    if (construction) {
      formedEdits++;
      const rule = policy.get(construction.attempt.ruleId); assert(rule, "Unconfigured construction");
      const totals = perRule.get(rule.id);
      const units = construction.sourceUnitIds.map(id => base.units[id]);
      assert(units.every(Boolean), "Missing construction source unit");
      const phones = units.flatMap(unit => unit.phoneIds);
      const sounds = phones.map(id => base.phones[id]?.soundAtSpelling);
      const sources = new Set(construction.sourceUnitIds);
      const complete = cells.filter(cell => owners(cell).some(id => sources.has(id))).map(cell => cell.id);
      counts.unsupportedFormedSequences += Number(!same(sounds, rule.phonemes.map(phone => phone.sound)) ||
        construction.after !== rule.form || !same(construction.reading, { kind: "shared-phones", sounds }));
      counts.partialSourceConsumptions += Number(!units.every(unit => completeObservedUnit(base, cells, unit)) || !same(complete, construction.inputCellIds) ||
        !same(edit.input.map(cell => cell.id), construction.inputCellIds));
      counts.phoneMultiplicityViolations += Number(!same(phones, construction.phoneIds) || new Set(phones).size !== phones.length ||
        phones.some(id => consumedPhones.has(id)) || sources.size !== units.length ||
        construction.sourceUnitIds.some(id => id > construction.attempt.cursor.lastAppendedUnitId));
      counts.unsupportedInputOwnership += Number(edit.input.some(cell => !["selection", "licensed", "normalized"].includes(cell.origin.kind)));
      for (const id of phones) consumedPhones.add(id);
      totals.crossPartFormed += Number(new Set(phones.map(id => base.phones[id].syllableIndex)).size > 1);
      totals.sourceUnitsConsumed += units.length; totals.phonesConsumed += phones.length;
      assert(!live.has(construction.id), "Duplicate live construction ID");
      live.set(construction.id, construction);
    }
    const retirement = retirements.get(edit.id);
    if (retirement) {
      retiredEdits++;
      assert.equal(edit.phase, "gap", "Non-gap retirement");
      assert.deepEqual(retirement.constructionIds, [...live.keys()], "Incomplete lexical supersession");
      assert.deepEqual(retirement.inputCellIds, cells.map(cell => cell.id), "Partial lexical supersession");
      for (const id of retirement.constructionIds) live.delete(id);
    }
    cells.splice(edit.start, edit.input.length, ...edit.output);
    for (const [id, record] of live) {
      const extent = cells.filter(cell => cell.origin.kind === "shared" && cell.origin.constructionId === id);
      const start = cells.indexOf(extent[0]);
      if (extent.some((cell, offset) => cells[start + offset] !== cell || cell.partId !== record.displayPartId ||
          cell.origin.offset !== offset || cell.origin.editId !== record.editId) || !same(extent.map(cell => cell.id), record.outputCellIds) || extent.map(cell => cell.text).join("") !== record.after ||
          extent.some(cell => !same(cell.origin.phoneIds, record.phoneIds) || !same(cell.origin.sourceUnitIds, record.sourceUnitIds))) damaged.add(id);
    }
  }
  assert.equal(formedEdits, shared.constructions.length, "Construction without an applied edit");
  assert.equal(retiredEdits, shared.supersessions.length, "Supersession without an applied edit");
  assert.deepEqual(cells, base.cells, "Archived final cell mismatch");
  assert.deepEqual([...live.keys()], shared.liveConstructionIds, "Unrecorded retirement");
  assert.equal(cells.map(cell => cell.text).join(""), base.surface, "Final root surface mismatch");
  assert.equal(cells.filter(cell => cell.origin.kind === "rewrite").length, base.unresolvedCells, "Unresolved count mismatch");
  assert(cells.filter(cell => cell.origin.kind === "shared").every(cell => live.has(cell.origin.constructionId)), "Orphan shared cells");
  counts.silentlyDamagedConstructions = damaged.size;
  const resultRules = [...perRule].map(([id, values]) => {
    assert.equal(values.sourceWindows, values.ownershipUnavailable + values.policyRefused + values.neighborRefused + values.eligibleTrials,
      "Missing observed candidate attempt");
    assert.equal(values.eligibleTrials, values.formed + values.rollFailed);
    assert.equal(values.sourceWindows, values.rngDraws + values.rngSkipped);
    assert.equal(values.formed, shared.constructions.filter(record => record.attempt.ruleId === id).length);
    return { id, counts: values };
  });
  return { version: 1, availability: "available", counts, rules: resultRules, events, historicalRegexEdits };
}
