import { verifyLexicalSpellingOperations } from "../lexical-spelling-evidence.js";
import { verifyWordPronunciation } from "../pronunciation-evidence.js";
import { replayFinalNuclei } from "../final-nucleus-evidence.js";
import { replayMorphologyPreparation } from "./preparation-evidence.js";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../../index.js";

describe("lexical morphology operation records", () => {
  it("records separate preparation and writing without changing public output or RNG", () => {
    const generator = createGenerator(englishConfig);
    const on = createSeededRng(20260928), off = createSeededRng(20260928);
    let onDraws = 0, offDraws = 0, affixed = 0, bare = 0;
    for (let i = 0; i < 100; i++) {
      const traced = generator.generateWord({ morphology: true, trace: true, rand: () => { onDraws++; return on(); } });
      const plain = generator.generateWord({ morphology: true, rand: () => { offDraws++; return off(); } });
      const trace = traced.trace!;
      expect(trace.pronunciationPasses).toHaveLength(1);
      expect(() => replayFinalNuclei(JSON.parse(JSON.stringify(traced)), englishConfig)).not.toThrow();
      expect(() => verifyWordPronunciation(JSON.parse(JSON.stringify(traced)), englishConfig)).not.toThrow();
      expect(() => verifyLexicalSpellingOperations(JSON.parse(JSON.stringify(traced)), englishConfig)).not.toThrow();
      const prep = trace.morphologyPreparation;
      if (prep) expect(() => replayMorphologyPreparation(JSON.parse(JSON.stringify(traced)), englishConfig)).not.toThrow();
      if (prep?.prepared) {
        affixed++;
        expect(prep.before.written.clean).toBe("");
        expect(prep.after.written.clean).toBe("");
        expect(prep.phonesAfter).toEqual(trace.morphology!.realization!.phoneAssembly);
        const writing = trace.morphologyWriting!;
        expect(writing.before.written).toEqual(trace.writerOutput);
        expect(writing.rolls).toEqual([]);
        expect(writing.before.syllables).toEqual(writing.after.syllables);
        expect(writing.spellingAfter!.surface).toBe(writing.after.written.clean);
        expect(writing.realization!.rootEdits).toEqual(trace.morphology!.realization!.rootEdits);
      } else if (prep) {
        bare++;
        expect(prep.template).toBe("bare");
        expect(prep.before).toEqual(prep.after);
        expect(trace.morphologyWriting).toBeUndefined();
      }
      delete traced.trace;
      expect(traced).toEqual(plain);
      expect(onDraws).toBe(offDraws);
    }
    expect(affixed).toBeGreaterThan(0);
    expect(bare).toBeGreaterThan(0);
    expect(on()).toBe(off());
  });
  it("rejects altered preparation phones, allomorphs, affix indices and draw tapes", () => {
    const word = createGenerator(englishConfig).generateWord({ seed: 435, trace: true, morphology: true });
    expect(word.trace!.morphologyPreparation!.prepared!.prefix!.resolved.written).toBe("im");
    const changes = [
      (copy: typeof word) => { copy.trace!.morphologyPreparation!.phonesBefore!.initial[0].initialSound = "forged"; },
      (copy: typeof word) => { copy.trace!.morphologyPreparation!.prepared!.prefix!.resolved.written = "in"; },
      (copy: typeof word) => { copy.trace!.morphologyPreparation!.configurationIndices.prefix = -1; },
      (copy: typeof word) => { copy.trace!.morphologyPreparation!.rolls.push(0.5); },
      (copy: typeof word) => { copy.trace!.morphologyPreparation!.after.syllables[0].coda[0].sound = "n"; },
    ];
    expect(() => replayMorphologyPreparation(word, englishConfig)).not.toThrow();
    for (const change of changes) {
      const copy = structuredClone(word);
      change(copy);
      expect(() => replayMorphologyPreparation(copy, englishConfig)).toThrow();
    }
  });

  it("rejects altered written attachment and final cell evidence", () => {
    const word = createGenerator(englishConfig).generateWord({ seed: 435, trace: true, morphology: true });
    const mutations = [
      (copy: typeof word) => { copy.trace!.morphologyWriting!.before.written.clean += "x"; },
      (copy: typeof word) => { copy.trace!.morphologyWriting!.after.written.clean += "x"; },
      (copy: typeof word) => { copy.trace!.morphologyWriting!.rolls.push(0.5); },
      (copy: typeof word) => { copy.trace!.morphologyWriting!.spellingAfter!.cells[0].text = "x"; },
      (copy: typeof word) => { copy.trace!.finalWord!.spelling.cells[0].id = 99999; },
      (copy: typeof word) => { copy.written.hyphenated += "x"; },
    ];
    expect(() => verifyLexicalSpellingOperations(word, englishConfig)).not.toThrow();
    for (const mutate of mutations) {
      const copy = structuredClone(word); mutate(copy);
      expect(() => verifyLexicalSpellingOperations(copy, englishConfig)).toThrow();
    }
  });

});
