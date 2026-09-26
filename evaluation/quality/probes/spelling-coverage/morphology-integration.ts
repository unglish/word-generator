import assert from "node:assert/strict";
import type { Word } from "../../../../src/types.js";
import type { MorphologyWrittenPart, ResolvedAffix } from "../../../../src/core/morphology/realization.js";

type Cleanup = (parts: string[], hyphenated: string[], maximum: number) => void;

function cleanup(parts: string[], maximum: number, repair: Cleanup): Word["written"] {
  const cleanParts = parts.filter(Boolean);
  const hyphenated = cleanParts.flatMap((part, index) => index ? ["", part] : [part]);
  repair(cleanParts, hyphenated, maximum);
  return { clean: cleanParts.join(""), hyphenated: hyphenated.join("") };
}

/** Check the Q06 handoff against the unchanged legacy cap implementation. */
export function verifyMorphologyIntegration(original: Word, candidate: Word, maximum: number, repair: Cleanup): boolean {
  const realization = candidate.trace?.morphology?.realization;
  if (realization) {
    assert.deepEqual(realization.assembledParts.map(part => part.role), realization.emittedParts.map(part => part.role));
    for (const role of ["prefix", "suffix"] as const) {
      const selected: ResolvedAffix | undefined = realization[role];
      const part: MorphologyWrittenPart | undefined = realization.assembledParts.find(entry => entry.role === role);
      assert.equal(!!selected, !!part);
      if (selected) {
        assert.equal(selected.planned.written, candidate.trace!.morphology![role]);
        assert.equal(part!.text, selected.resolved.written);
      }
    }
    const source = realization.assembledParts.map(part => part.text).join("");
    const prefix = candidate.trace!.morphology!.prefix ?? "";
    const suffix = candidate.trace!.morphology!.suffix ?? "";
    const root = source.slice(prefix.length, suffix ? -suffix.length : undefined);
    assert.deepEqual(original.written, cleanup([prefix, root, suffix], maximum, repair));
    assert.deepEqual(candidate.written, cleanup(realization.assembledParts.map(part => part.text), maximum, repair));
    assert.equal(realization.emittedParts.map(part => part.text).join(""), candidate.written.clean);
    const expectedParts: MorphologyWrittenPart[] = realization.assembledParts.map(part => ({ ...part }));
    const active = expectedParts.filter(part => part.text);
    const cleaned = active.map(part => part.text);
    repair(cleaned, active.flatMap((part, index) => index ? ["", part.text] : [part.text]), maximum);
    active.forEach((part, index) => { part.text = cleaned[index]; });
    assert.deepEqual(realization.emittedParts, expectedParts);
  } else {
    assert.deepEqual(candidate.written, original.written, "Unattributed non-morphological spelling change");
  }
  const expected = structuredClone(original);
  const actual = structuredClone(candidate);
  if (actual.trace?.morphology) delete actual.trace.morphology.realization;
  actual.written = expected.written;
  assert.deepEqual(actual, expected, "Unexpected word or legacy trace change outside Q06 written handoff");
  return JSON.stringify(original.written) !== JSON.stringify(candidate.written);
}
