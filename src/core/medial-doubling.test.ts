import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { Word } from "../types.js";
import type { GraphemeTrace } from "./trace.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";
import { findExample, searchSeeds } from "../test-support/find-example.js";

const rule = "medialOnsetDoubling";

function englishDoubling() {
  assert.ok(englishConfig.doubling);
  return englishConfig.doubling;
}

function medialOnsetPolicy() {
  const policy = englishDoubling().medialOnset;
  assert.ok(policy);
  return policy;
}

function legacyEnglishConfig() {
  const doubling = { ...englishDoubling() };
  delete doubling.medialOnset;
  return { ...englishConfig, doubling };
}

function hasEdit(word: Word, editRule: string): boolean {
  return word.trace?.baseSpelling?.edits.some(edit => edit.rule === editRule) ?? false;
}

function isHardCRepair(word: Word): boolean {
  return word.trace?.baseSpelling?.edits.some(edit =>
    edit.rule === "hardLetter:hard-c" && edit.before === "c" && edit.after === "ck") ?? false;
}

describe("root-internal consonant doubling (#517)", () => {
  it.each([
    { syllableCount: 2, limit: 500 },
    { syllableCount: 3, limit: 1_000 },
  ])(
    "doubles a one-phone medial onset after the stressed short vowel of a $syllableCount-syllable root",
    ({ syllableCount, limit }) => {
      const options = { syllableCount, mode: "lexicon", morphology: false } as const;
      const isDoubled = (selection: GraphemeTrace) =>
        selection.position === "onset" && selection.syllableIndex === 1 && selection.letterRespelled?.rule === rule;
      const { seed, word } = findExample(candidate => candidate.trace!.graphemeSelections.some(isDoubled), {
        property: `a doubled second-syllable onset in a ${syllableCount}-syllable root`, options, limit,
      });
      const legacy = createGenerator(legacyEnglishConfig()).generateWord({ ...options, seed });
      const choice = word.trace!.graphemeSelections.find(isDoubled)!;
      const consonant = choice.phoneme;

      expect(word.pronunciation).toBe(legacy.pronunciation);
      expect(word.syllables[0].stress).toBe("ˈ");
      expect(word.syllables[0].nucleus).toHaveLength(1);
      expect(Object.keys(medialOnsetPolicy().nucleusSpellings)).toContain(word.syllables[0].nucleus[0].sound);
      expect(word.syllables[1].onset.map((phone) => phone.sound)).toEqual([consonant]);

      assert.ok(word.trace?.baseSpelling);
      const ledger = word.trace.baseSpelling;
      expect(choice).toMatchObject({
        selected: consonant,
        letterRespelled: { form: consonant.repeat(2), rule },
      });
      const unit = ledger.units.find((entry) => entry.choiceId === choice.index);
      assert.ok(unit);
      expect(unit.phoneIds).toEqual([choice.index]);
      const edit = ledger.edits.find(entry => entry.rule === rule);
      assert.ok(edit);
      expect(edit.input[0].origin).toMatchObject({ kind: "selection", unitId: unit.id });
      expect(edit.output.map(cell => cell.text)).toEqual([consonant, consonant]);
      expect(verifyBaseSpellingEvidence(ledger, englishConfig).version).toBe(2);
      // The legacy spelling is the same word with the single onset letter.
      const written = word.written.clean;
      expect(legacy.written.clean).toBe(written.slice(0, edit.start) + written.slice(edit.start + 1));

      const untraced = generateWord({ ...options, seed });
      expect(untraced.written).toEqual(word.written);
      expect(untraced.pronunciation).toBe(word.pronunciation);
    },
  );

  it("keeps the legacy spelling of a four-syllable root that the policy would otherwise double", () => {
    const policy = medialOnsetPolicy();
    const longerRoots = createGenerator({
      ...englishConfig,
      doubling: { ...englishDoubling(), medialOnset: { ...policy, probability: { ...policy.probability, longer: 100 } } },
    });
    const { seed, word: doubled } = findExample(candidate => hasEdit(candidate, rule), {
      property: "a four-syllable root doubled when longer roots are enabled",
      generator: longerRoots, options: { syllableCount: 4, mode: "lexicon", morphology: false }, limit: 200,
    });
    const options = { seed, syllableCount: 4, mode: "lexicon", morphology: false } as const;
    const legacy = createGenerator(legacyEnglishConfig()).generateWord(options);
    const word = generateWord(options);

    expect(word.syllables).toHaveLength(4);
    expect(word.pronunciation).toBe(doubled.pronunciation);
    expect(word.written.clean).not.toBe(doubled.written.clean);
    expect(word.written).toEqual(legacy.written);
    expect(word.pronunciation).toBe(legacy.pronunciation);
  });

  it("leaves the slot alone after a hard-letter repair spends the doubling limit", () => {
    // With a limit of two, the same root doubles the slot after the repair.
    const raisedLimit = createGenerator({ ...englishConfig, doubling: { ...englishDoubling(), maxPerWord: 2 } });
    const options = { mode: "lexicon", morphology: false, trace: true } as const;
    const { word, raised } = searchSeeds({
      property: "a hard-c repair before a medial onset doubled only under a raised limit", limit: 15_000,
    }, seed => {
      const raised = raisedLimit.generateWord({ ...options, seed });
      if (!hasEdit(raised, rule) || !isHardCRepair(raised)) return undefined;
      const word = generateWord({ ...options, seed });
      return isHardCRepair(word) ? { word, raised } : undefined;
    });

    expect(englishDoubling().maxPerWord).toBe(1);
    expect(word.trace!.graphemeSelections.some(selection => selection.doubled)).toBe(false);
    expect(hasEdit(word, rule)).toBe(false);
    expect(word.pronunciation).toBe(raised.pronunciation);
    const edit = raised.trace!.baseSpelling!.edits.find(entry => entry.rule === rule)!;
    const written = raised.written.clean;
    expect(word.written.clean).toBe(written.slice(0, edit.start) + written.slice(edit.start + 1));
  });

  it("keeps a medial onset single before a tense vowel", () => {
    // Doubling every eligible two-syllable root, the same root doubles its
    // onset when the guard is off.
    const policy = medialOnsetPolicy();
    const always = (suppressBeforeTense: boolean) => createGenerator({
      ...englishConfig,
      doubling: { ...englishDoubling(), suppressBeforeTense, medialOnset: { ...policy, probability: { ...policy.probability, two: 100 } } },
    });
    const guarded = always(true), unguarded = always(false);
    const options = { syllableCount: 2, mode: "lexicon", morphology: false, trace: true } as const;
    const { word, doubled } = searchSeeds({
      property: "a root doubled before a tense vowel only without the guard", limit: 2_000,
    }, seed => {
      const doubled = unguarded.generateWord({ ...options, seed });
      if (!hasEdit(doubled, rule) || doubled.syllables[1].nucleus[0]?.tense !== true) return undefined;
      const word = guarded.generateWord({ ...options, seed });
      return JSON.stringify(word.lexical) === JSON.stringify(doubled.lexical) ? { word, doubled } : undefined;
    });

    expect(englishDoubling().suppressBeforeTense).toBe(true);
    expect(hasEdit(word, rule)).toBe(false);
    const edit = doubled.trace!.baseSpelling!.edits.find(entry => entry.rule === rule)!;
    const written = doubled.written.clean;
    expect(word.written.clean).toBe(written.slice(0, edit.start) + written.slice(edit.start + 1));
  });

  it("preserves lexical roots and selection over a continuous stream", () => {
    const legacy = createGenerator(legacyEnglishConfig());
    const oldRand = createSeededRng(20261124);
    const newRand = createSeededRng(20261124);
    let visibleDoubles = 0;
    for (let i = 0; i < 1_000; i++) {
      const before = legacy.generateWord({ rand: oldRand, mode: "lexicon", trace: true });
      const after = generateWord({ rand: newRand, mode: "lexicon", trace: true });
      expect(after.lexical).toEqual(before.lexical);
      expect(after.pronunciation).toBe(before.pronunciation);
      expect(after.trace?.selection).toEqual(before.trace?.selection);
      if (after.written.clean !== before.written.clean) {
        visibleDoubles++;
        expect(after.trace?.baseSpelling?.edits).toContainEqual(expect.objectContaining({
          rule: "medialOnsetDoubling",
        }));
      }
    }
    expect(visibleDoubles).toBeGreaterThan(0);
  });

  it("preserves the version 1 certificate context for custom configs without the new policy", () => {
    const config = legacyEnglishConfig();
    const isUnstressedMedialOnset = (entry: { slot: { position: string; syllableIndex: number }; doubling: { stress?: string } }) =>
      entry.slot.position === "onset" && entry.slot.syllableIndex > 0 && entry.doubling.stress === undefined;
    const { word } = findExample(
      candidate => candidate.trace?.baseSpelling?.certificates?.[0]?.contexts.some(isUnstressedMedialOnset) ?? false,
      { property: "a certificate context for an unstressed medial onset", generator: createGenerator(config),
        options: { mode: "lexicon" }, limit: 8_000 },
    );
    assert.ok(word.trace?.baseSpelling?.certificates);
    const base = word.trace.baseSpelling;
    expect(verifyBaseSpellingEvidence(base, config)).toEqual({ version: 2, verifiedCertificates: base.certificates!.length });
    const onset = base.certificates![0].contexts.find(isUnstressedMedialOnset);
    assert.ok(onset);
    const serializedKeys = Object.entries(onset.doubling).flatMap(([key, value]) =>
      value === undefined ? [] : [key],
    );
    expect(serializedKeys).toEqual([
      "phoneme", "position", "prevPhoneme", "nextNucleus", "prevReduced", "isCluster",
      "isFirstInCoda", "isLastPhoneme", "isEndOfWord", "isMonosyllabic", "nextIsConsonant",
    ]);
  });
});
