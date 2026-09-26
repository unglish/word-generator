import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../../../../src/index.js";
import type { LanguageConfig } from "../../../../src/index.js";
import type { Word } from "../../../../src/types.js";
import { canonical } from "../../serialization.js";
import { activePolicy, analysisName, emptyQuantityObservation, observeQuantity, quantities, reconcileQuantity, verifyActivationConfig } from "./observe.js";

function config(active: boolean): LanguageConfig {
  const replacement = new Map(englishConfig.phonemes.map(phone => {
    const copy = { ...phone };
    delete copy.nuclearQuantity;
    const quantity = quantities.get(phone.sound);
    if (active && quantity !== undefined) copy.nuclearQuantity = { analysis: analysisName, moras: quantity };
    return [phone, copy];
  }));
  const maps = englishConfig.phonemeMaps;
  const remap = (map: typeof maps.onset): typeof maps.onset => new Map([...map].map(([key, phones]) => [key, phones.map(phone => replacement.get(phone)!)]));
  const stress = { ...englishConfig.pronunciation.stress };
  delete stress.syllableWeight;
  if (active) stress.syllableWeight = { ...activePolicy };
  return { ...englishConfig, phonemes: [...replacement.values()], phonemeMaps: { onset: remap(maps.onset), nucleus: remap(maps.nucleus), coda: remap(maps.coda) }, pronunciation: { ...englishConfig.pronunciation, stress } };
}

describe("partial quantity observer", () => {
  it("checks declared custom-model outcomes and reconciles every counted segment", () => {
    const generator = createGenerator(config(true));
    const rand = createSeededRng(77);
    const result = emptyQuantityObservation("candidate");
    for (let draw = 0; draw < 200; draw++) {
      const word = generator.generateWord({ rand, syllableCount: 3, morphology: false, trace: true });
      const snapshot = JSON.stringify(word);
      observeQuantity(word, draw, result);
      expect(JSON.stringify(word)).toBe(snapshot);
    }
    reconcileQuantity(result);
    expect(result.words).toBe(200);
    expect(result.legacyDisagreements).toBeGreaterThan(0);
    expect(result.quantity["known:1"]).toBeGreaterThan(0);
    expect(result.quantity["known:2"]).toBeGreaterThan(0);
    expect(result.quantity["unknown:unspecified"]).toBeGreaterThan(0);
    expect(Object.values(result.openDiphthongs).every(vowel => vowel.light === 0)).toBe(true);
    result.quantity["known:1"]++;
    expect(() => reconcileQuantity(result)).toThrow();
  });

  it("keeps original decision fields unavailable while retaining root eligibility", () => {
    const generator = createGenerator(config(false));
    const rand = createSeededRng(77);
    const original = emptyQuantityObservation("original");
    const control = emptyQuantityObservation("control");
    for (let draw = 0; draw < 50; draw++) {
      const word = generator.generateWord({ rand, morphology: true, trace: true });
      observeQuantity(word, draw, control);
      const historical = structuredClone(word);
      delete historical.trace!.stressWeight;
      observeQuantity(historical, draw, original);
    }
    reconcileQuantity(original);
    reconcileQuantity(control);
    expect(original.unavailableDecisionWords).toBe(50);
    expect(original.quantity).toEqual({ unavailable: original.nuclearSegments });
    for (const [sound, vowel] of Object.entries(original.openDiphthongs)) {
      expect(vowel.light).toBeNull();
      expect(vowel.primarySelected).toBeNull();
      expect(vowel.eligible).toBe(control.openDiphthongs[sound].eligible);
    }
  });

  it("rejects incorrect quantity and light classification for an open diphthong", () => {
    const generator = createGenerator(config(true));
    let witness: Word | undefined;
    for (let seed = 0; seed < 200 && !witness; seed++) {
      const word = generator.generateWord({ seed, morphology: false, syllableCount: 3, trace: true });
      if (word.trace!.stressWeight!.syllables.some(s => s.coda.length === 0 && s.nucleusMoras === 2)) witness = word;
    }
    expect(witness).toBeDefined();
    const changed = structuredClone(witness!);
    const syllable = changed.trace!.stressWeight!.syllables.find(s => s.coda.length === 0 && s.nucleusMoras === 2)!;
    syllable.operational.weight = "light";
    expect(() => observeQuantity(changed, 0, emptyQuantityObservation("candidate"))).toThrow();
    syllable.operational.weight = "heavy";
    syllable.nucleus[0].quantity = { status: "known", moras: 1 };
    expect(() => observeQuantity(changed, 0, emptyQuantityObservation("candidate"))).toThrow();
  });

  it("rejects missing decision evidence and mismatched root coordinates", () => {
    const word = createGenerator(config(true)).generateWord({ seed: 9, trace: true, morphology: false });
    word.trace!.stressWeight!.syllables[0].syllableIndex = 100;
    expect(() => observeQuantity(word, 0, emptyQuantityObservation("candidate"))).toThrow();
    delete word.trace!.stressWeight;
    expect(() => observeQuantity(word, 0, emptyQuantityObservation("candidate"))).toThrow(/Missing shared/);
  });

  it("permits only registered metadata/policy additions in the effective configuration", () => {
    expect(() => verifyActivationConfig(canonical(config(false)), canonical(config(true)))).not.toThrow();
    const changed = config(true);
    changed.pronunciation.stress.secondary = { ...changed.pronunciation.stress.secondary, probability: 99 };
    expect(() => verifyActivationConfig(canonical(config(false)), canonical(changed))).toThrow(/Configuration changed/);
    const wrongUnknown = config(true);
    wrongUnknown.phonemes.find(phone => phone.sound === "ɜ")!.nuclearQuantity = { analysis: analysisName, moras: 1 };
    expect(() => verifyActivationConfig(canonical(config(false)), canonical(wrongUnknown))).toThrow();
  });
});
