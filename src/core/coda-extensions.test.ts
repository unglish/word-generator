import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import type { CodaConstraints, LanguageConfig } from "../config/language.js";
import { createGenerator, generateWords } from "./generate.js";

interface Fixture {
  coda: string[];
  clusters?: string[][];
  finalS?: number;
  nasalStopExtension?: number;
  maxCoda?: number;
  appendants?: string[];
  constraints?: CodaConstraints;
  extraSounds?: string[];
  invalidCoda?: string[];
  clusterWeights?: Record<string, number>;
  targetPhonemes?: number;
  disabledCodaSounds?: string[];
  omittedCodaSounds?: string[];
}

function extensionGenerator(fixture: Fixture) {
  const sounds = [...new Set([...fixture.coda, ...(fixture.extraSounds ?? []), "s"])];
  const codaPhonemes = sounds.map(sound => ({
    ...englishConfig.phonemes.find(phoneme => phoneme.sound === sound)!,
    coda: fixture.disabledCodaSounds?.includes(sound) ? 0 : sound === fixture.coda[0] ? 1_000_000 : 1,
    startWord: 1, midWord: 1, endWord: 1,
  }));
  const maxCoda = fixture.maxCoda ?? fixture.coda.length;
  const target = fixture.targetPhonemes ?? fixture.coda.length + 2;
  const lengthWeights: [number, number][] = [[fixture.coda.length, 1]];
  const emptyOnset: [number, number][] = [[0, 1]];
  const config: LanguageConfig = {
    ...englishConfig,
    phonemes: [...englishConfig.phonemes, ...codaPhonemes],
    phonemeMaps: {
      ...englishConfig.phonemeMaps,
      nucleus: new Map([["ɑ", englishConfig.phonemeMaps.nucleus.get("ɑ")!]]),
      coda: new Map(codaPhonemes
        .filter(phoneme => !fixture.omittedCodaSounds?.includes(phoneme.sound))
        .map(phoneme => [phoneme.sound, [phoneme]])),
    },
    invalidClusters: { ...englishConfig.invalidClusters, coda: fixture.invalidCoda ?? [] },
    clusterConstraint: undefined,
    pronunciation: {
      ...englishConfig.pronunciation,
      aspiration: {
        enabled: false,
        targets: [{ segment: "onset" }],
        rules: [{ id: "disabled", when: {}, probability: 0 }],
        fallbackProbability: 0,
      },
    },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 0, maxCodaLength: maxCoda, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[target, 1]], lexicon: [[target, 1]] },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: emptyOnset, followingNucleus: emptyOnset, default: emptyOnset, long: emptyOnset },
      codaLength: {
        monosyllabic: { 0: lengthWeights }, monosyllabicDefault: lengthWeights,
        polysyllabicNonzero: lengthWeights, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0,
      },
      probability: {
        ...englishConfig.generationWeights.probability,
        finalS: fixture.finalS ?? 0,
        nasalStopExtension: fixture.nasalStopExtension ?? 0,
      },
    },
    clusterWeights: fixture.clusterWeights ? { coda: fixture.clusterWeights } : undefined,
    codaConstraints: {
      allowedFinal: sounds,
      voicingAgreement: true,
      homorganicNasalStop: true,
      ...fixture.constraints,
    },
    clusterLimits: {
      maxOnset: 0, maxCoda,
      codaAppendants: fixture.appendants ?? ["s"],
      attestedCodas: fixture.clusters,
    },
  };
  return createGenerator(config);
}

function wordFor(fixture: Fixture) {
  return extensionGenerator(fixture).generateWord({ seed: 913, syllableCount: 1, morphology: false, trace: true });
}

