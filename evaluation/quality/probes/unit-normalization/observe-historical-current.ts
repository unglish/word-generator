import assert from "node:assert/strict";
import type { SpellingCoverageCertificate } from "../../../../src/core/spelling-coverage-types.js";
import type { BaseSpellingTraceV1, BaseSpellingTraceV2, SpellingCell, SpellingPhone } from "../../../../src/core/base-spelling.js";

export type Counts = Record<string, number>;
const rules = new Set(["deduplicateAdjacentLetters", "deduplicateSyllableJoin"]);
const owners = (cell: SpellingCell): number[] => cell.origin.kind === "rewrite"
  ? cell.origin.sourceUnitIds : [cell.origin.unitId];
const add = (counts: Counts, key: string, value = 1): void => { counts[key] = (counts[key] ?? 0) + value; };

/** Typed v1/v2 reader for the current union. The separately frozen preparation reader stays unchanged. */
export function observeHistoricalNormalizationCurrent(base: BaseSpellingTraceV1 | BaseSpellingTraceV2): Counts {
  assert.ok(base.version === 1 || base.version === 2, "Unsupported normalization ledger version");
  if (base.version === 2) assert.deepEqual(base.capabilities,
    { exactParts: 1, licensedOrigins: 1, writerBoundary: 1 }, "Unsupported ledger capabilities");
  else assert.equal(base.capabilities, undefined, "Unsupported ledger capabilities");
  for (const certificate of base.certificates ?? []) assert.equal(certificate.version, 1, "Unsupported coverage certificate version");
  assert.equal(base.phones.length, base.units.length, "Phone/unit cardinality");
  const counts: Counts = {
    words: 1, phoneUnits: base.units.length, selectedThUnits: 0, selectedThOnsetUnits: 0,
    structuralAdjacentUnitSlots: 0, structuralSyllableBoundarySlots: 0,
    normalizationEpisodesUnavailableWords: 1, prospectiveComparisonsUnavailableWords: 1,
    legacyDedupEvents: 0, uncertifiedDedupDeletions: 0, wordsWithLegacyDedup: 0,
    wordsWithUncertifiedDedup: 0, legacyWholeUnitEvents: 0,
    legacyPartialUnitEvents: 0, legacySameUnitEvents: 0, legacySameSoundEvents: 0,
    legacyDifferentSoundsEvents: 0, legacyUnresolvedInputEvents: 0,
    dedupAttributedNoLineageUnits: 0, dedupAttributedPartialSourceUnits: 0,
    dedupAttributedPartialThUnits: 0, wordsWithDedupNoLineage: 0,
    wordsWithDedupPartialSource: 0, wordsWithDedupPartialTh: 0,
  };
  const cells: SpellingCell[] = [];
  const knownIds = new Set<number>();
  const seenCertificates = new Set<number>();
  const seenReplacements = new Set<string>();
  for (const [i, unit] of base.units.entries()) {
    const phone: SpellingPhone = base.phones[i];
    assert.equal(unit.id, i); assert.equal(unit.choiceId, i); assert.equal(phone.id, i);
    assert.deepEqual(unit.phoneIds, [i]);
    assert.equal(unit.sourceCellIds.length, unit.afterDoubling.length);
    for (const [offset, id] of unit.sourceCellIds.entries()) {
      assert.ok(!knownIds.has(id)); knownIds.add(id);
      cells.push({ id, text: unit.afterDoubling[offset], origin: { kind: "selection", unitId: i, offset },
        ...(base.version === 2 ? { partId: phone.syllableIndex } : {}) });
    }
    if (unit.selected === "th") {
      add(counts, "selectedThUnits");
      if (phone.segment === "onset") add(counts, "selectedThOnsetUnits");
    }
    if (i && base.phones[i - 1].syllableIndex === phone.syllableIndex) add(counts, "structuralAdjacentUnitSlots");
  }
  counts.structuralSyllableBoundarySlots = Math.max(0, new Set(base.phones.map(p => p.syllableIndex)).size - 1);
  for (const [id, edit] of base.edits.entries()) {
    const touchedCertificates = new Set<number>();
    assert.equal(edit.id, id);
    assert.ok(Number.isInteger(edit.start) && edit.start >= 0 && edit.start + edit.input.length <= cells.length);
    assert.deepEqual(cells.slice(edit.start, edit.start + edit.input.length), edit.input, "Exact edit input cells");
    assert.equal(edit.before, edit.input.map(c => c.text).join(""));
    assert.equal(edit.after, edit.output.map(c => c.text).join(""));
    if (rules.has(edit.rule)) {
      assert.equal(edit.input.length, 1); assert.equal(edit.output.length, 0); assert.ok(edit.start > 0);
      const left = cells[edit.start - 1]; const right = cells[edit.start];
      assert.equal(left.text, right.text);
      add(counts, "legacyDedupEvents"); add(counts, "uncertifiedDedupDeletions");
      add(counts, `site:${edit.rule}:events`);
      if (left.origin.kind === "rewrite" || right.origin.kind === "rewrite") add(counts, "legacyUnresolvedInputEvents");
      else if (left.origin.unitId === right.origin.unitId) add(counts, "legacySameUnitEvents");
      else if (base.phones[left.origin.unitId].soundAtSpelling === base.phones[right.origin.unitId].soundAtSpelling) add(counts, "legacySameSoundEvents");
      else add(counts, "legacyDifferentSoundsEvents");
      if (right.origin.kind === "rewrite") add(counts, "legacyRightOwnershipUnavailableEvents");
      else {
        const unitId = right.origin.unitId;
        const remaining = cells.some((cell, i) => i !== edit.start && cell.origin.kind !== "rewrite" && cell.origin.unitId === unitId);
        add(counts, remaining ? "legacyPartialUnitEvents" : "legacyWholeUnitEvents");
      }
    }
    for (const [offset, cell] of edit.output.entries()) {
      assert.ok(!knownIds.has(cell.id)); knownIds.add(cell.id);
      assert.equal(cell.text.length, 1);
      assert.ok(cell.origin.kind === "rewrite" || cell.origin.kind === "licensed", "Unsupported cell origin");
      assert.equal(cell.origin.editId, edit.id);
      if (cell.origin.kind === "rewrite") {
        assert.equal(cell.origin.ownership, "unresolved");
        assert.deepEqual(cell.origin.sourceUnitIds, [...new Set(edit.input.flatMap(owners))]);
      } else {
        const origin = cell.origin;
        assert.equal(origin.offset, offset, "Licensed offset");
        assert.deepEqual(origin.sourceUnitIds, [origin.unitId]);
        assert.ok(base.units[origin.unitId], "Unknown licensed unit");
        const certificate: SpellingCoverageCertificate | undefined = base.certificates?.[origin.certificateId];
        assert.ok(certificate, "Missing licensed certificate");
        assert.equal(certificate.id, origin.certificateId, "Licensed certificate identity");
        if (!seenCertificates.has(certificate.id)) {
          assert.deepEqual(certificate.inputCellIds, cells.map(c => c.id));
          assert.equal(certificate.before, cells.map(c => c.text).join(""));
          assert.deepEqual(certificate.phoneIds, certificate.replacements.flatMap(entry => entry.phoneIds));
          assert.equal(new Set(certificate.phoneIds).size, certificate.phoneIds.length);
          seenCertificates.add(certificate.id);
        }
        const replacements = certificate.replacements.filter(entry => entry.unitId === origin.unitId);
        assert.equal(replacements.length, 1, "Unique licensed replacement identity");
        const replacement = replacements[0];
        assert.deepEqual(replacement.inputCellIds, edit.input.map(c => c.id));
        assert.deepEqual(replacement.phoneIds, base.units[origin.unitId].phoneIds);
        assert.equal(replacement.before, edit.before); assert.equal(replacement.after, edit.after);
        assert.equal(replacement.after.length, edit.output.length);
        assert.equal(cell.text, replacement.after[offset], "Licensed replacement text");
        assert.equal(cell.partId, replacement.partId);
        if (offset === 0) {
          const key = `${certificate.id}/${replacement.unitId}`;
          assert.ok(!seenReplacements.has(key), "Repeated licensed replacement");
          seenReplacements.add(key);
        }
        touchedCertificates.add(certificate.id);
      }
    }
    cells.splice(edit.start, edit.input.length, ...edit.output);
    for (const certificateId of touchedCertificates) {
      const certificate: SpellingCoverageCertificate = base.certificates![certificateId];
      if (certificate.replacements.every(entry => seenReplacements.has(`${certificate.id}/${entry.unitId}`))) {
        assert.equal(certificate.after, cells.map(c => c.text).join(""));
      }
    }
  }
  assert.deepEqual(seenCertificates, new Set((base.certificates ?? []).map((certificate, i) => {
    assert.equal(certificate.id, i); return i;
  })));
  assert.deepEqual(seenReplacements, new Set((base.certificates ?? []).flatMap(certificate =>
    certificate.replacements.map(entry => `${certificate.id}/${entry.unitId}`))));
  assert.deepEqual(cells, base.cells); assert.equal(cells.map(c => c.text).join(""), base.surface);
  assert.equal(base.unresolvedCells, cells.filter(cell => cell.origin.kind === "rewrite").length);
  const finalIds = new Set(cells.map(c => c.id));
  const lineage = new Set(cells.flatMap(owners));
  const replaced = new Set(cells.filter(c => c.origin.kind !== "selection").flatMap(owners));
  for (const unit of base.units) {
    if (!lineage.has(unit.id) && unit.sourceCellIds.length) {
      const last = [...base.edits].reverse().find(e => e.input.some(c => owners(c).includes(unit.id)));
      if (last && rules.has(last.rule)) add(counts, "dedupAttributedNoLineageUnits");
    }
    const surviving = unit.sourceCellIds.filter(id => finalIds.has(id));
    if (!surviving.length || surviving.length === unit.sourceCellIds.length || replaced.has(unit.id)) continue;
    const missing = new Set(unit.sourceCellIds.filter(id => !finalIds.has(id)));
    const consumedByDedup = base.edits.some(e => rules.has(e.rule) && e.input.some(c => missing.has(c.id)));
    if (!consumedByDedup) continue;
    add(counts, "dedupAttributedPartialSourceUnits");
    if (unit.selected === "th" && surviving.length === 1) add(counts, "dedupAttributedPartialThUnits");
  }
  for (const [event, word] of [
    ["legacyDedupEvents", "wordsWithLegacyDedup"],
    ["uncertifiedDedupDeletions", "wordsWithUncertifiedDedup"],
    ["dedupAttributedNoLineageUnits", "wordsWithDedupNoLineage"],
    ["dedupAttributedPartialSourceUnits", "wordsWithDedupPartialSource"],
    ["dedupAttributedPartialThUnits", "wordsWithDedupPartialTh"],
  ]) if (counts[event]) counts[word] = 1;
  return counts;
}
