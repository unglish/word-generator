import { createSplitSpanResolver } from "../../../src/core/spelling-split-ownership.js";
import { createSplitNeighborGuard } from "../../../src/core/spelling-split-neighbors.js";
import { createConstructionNeighborGuard } from "../../../src/core/spelling-construction-neighbors.js";
import { createCompletionProjectionGuard } from "../../../src/core/spelling-completion-projection.js";
import { englishConfig } from "../../../src/index.js";
import type { ConstructionLedgerView } from "../../../src/core/spelling-construction-ownership.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { Word } from "../../../src/types.js";
import { createFollowingViewGuard, guardFollowingEdit, type FollowingObligation } from "../../../src/core/spelling-following-guard.js";

test("guard rejects the retained context-breaking rewrite but accepts a compatible neighbor", () => {
  const row: { word: Word } = JSON.parse(gunzipSync(readFileSync(new URL("./adversarial-context/failing-word.jsonl.gz", import.meta.url))).toString().trim());
  const base = row.word.trace!.baseSpelling!;
  const edit = base.edits.find(edit => edit.rule === "spellingRule:adversarial-soft-context")!;
  assert.ok(edit);
  const after = base.cells;
  const before = [...after];
  before.splice(edit.start, edit.output.length, ...edit.input);
  const unit = base.units[0];
  assert.equal(unit.afterDoubling, "c");
  const obligation: FollowingObligation = { unitId: unit.id, cellIds: unit.sourceCellIds,
    form: unit.afterDoubling, reading: { kind: "following-letter", require: ["e", "i", "y"] } };
  const denied = guardFollowingEdit(before, after, [obligation]);
  assert.deepEqual(denied, { status: "refused", checks: [{ unitId: 0, before: "compatible", after: "incompatible" }] });
  const compatible = after.map(cell => cell.id === edit.output[0].id ? { ...cell, text: "i" } : cell);
  assert.equal(guardFollowingEdit(before, compatible, [obligation]).status, "preserved");
  assert.equal(guardFollowingEdit(before, before.slice(1), [obligation]).status, "refused");
  assert.equal(guardFollowingEdit(before, before.slice(0, 1), [obligation]).status, "refused");
});


test("ledger-aware guard rejects context damage and unavailable target ownership", () => {
  const row: { word: Word } = JSON.parse(gunzipSync(readFileSync(new URL("./adversarial-context/failing-word.jsonl.gz", import.meta.url))).toString().trim());
  const base = row.word.trace!.baseSpelling!;
  const edit = base.edits.find(edit => edit.rule === "spellingRule:adversarial-soft-context")!;
  const cells = [...base.cells];
  cells.splice(edit.start, edit.output.length, ...edit.input);
  const before: ConstructionLedgerView = { cells, units: base.units, phones: base.phones,
    cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: 0 },
    constructions: [], certificates: [], normalizationCertificates: [] };
  const guard = createFollowingViewGuard(englishConfig, [{ phoneme: "s", form: "c" }]);
  assert.equal(guard(before, before).status, "preserved");
  assert.equal(guard(before, { ...before, cells: base.cells }).status, "refused");
  const missing = guard(before, { ...before, cells: cells.slice(1) });
  assert.equal(missing.status, "refused");
  assert.equal(missing.checks[0].after, "ownership-unavailable");
});


test("ledger guard follows a retained licensed replacement and refuses a missing license", () => {
  const rows = gunzipSync(readFileSync(new URL("./accounting-v2/targeted.jsonl.gz", import.meta.url)))
    .toString().trim().split("\n").map(line => JSON.parse(line));
  const word: Word = rows.find(row => row.word?.written.clean === "uhean").word;
  const base = word.trace!.baseSpelling!;
  assert.ok("certificates" in base && "normalizationCertificates" in base);
  assert.ok(base.certificates && base.normalizationCertificates);
  const edit = base.edits.find(edit => edit.rule === "spellingBudget:respell")!;
  const cells = [...base.cells];
  cells.splice(edit.start, edit.output.length, ...edit.input);
  const before: ConstructionLedgerView = { cells, units: base.units, phones: base.phones,
    cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: 0 },
    constructions: [], certificates: [], normalizationCertificates: [] };
  const after: ConstructionLedgerView = { ...before, cells: base.cells, certificates: base.certificates,
    normalizationCertificates: base.normalizationCertificates };
  // This retained vowel replacement tests the generic ownership transition;
  // it is not evidence about the English soft-c/g target population.
  const guard = createFollowingViewGuard(englishConfig, [{ phoneme: base.phones[0].soundAtSpelling, form: "o" }]);
  const allowed = guard(before, after);
  assert.equal(allowed.status, "preserved");
  assert.equal(allowed.checks.length, 1);
  assert.equal(allowed.checks[0].after, "compatible");
  const unlicensed = guard(before, { ...after, certificates: [] });
  assert.equal(unlicensed.status, "refused");
  assert.equal(unlicensed.checks[0].after, "ownership-unavailable");
});