describe("coda extensions preserve configured legality", () => {
  it("rejects /s/ → /ss/ even with a 100% final-s probability", () => {
    const word = wordFor({ coda: ["s"], clusters: [["s", "s"]], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["s"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", extension: "finalS", coda: ["s"], candidate: "s", reason: "repetition",
    }));
    expect(word.trace!.structural.some(event => event.event === "finalS")).toBe(false);
  });

  it("rejects /ks/ → /kss/ without deleting any existing coda segment", () => {
    const word = wordFor({ coda: ["k", "s"], clusters: [["k", "s"], ["k", "s", "s"]], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k", "s"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", coda: ["k", "s"], candidate: "s", reason: "repetition",
    }));
  });

  it("builds the attested continuation /ks/ → /kst/", () => {
    const word = wordFor({ coda: ["k", "s", "t"], clusters: [["k", "s", "t"]] });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k", "s", "t"]);
  });

  it("preserves separated /s/ repetitions in attested /kst/ → /ksts/", () => {
    const word = wordFor({ coda: ["k", "s", "t"], clusters: [["k", "s", "t"], ["k", "s", "t", "s"]], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k", "s", "t", "s"]);
    expect(word.trace!.structural.some(event => event.event === "finalS")).toBe(true);
  });

  it("allows the same attested separated repetition during normal coda building", () => {
    const word = wordFor({ coda: ["s", "t", "s"], clusters: [["s", "t", "s"]] });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["s", "t", "s"]);
  });

  it("does not treat a listed prefix as a licensed complete extension", () => {
    const word = wordFor({ coda: ["k"], clusters: [["k", "s", "t"]], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", candidate: "s", reason: "attestation",
    }));
  });

  it.each([
    ["length", { appendants: [] }],
    ["banned-coda", { constraints: { bannedCodas: ["s"] } }],
    ["word-final", { constraints: { allowedFinal: ["k"] } }],
    ["nucleus-coda", { constraints: { bannedNucleusCodaCombinations: [{ nucleus: ["ɑ"], coda: ["s"] }] } }],
  ] satisfies [string, Partial<Fixture>][])("enforces %s constraints before final-s extension", (reason, options) => {
    const word = wordFor({ coda: ["k"], clusters: [["k", "s"]], finalS: 100, ...options });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", candidate: "s", reason,
    }));
  });

  it("does not repair away a voiced root stop to admit final /s/", () => {
    const word = wordFor({ coda: ["d"], clusters: [["d", "s"]], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["d"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", candidate: "s", reason: "voicing",
    }));
    expect(word.trace!.repairs.some(repair => repair.rule === "repairClusterShape:voicingAgreement")).toBe(false);
  });

  it("respects cluster-specific suppression of a legal final-s extension", () => {
    const word = wordFor({ coda: ["k"], clusters: [["k", "s"]], finalS: 100, clusterWeights: { "k,s": 0 } });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k"]);
    expect(word.trace!.structural.some(event => event.event === "finalS")).toBe(false);
  });

  it("uses configured pattern bans when there is no attested-cluster inventory", () => {
    const word = wordFor({ coda: ["k"], invalidCoda: ["ks"], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", candidate: "s", reason: "pattern",
    }));
  });

  it("respects the candidate's positional licensing", () => {
    const word = wordFor({ coda: ["k"], clusters: [["k", "s"]], disabledCodaSounds: ["s"], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", candidate: "s", reason: "position",
    }));
  });

  it("does not introduce a segment absent from the configured coda inventory", () => {
    const word = wordFor({ coda: ["k"], clusters: [["k", "s"]], omittedCodaSounds: ["s"], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["k"]);
    expect(word.trace!.structural.some(event => event.event === "finalS")).toBe(false);
  });

  it("checks homorganic nasal-stop features during normal cluster building too", () => {
    const word = wordFor({ coda: ["n", "k"], clusters: [["n", "k"]] });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["n"]);
    expect(word.trace!.repairs.some(repair => repair.rule === "repairClusterShape:homorganicNasalStop")).toBe(false);
  });

  it("adds a licensed voiced homorganic stop and retains both phones", () => {
    const word = wordFor({ coda: ["n"], clusters: [["n", "d"]], extraSounds: ["d"], maxCoda: 2, targetPhonemes: 2, nasalStopExtension: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["n", "d"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "nasalStopExtension", nasal: "n", appendedStop: "d",
    }));
  });

  it("does not invent an unlisted nasal-stop coda", () => {
    const word = wordFor({ coda: ["ŋ"], clusters: [["ŋ", "k"]], extraSounds: ["g"], maxCoda: 2, nasalStopExtension: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["ŋ"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", extension: "nasalStopExtension", candidate: "g", reason: "attestation",
    }));
  });

  it("does not exceed coda limits with a homorganic stop", () => {
    const word = wordFor({ coda: ["n"], clusters: [["n", "d"]], extraSounds: ["d"], nasalStopExtension: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual(["n"]);
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", extension: "nasalStopExtension", candidate: "d", reason: "length",
    }));
  });

  it("keeps traced generation deterministic and tracing observational", () => {
    const generator = extensionGenerator({ coda: ["s"], clusters: [["s", "s"]], finalS: 100 });
    const options = { seed: 913, syllableCount: 1, morphology: false };
    const plain = generator.generateWord(options);
    const traced = generator.generateWord({ ...options, trace: true });
    expect({ ...traced, trace: undefined }).toEqual(plain);
    expect(generator.generateWord({ ...options, trace: true })).toEqual(traced);
  });

  it("produces no adjacent duplicate coda phones in a 20,000-word bare stream", { timeout: 30_000 }, () => {
    const words = generateWords(20_000, { seed: 20260926, morphology: false, trace: true });
    let extensions = 0;
    let rejectedRepeats = 0;
    for (const word of words) {
      for (const syllable of word.syllables) {
        for (let i = 1; i < syllable.coda.length; i++) expect(syllable.coda[i].sound).not.toBe(syllable.coda[i - 1].sound);
      }
      extensions += word.trace!.structural.filter(event => event.event === "finalS" || event.event === "nasalStopExtension").length;
      rejectedRepeats += word.trace!.structural.filter(event => event.event === "codaExtensionRejected" && event.reason === "repetition").length;
    }
    expect(extensions).toBeGreaterThan(0);
    expect(rejectedRepeats).toBeGreaterThan(0);
  });
});
