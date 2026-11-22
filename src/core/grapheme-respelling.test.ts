import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";

// A spelling-budget certificate replaces whole grapheme units after selection
// (#454: aue·n·ce was written "ons"). Each replaced selection must say so, so
// `graphemeSelections` alone shows which selected forms reached the surface.

const SAMPLE = 10000;

interface Replacement { form: string; certificateId: number; selected: string }

/** Certificate replacements keyed by grapheme-decision index, from base-spelling provenance. */
function certifiedReplacements(word: Word): Map<number, Replacement> {
  const base = word.trace!.baseSpelling;
  const replaced = new Map<number, Replacement>();
  for (const certificate of base?.certificates ?? []) {
    for (const replacement of certificate.replacements) {
      const unit = base!.units[replacement.unitId];
      replaced.set(unit.choiceId, { form: replacement.after, certificateId: certificate.id, selected: unit.selected });
    }
  }
  return replaced;
}

describe("respelled grapheme selections (#454)", () => {
  const words = generateWords(SAMPLE, { seed: 454, morphology: false, trace: true });

  it("marks exactly the selections a certificate replaced, and keeps the original choice", () => {
    let marked = 0;
    for (const word of words) {
      const replaced = certifiedReplacements(word);
      for (const selection of word.trace!.graphemeSelections) {
        const replacement = replaced.get(selection.index);
        expect(selection.respelled).toEqual(replacement && { form: replacement.form, certificateId: replacement.certificateId });
        if (!replacement) continue;
        marked++;
        expect(selection.selected).toBe(replacement.selected);
      }
    }
    expect(marked).toBeGreaterThan(5);
  });

  it("explains a respelled word-final ce/se from graphemeSelections alone", () => {
    // Exercise the shared spelling path in text mode, where the longer coda forms still occur.
    const examples: Word[] = [];
    for (let seed = 0; seed < 22000; seed++) {
      const word = generateWord({ seed, morphology: false, trace: true, mode: "text" });
      const last = word.trace!.graphemeSelections.at(-1)!;
      if (last.phoneme === "s" && ["ce", "se"].includes(last.selected) && last.respelled) examples.push(word);
    }
    expect(examples.length).toBeGreaterThan(0);
    for (const word of examples) {
      const last = word.trace!.graphemeSelections.at(-1)!;
      expect(word.written.clean.endsWith(last.emitted)).toBe(false);
      expect(word.written.clean.endsWith(last.respelled!.form)).toBe(true);
    }
  });

  it("does not change output, and repeats with the seed", () => {
    const untraced = generateWords(SAMPLE, { seed: 454, morphology: false });
    expect(untraced.map(word => word.written.clean)).toEqual(words.map(word => word.written.clean));
    const again = generateWords(SAMPLE, { seed: 454, morphology: false, trace: true });
    expect(again.map(word => word.trace!.graphemeSelections)).toEqual(words.map(word => word.trace!.graphemeSelections));
  });
});