test("an unappended next phone remains pending rather than becoming a false root edge", () => {
  const row: { word: Word } = JSON.parse(gunzipSync(readFileSync(new URL("./adversarial-context/failing-word.jsonl.gz", import.meta.url))).toString().trim());
  const base = row.word.trace!.baseSpelling!;
  const partial: ConstructionLedgerView = { cells: base.cells.slice(0, 1), units: base.units.slice(0, 1), phones: base.phones,
    cursor: { lastAppendedUnitId: 0, nextEditId: 0 }, constructions: [], certificates: [], normalizationCertificates: [] };
  const guard = createFollowingViewGuard(englishConfig, [{ phoneme: "s", form: "c" }]);
  assert.deepEqual(guard(partial, partial), { status: "preserved", checks: [
    { unitId: 0, before: "pending-context", after: "pending-context" },
  ] });
  const closed = { ...partial, phones: partial.phones.slice(0, 1) };
  assert.equal(guard(closed, closed).status, "refused");
  assert.equal(guard(closed, closed).checks[0].after, "incompatible");
});


test("completion projection rejects a configured vowel alternative that breaks soft c", () => {
  const row: { word: Word } = JSON.parse(gunzipSync(readFileSync(new URL("./adversarial-context/failing-word.jsonl.gz", import.meta.url))).toString().trim());
  const base = row.word.trace!.baseSpelling!;
  const edit = base.edits.find(edit => edit.rule === "spellingRule:adversarial-soft-context")!;
  const cells = [...base.cells]; cells.splice(edit.start, edit.output.length, ...edit.input);
  const view: ConstructionLedgerView = { cells, units: base.units, phones: base.phones,
    cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: 0 }, constructions: [], certificates: [], normalizationCertificates: [] };
  const source = englishConfig.graphemes[base.units[1].inventoryIndex!];
  assert.equal(source.phoneme, "ɛ");
  // Synthetic inventory alternatives test the configurable projection boundary,
  // not an assertion that these alternatives have the same English frequency.
  const alternatives = ["a", "ea"].map(form => ({ ...source, form, reading: { kind: "single-phone" as const } }));
  const config = { ...englishConfig, graphemes: [...englishConfig.graphemes, ...alternatives] };
  const project = createCompletionProjectionGuard(config, []);
  const first = englishConfig.graphemes.length;
  assert.deepEqual(project(view, 1, first, []), { status: "refused", reason: "neighbor-reading", unitId: 0 });
  const compatible = project(view, 1, first + 1, []);
  assert.equal(compatible.status, "preserved");
  if (compatible.status === "preserved") assert.ok(compatible.checkedUnitIds.includes(0) === false,
    "unchanged following letter needs no new neighbor-reading check");
});


test("shared construction projection checks the preceding soft-c reading before formation", () => {
  const row: { word: Word } = JSON.parse(gunzipSync(readFileSync(new URL("./adversarial-context/failing-word.jsonl.gz", import.meta.url))).toString().trim());
  const base = row.word.trace!.baseSpelling!;
  const edit = base.edits.find(edit => edit.rule === "spellingRule:adversarial-soft-context")!;
  const cells = [...base.cells]; cells.splice(edit.start, edit.output.length, ...edit.input);
  const view: ConstructionLedgerView = { cells, units: base.units, phones: base.phones,
    cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: 0 }, constructions: [], certificates: [], normalizationCertificates: [] };
  const guard = createConstructionNeighborGuard(englishConfig, englishConfig.sharedSpellings);
  // These are proposed forms at the neighbor guard boundary. The construction
  // planner separately authenticates whether a configured rule supports them.
  assert.deepEqual(guard(view, [1, 2], "af"), { status: "refused", reason: "reading-obligation", unitId: 0 });
  assert.equal(guard(view, [1, 2], "ef").status, "preserved");
  const changedCompatible = guard(view, [1, 2], "if");
  assert.equal(changedCompatible.status, "preserved");
  if (changedCompatible.status === "preserved") assert.ok(changedCompatible.checks.some(check => check.unitId === 0));
});


test("split construction projection preserves the preceding soft-c obligation", () => {
  const row: { word: Word } = JSON.parse(gunzipSync(readFileSync(new URL("./adversarial-context/failing-word.jsonl.gz", import.meta.url))).toString().trim());
  const base = row.word.trace!.baseSpelling!;
  const edit = base.edits.find(edit => edit.rule === "spellingRule:adversarial-soft-context")!;
  const cells = [...base.cells]; cells.splice(edit.start, edit.output.length, ...edit.input);
  const view: ConstructionLedgerView = { cells, units: base.units, phones: base.phones,
    cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: 0 }, constructions: [], certificates: [], normalizationCertificates: [] };
  const span = createSplitSpanResolver([])(view, 1, "word");
  assert.equal(span.status, "complete");
  if (span.status !== "complete") throw new Error("Fixture lacks split source extent");
  const guard = createSplitNeighborGuard(englishConfig, []);
  const support = { vowel: { sound: "ɛ", component: "a" }, coda: { sounds: ["f"], written: "ff" }, marker: "e" };
  // Hypothetical support tests the guard boundary; this does not add an English
  // split relation or claim that /ɛ/ has this spelling in the real policy.
  assert.deepEqual(guard(view, span, support), { status: "refused", reason: "reading-obligation", unitId: 0 });
  const validContext = guard(view, span, { ...support, vowel: { ...support.vowel, component: "i" } });
  assert.equal(validContext.status, "preserved");
  if (validContext.status === "preserved") assert.ok(validContext.checkedUnitIds.includes(0));
});
