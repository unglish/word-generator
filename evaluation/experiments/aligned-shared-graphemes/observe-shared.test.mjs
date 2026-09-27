import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.ts";
import { englishSharedSpellings } from "../../../src/elements/graphemes/shared.ts";
import { createBaseSpellingEvidenceVerifier } from "../../../src/core/spelling-evidence.ts";
import { createCurrentSpellingObserver } from "../../quality/probes/unit-normalization/observe-current.ts";
import { observeDoubling } from "../phoneme-aware-doubling/observe-doubling.mjs";
import { observeRootDoubling } from "./observe-doubling.mjs";
import { createSharedRepairObserver } from "./observe-repairs.ts";
import { completeObservedUnit, observeSharedSpellings } from "./observe-shared.mjs";

const { ordinaryRelations } = JSON.parse(readFileSync(new URL("../phoneme-aware-doubling/protocol.json", import.meta.url)));
const legacyConfig = { ...englishConfig, sharedSpellings: undefined };
const legacyGenerator = createGenerator(legacyConfig);
const config = { ...englishConfig, sharedSpellings: englishSharedSpellings };
const generator = createGenerator(config);
const verify = createBaseSpellingEvidenceVerifier(config);
const rng = createSeededRng(129);
const words = Array.from({ length: 500 }, (_, draw) => generator.generateWord({ rand: rng, trace: true,
  morphology: draw % 2 === 0, mode: draw % 3 ? "text" : "lexicon" }));
const witness = words.find(word => word.trace.baseSpelling.shared.constructions.length);
assert(witness, "Missing positive public-generated witness");
const observe = word => observeSharedSpellings(word, englishSharedSpellings);

test("observes 500 generated ledgers without treating successful replay as independent proof", () => {
  let formations = 0;
  for (const word of words) {
    assert.equal(verify(word.trace.baseSpelling).sharedWriterSchedule, "verified");
    const before = structuredClone(word);
    const result = observe(word);
    assert.equal(result.availability, "available");
    for (const key of ["unsupportedFormedSequences", "partialSourceConsumptions", "phoneMultiplicityViolations",
      "unsupportedInputOwnership", "silentlyDamagedConstructions"]) assert.equal(result.counts[key], 0, key);
    assert.equal(result.rules.reduce((sum, rule) => sum + rule.counts.formed, 0), result.counts.constructions);
    assert.equal(result.rules.reduce((sum, rule) => sum + rule.counts.sourceWindows, 0), result.events.length);
    formations += result.counts.constructions;
    assert.deepEqual(word, before);
  }
  assert(formations > 0);
});
test("historical eligibility remains unavailable, not zero", () => {
  const result = observe(legacyGenerator.generateWord({ seed: 129, trace: true }));
  assert.equal(result.availability, "unavailable");
  assert.equal(result.counts, null); assert.equal(result.rules, null); assert.equal(result.events, null);
});
test("reports unsupported source sequences", () => {
  const word = structuredClone(witness); const base = word.trace.baseSpelling;
  base.phones[base.shared.constructions[0].phoneIds[0]].soundAtSpelling = "unsupported";
  assert.equal(observe(word).counts.unsupportedFormedSequences, 1);
});
test("reports partial consumption instead of trusting a construction's input claim", () => {
  const word = structuredClone(witness);
  word.trace.baseSpelling.shared.constructions[0].inputCellIds.pop();
  assert.equal(observe(word).counts.partialSourceConsumptions, 1);
});
test("reports altered phone multiplicity", () => {
  const word = structuredClone(witness);
  word.trace.baseSpelling.shared.constructions[0].phoneIds.reverse();
  assert.equal(observe(word).counts.phoneMultiplicityViolations, 1);
});
test("finds actual silent erasure in a consistently edited archive", () => {
  const word = structuredClone(witness); const base = word.trace.baseSpelling;
  const start = base.cells.findIndex(cell => cell.origin.kind === "shared");
  assert(start >= 0);
  const [cell] = base.cells.splice(start, 1);
  base.edits.push({ id: base.edits.length, phase: "word", rule: "forged-erasure", start,
    input: [cell], output: [], before: cell.text, after: "", partId: cell.partId });
  base.surface = base.cells.map(entry => entry.text).join("");
  assert.equal(observe(word).counts.silentlyDamagedConstructions, 1);
});
test("refuses incomplete observation fields", () => {
  for (const field of ["scans", "attempts", "constructions", "supersessions", "liveConstructionIds"]) {
    const word = structuredClone(witness); delete word.trace.baseSpelling.shared[field];
    assert.throws(() => observe(word), /Missing shared/);
  }
});
test("refuses missing attempts rather than accepting a smaller eligibility denominator", () => {
  const word = structuredClone(witness); word.trace.baseSpelling.shared.attempts.pop();
  assert.throws(() => observe(word));
});
test("does not alias returned event metadata into the original word", () => {
  const word = structuredClone(witness); const before = structuredClone(word);
  const result = observe(word);
  result.events[0].slot.phase = "changed"; result.events[0].sourceUnitIds.length = 0;
  assert.deepEqual(word, before);
});

