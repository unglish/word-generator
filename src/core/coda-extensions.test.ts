import { describe, expect, it } from "vitest";
import { findExample } from "../test-support/find-example.js";
import { englishConfig } from "../config/english.js";
import { lexiconReference } from "../config/lexicon-reference.js";
import type { CodaConstraints, LanguageConfig } from "../config/language.js";
import { createGenerator, generateWords } from "../index.js";

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

describe("audited lexicon root-final codas", () => {
  it("rejects unknown corpus sounds during config validation", () => {
    expect(() => createGenerator({
      ...englishConfig,
      generationWeights: {
        ...englishConfig.generationWeights,
        codaLength: {
          ...englishConfig.generationWeights.codaLength,
          rootFinalByMode: { lexicon: { counts: { "not-a-phone": 1 }, lengths: {} } },
        },
      },
    })).toThrow("contains unknown phoneme \"not-a-phone\"");
  });

  it("applies hard blocks, regex bans, and sonority to audited draws", () => {
    const two = { 1: { 3: [[2, 1]] as const } };
    const config: LanguageConfig = {
      ...englishConfig,
      phonemeLengthWeights: { ...englishConfig.phonemeLengthWeights, lexicon: [[3, 1]] },
      phonemeToSyllableWeights: { ...englishConfig.phonemeToSyllableWeights, lexicon: { 3: [[1, 1]] } },
      invalidClusters: { ...englishConfig.invalidClusters, coda: ["nt"] },
      generationWeights: {
        ...englishConfig.generationWeights,
        codaLength: {
          ...englishConfig.generationWeights.codaLength,
          rootFinalByMode: {
            lexicon: { counts: { "b,z": 100, "g,z": 100, "n,t": 100, "m,l": 100, "k,t": 1 }, lengths: two },
          },
        },
      },
    };
    const generator = createGenerator(config);
    for (let seed = 0; seed < 60; seed++) {
      const word = generator.generateWord({ seed, mode: "lexicon", morphology: false });
      expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual(["k", "t"]);
    }
  });

  it.each([false, true])("uses only audited multi-codas with morphology=%s", morphology => {
    const attested = new Set(Object.keys(lexiconReference.finalCodaCounts));
    const words = generateWords(10_000, { seed: 491, morphology, trace: true, mode: "lexicon" });
    let clusters = 0;
    let consonantSibilants = 0;
    for (const word of words) {
      const trace = word.trace!;
      const root = trace.stages.find(stage => stage.name === "repairNucleusWordPositions")!.after;
      const coda = root.at(-1)!.coda;
      if (coda.length > 1) {
        clusters++;
        expect(attested.has(coda.join(",")), word.written.clean).toBe(true);
        expect(coda.join(",")).not.toMatch(/(?:^|,)(?:b|g),z$/);
        expect(new Set(coda).size).toBe(coda.length);
        if (coda.at(-1) === "s" || coda.at(-1) === "z") consonantSibilants++;
      }
      const realization = trace.morphology?.realization;
      const added = (realization?.prefix?.resolved.syllableCount ?? 0)
        + (realization?.suffix?.resolved.syllableCount ?? 0);
      expect(root).toHaveLength(trace.syllableCount);
      expect(word.syllables).toHaveLength(root.length + added);
    }
    expect(clusters).toBeGreaterThan(1000);
    expect(consonantSibilants / words.length).toBeLessThan(0.05);
  });
});

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

  // Shapes reported in #313's root-only integration discussion (rens, wacs,
  // wacts + ly, dantitkishorcstion). Historical spellings/draws are evidence;
  // the tests locate the proposal and affix anew. Default morphology picks
  // -tion for only one in a few thousand of these roots, hence its larger bound.
  it.each([
    { shape: "ns", morphology: "bare", coda: ["n", "s"], suffix: undefined, limit: 2_000 },
    { shape: "ks", morphology: "bare", coda: ["k", "s"], suffix: undefined, limit: 2_000 },
    { shape: "kts", morphology: "-ly", coda: ["k", "t", "s"], suffix: "ly", limit: 2_000 },
    { shape: "rks", morphology: "-tion", coda: ["r", "k", "s"], suffix: "tion", limit: 12_000 },
  ])("preserves root coda $shape under default morphology ($morphology)", ({ coda, suffix, limit }) => {
    const generator = extensionGenerator({ coda, clusters: [coda], finalS: 100 });
    const { word } = findExample(word => {
      const morphology = word.trace!.morphology;
      return (suffix ? morphology?.suffix === suffix : morphology?.template === "bare")
        && word.trace!.structural.some(event => event.event === "codaExtensionRejected"
          && event.coda.join() === coda.join() && event.candidate === "s");
    }, {
      generator, property: `final-s proposal after /${coda.join("")}/ with ${suffix ?? "bare"} morphology`,
      limit, options: { syllableCount: 1 },
    });
    expect(word.trace!.structural).toContainEqual(expect.objectContaining({
      event: "codaExtensionRejected", extension: "finalS", coda, candidate: "s", reason: "repetition",
    }));
    const generated = word.trace!.stages.find(stage => stage.name === "generateSyllables")!;
    expect(generated.after).toHaveLength(1);
    expect(generated.after[0].coda).toEqual(coda);
    expect(word.trace!.structural.some(event => event.event === "finalS")).toBe(false);
    // The requested single syllable and phoneme target describe the root even
    // when the default morphology planner chooses a syllabic suffix.
    expect(word.trace!.selection!.selected.syllables).toBe(1);
    expect(word.trace!.targetPhonemeCount).toBe(coda.length + 2);
    if (suffix) expect(word.syllables.length).toBeGreaterThan(1);
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

  it.each(["d", "z"])("does not repair away voiced root /%s/ to admit final /s/", sound => {
    const word = wordFor({ coda: [sound], clusters: [[sound, "s"]], finalS: 100 });
    expect(word.syllables[0].coda.map(phoneme => phoneme.sound)).toEqual([sound]);
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

  it("keeps root-stage codas duplicate-free with default morphology and root-only budgets", { timeout: 30_000 }, () => {
    const words = generateWords(30_000, { seed: 1, mode: "text", trace: true });
    let affixed = 0;
    let rejections = 0;
    for (const word of words) {
      const generated = word.trace!.stages.find(stage => stage.name === "generateSyllables")!;
      for (const syllable of generated.after) {
        for (let i = 1; i < syllable.coda.length; i++) expect(syllable.coda[i]).not.toBe(syllable.coda[i - 1]);
      }
      affixed += Number(word.trace!.summary.morphologyApplied);
      rejections += word.trace!.structural.filter(event => event.event === "codaExtensionRejected").length;
    }
    expect(affixed).toBeGreaterThan(0);
    expect(rejections).toBeGreaterThan(0);
  });

  it("produces no adjacent duplicate coda phones in a 20,000-word bare text stream", { timeout: 30_000 }, () => {
    const words = generateWords(20_000, { seed: 20260926, morphology: false, trace: true, mode: "text" });
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
