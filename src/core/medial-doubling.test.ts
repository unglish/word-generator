import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, generateWord } from "../index.js";
import type { WordGenerationOptions } from "../types.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";

function legacyEnglishConfig() {
  assert.ok(englishConfig.doubling);
  const doubling = { ...englishConfig.doubling };
  delete doubling.medialOnset;
  return { ...englishConfig, doubling };
}

describe("root-internal consonant doubling (#517)", () => {
  it.each([
    {
      seed: 1815,
      syllableCount: 2,
      before: "idur",
      after: "iddur",
      pronunciation: "ˈɪ.dɚ",
      vowel: "ɪ",
      consonant: "d",
    },
    {
      seed: 628,
      syllableCount: 3,
      before: "habinga",
      after: "habbinga",
      pronunciation: "ˈhæ.bɪŋ.ə",
      vowel: "æ",
      consonant: "b",
    },
  ])(
    "writes $after with one onset phone after the stressed short vowel",
    ({ seed, syllableCount, before, after, pronunciation, vowel, consonant }) => {
      const options = { seed, syllableCount, mode: "lexicon", morphology: false } satisfies WordGenerationOptions;
      const legacy = createGenerator(legacyEnglishConfig()).generateWord(options);
      const word = generateWord({ ...options, trace: true });

      expect(legacy.written.clean).toBe(before);
      expect(word.written.clean).toBe(after);
      expect(legacy.pronunciation).toBe(pronunciation);
      expect(word.pronunciation).toBe(pronunciation);
      expect(word.syllables[0].stress).toBe("ˈ");
      expect(word.syllables[0].nucleus.map((phone) => phone.sound)).toEqual([vowel]);
      expect(word.syllables[1].stress).toBeUndefined();
      expect(word.syllables[1].onset.map((phone) => phone.sound)).toEqual([consonant]);

      assert.ok(word.trace?.baseSpelling);
      const ledger = word.trace.baseSpelling;
      const choice = word.trace.graphemeSelections.find(
        (selection) => selection.position === "onset" && selection.syllableIndex === 1,
      );
      assert.ok(choice);
      expect(choice).toMatchObject({
        phoneme: consonant,
        selected: consonant,
        emitted: consonant.repeat(2),
        doubled: true,
      });
      const unit = ledger.units.find((entry) => entry.choiceId === choice.index);
      assert.ok(unit);
      expect(unit.phoneIds).toEqual([choice.index]);
      expect(ledger.cells.filter(
        (cell) => cell.origin.kind === "selection" && cell.origin.unitId === unit.id,
      ).map((cell) => cell.text)).toEqual([consonant, consonant]);

      const untraced = generateWord(options);
      expect(untraced.written).toEqual(word.written);
      expect(untraced.pronunciation).toBe(pronunciation);
    },
  );

  it.each([
    { seed: 73, spelling: "mideald", consonant: "d", reason: "roll-failed" },
    { seed: 168, spelling: "geleesh", consonant: "l", reason: "suppress-before-tense" },
  ])("keeps the singleton in $spelling", ({ seed, spelling, consonant, reason }) => {
    const word = generateWord({ seed, syllableCount: 2, mode: "lexicon", morphology: false, trace: true });
    expect(word.written.clean).toBe(spelling);
    expect(word.trace?.graphemeSelections).toContainEqual(expect.objectContaining({
      syllableIndex: 1,
      position: "onset",
      selected: consonant,
      emitted: consonant,
      doubled: false,
      doubling: expect.objectContaining({ reason }),
    }));
  });

  it("keeps the legacy spelling of a four-syllable root", () => {
    const options = { seed: 50, syllableCount: 4, mode: "lexicon", morphology: false } as const;
    const legacy = createGenerator(legacyEnglishConfig()).generateWord(options);
    const word = generateWord(options);

    expect(word.syllables).toHaveLength(4);
    expect(word.written.clean).toBe("ledictita");
    expect(word.written).toEqual(legacy.written);
    expect(word.pronunciation).toBe(legacy.pronunciation);
  });

  it("preserves the version 1 certificate context for custom configs without the new policy", () => {
    const config = legacyEnglishConfig();
    const word = createGenerator(config).generateWord({ seed: 3073, mode: "lexicon", trace: true });
    expect(word.written.clean).toBe("riguelin");
    assert.ok(word.trace?.baseSpelling);
    const base = word.trace.baseSpelling;
    expect(verifyBaseSpellingEvidence(base, config)).toEqual({ version: 2, verifiedCertificates: 1 });
    const onset = base.certificates?.[0]?.contexts.find(
      (entry) => entry.slot.position === "onset" && entry.slot.syllableIndex === 2,
    );
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