test("finds an insertion that separates the cells of a surviving qu construction", () => {
  const original = words.find(word => word.trace.baseSpelling.cells.some(cell => cell.origin.kind === "shared" &&
    word.trace.baseSpelling.shared.constructions[cell.origin.constructionId].after === "qu"));
  assert(original, "Missing public qu witness");
  const word = structuredClone(original); const base = word.trace.baseSpelling;
  const start = base.cells.findIndex(cell => cell.origin.kind === "shared" &&
    base.shared.constructions[cell.origin.constructionId].after === "qu") + 1;
  const id = Math.max(...base.units.flatMap(unit => unit.sourceCellIds), ...base.edits.flatMap(edit => edit.output.map(cell => cell.id))) + 1;
  const editId = base.edits.length;
  const cell = { id, text: "h", partId: base.cells[start - 1].partId,
    origin: { kind: "rewrite", editId, sourceUnitIds: [], ownership: "unresolved" } };
  base.edits.push({ id: editId, phase: "word", rule: "forged-split", start, input: [], output: [cell], before: "", after: "h", partId: cell.partId });
  base.cells.splice(start, 0, cell); base.unresolvedCells++;
  base.surface = base.cells.map(entry => entry.text).join("");
  assert.equal(observe(word).counts.silentlyDamagedConstructions, 1);
});

test("preserves every retained v3 repair counter on 500 public legacy words", () => {
  const old = createCurrentSpellingObserver(legacyConfig);
  const current = createSharedRepairObserver(legacyConfig);
  const rand = createSeededRng(129);
  for (let draw = 0; draw < 500; draw++) {
    const word = legacyGenerator.generateWord({ rand, trace: true, morphology: draw % 2 === 0 });
    assert.deepEqual(current({ word }), old({ word }));
    const archived = JSON.parse(JSON.stringify(word));
    assert.deepEqual(observeRootDoubling(word, ordinaryRelations), observeDoubling(archived, ordinaryRelations));
    assert.deepEqual(observeRootDoubling(word, ordinaryRelations), observeRootDoubling(archived, ordinaryRelations));
  }
});
test("retains repair counters and joint lineage on actual v4 words", () => {
  const observer = createSharedRepairObserver(config);
  for (const word of words) {
    const result = observer({ word });
    const doubling = observeRootDoubling(word, ordinaryRelations);
    assert.equal(doubling.counts.unsupportedOrdinaryExpansions, 0);
    assert.equal(doubling.counts.units, word.trace.baseSpelling.units.length);
    assert.equal(result.words, 1);
    assert.equal(result["ledgerVersion:4"], 1);
    assert.equal(result.verifiedNormalizationCertificates, word.trace.baseSpelling.normalizationCertificates.length);
    assert.equal(result.verifiedCertificates, word.trace.baseSpelling.certificates.length);
    assert.equal(result.unresolvedCells, word.trace.baseSpelling.unresolvedCells);
    assert.equal(result.capPartialThUnits ?? 0, 0);
  }
});

test("detects a previously truncated original unit even when all surviving cells are consumed", () => {
  const word = structuredClone(witness); const base = word.trace.baseSpelling;
  const unit = base.units[base.shared.constructions[0].sourceUnitIds[0]];
  const offset = unit.afterDoubling.length;
  const cellId = Math.max(...base.units.flatMap(entry => entry.sourceCellIds), ...base.edits.flatMap(edit => edit.output.map(cell => cell.id))) + 1;
  const start = base.units.slice(0, unit.id + 1).reduce((sum, entry) => sum + entry.afterDoubling.length, 0);
  unit.afterDoubling += "h"; unit.sourceCellIds.push(cellId);
  const cell = { id: cellId, text: "h", partId: base.phones[unit.id].syllableIndex,
    origin: { kind: "selection", unitId: unit.id, offset } };
  base.edits.unshift({ id: Math.max(...base.edits.map(edit => edit.id)) + 1, phase: "selection", rule: "forged-partial-source", start,
    input: [cell], output: [], before: "h", after: "", partId: cell.partId });
  assert.equal(observe(word).counts.partialSourceConsumptions, 1);
});

for (const kind of ["licensed", "normalized"]) {
  test(`pure ${kind} extent fixture requires the entire recorded replacement and matching unit`, () => {
    // Structural fixture only: reading-license semantics remain the production verifier's responsibility.
    const unit = { id: 0, phoneIds: [0], sourceCellIds: [0], afterDoubling: "c" };
    const cells = ["c", "k"].map((text, offset) => ({ id: 1 + offset, text,
      origin: { kind, unitId: 0, editId: 0, certificateId: 0, offset, sourceUnitIds: [0] } }));
    const replacement = { unitId: 0, phoneIds: [0], after: "ck" };
    const base = { edits: [{ id: 0, output: cells }], certificates: [{ id: 0, replacements: [replacement] }],
      normalizationCertificates: [{ id: 0, editId: 0, ...replacement }] };
    assert.equal(completeObservedUnit(base, cells, unit), true);
    assert.equal(completeObservedUnit(base, cells.slice(1), unit), false);
    assert.equal(completeObservedUnit(base, [...cells].reverse(), unit), false);
    const forged = structuredClone(base);
    if (kind === "licensed") forged.certificates[0].replacements[0].phoneIds = [1];
    else forged.normalizationCertificates[0].phoneIds = [1];
    assert.equal(completeObservedUnit(forged, cells, unit), false);
  });
}
