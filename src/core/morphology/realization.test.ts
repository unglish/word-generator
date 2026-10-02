import { serializeTraceEvidence } from "../trace-evidence.js";
import { verifyBareWordOperations } from "../bare-word-evidence.js";
import { verifyMorphologyOperations } from "./operation-evidence.js";
import { verifyConfiguredAllomorphs } from "./allomorph-evidence.js";
import { verifyFinalWordSourceLinks } from "../final-word-sources.js";
import { replayFinalPhones } from "../final-phones.js";
import { replayFinalSpelling } from "../final-spelling.js";
import { replaySpellingEdits } from "../spelling-regex-edits.js";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, generateWord } from "../../index.js";
import { englishConfig } from "../../config/english.js";
import type { Affix, LanguageConfig } from "../../config/language.js";
import type { Grapheme } from "../../types.js";

const prefixIn = englishConfig.morphology!.prefixes.find(affix => affix.written === "in")!;
const suffixNamed = (written: string) => englishConfig.morphology!.suffixes.find(affix => affix.written === written)!;

function customAffix(type: "prefix" | "suffix", planned: string, resolved: string): Affix {
  const form = { phonemes: ["ɪ", "n"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }], syllableCount: 1 };
  return {
    ...form, type, written: planned, frequency: 1, stressEffect: "none",
    allomorphs: [{ ...form, written: resolved, phonologicalCondition: { position: type === "prefix" ? "following" : "preceding" } }],
  };
}

function fixedRoot(options: { prefix?: Affix; suffix?: Affix; onset?: string; coda?: string; maxConsonants?: number } = {}) {
  const { prefix, suffix, onset = "b", coda = "t", maxConsonants = 3 } = options;
  const glyph = (phoneme: string, form: string): Grapheme => ({ phoneme, form, frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1 });
  const onsetGlyph = glyph(onset, onset);
  const nucleusGlyph = glyph("ɑ", "a");
  const codaGlyph = glyph(coda, coda);
  const one: [number, number][] = [[1, 1]];
  const template = prefix ? suffix ? "both" : "prefixed" : "suffixed";
  const weights = { bare: 0, prefixed: 0, suffixed: 0, both: 0, [template]: 1 };
  const target = 3 + (prefix?.phonemes.length ?? 0) + (suffix?.phonemes.length ?? 0);
  const config: LanguageConfig = {
    ...englishConfig,
    phonemeMaps: {
      onset: new Map([[onset, [englishConfig.phonemes.find(phoneme => phoneme.sound === onset)!]]]),
      nucleus: new Map([["ɑ", [englishConfig.phonemes.find(phoneme => phoneme.sound === "ɑ")!]]]),
      coda: new Map([[coda, [englishConfig.phonemes.find(phoneme => phoneme.sound === coda)!]]]),
    },
    graphemes: [onsetGlyph, nucleusGlyph, codaGlyph],
    graphemeMaps: { onset: new Map([[onset, [onsetGlyph]]]), nucleus: new Map([["ɑ", [nucleusGlyph]]]), coda: new Map([[coda, [codaGlyph]]]) },
    clusterConstraint: undefined,
    clusterWeights: undefined,
    clusterLimits: { maxOnset: 1, maxCoda: 1 },
    codaConstraints: { allowedFinal: [coda] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[target, 1]], lexicon: [[target, 1]] },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 },
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false },
    },
    morphology: { ...englishConfig.morphology!, prefixes: prefix ? [prefix] : [], suffixes: suffix ? [suffix] : [], templateWeights: { text: weights, lexicon: weights } },
    sharedSpellings: undefined, doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
    writtenFormConstraints: { ...englishConfig.writtenFormConstraints, policy: undefined, maxConsonantLetters: maxConsonants },
  };
  const generator = createGenerator(config);
  const generation = { seed: 13, morphology: true, syllableCount: 1 + (prefix?.syllableCount ?? 0) + (suffix?.syllableCount ?? 0) };
  return { generator, config, generation, word: () => generator.generateWord({ ...generation, trace: true }) };
}

describe("resolved morphology survives final cleanup", () => {
  it("retains the dependency seed-435 im spelling and records planned versus selected forms", () => {
    const word = generateWord({ seed: 435, trace: true });
    expect(word.written.clean).toBe("immorn");
    expect(word.trace!.morphology!.prefix).toBe("in");
    const selection = word.trace!.morphology!.realization!.prefix!;
    expect(selection.planned.written).toBe("in");
    expect(selection.resolved.written).toBe("im");
    expect(selection.resolved.phonemes).toEqual(["ɪ", "m"]);
    expect(selection.boundaryPhoneme!.sound).toBe("m");
    expect(selection.allomorphIndex).toBe(0);
    expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual(["m"]);
  });

  it.each([["b", "im", 0], ["m", "im", 0], ["t", "in", null], ["l", "in", null]] as const)(
    "selects the configured default prefix before /%s/", (onset, spelling, index) => {
      const word = fixedRoot({ prefix: prefixIn, onset }).word();
      expect(word.written.clean).toBe(`${spelling}${onset}at`);
      expect(word.trace!.morphology!.realization!.prefix!.allomorphIndex).toBe(index);
    },
  );

  it.each(["l", "r"])("preserves explicitly configured i%s assimilation without adding it to defaults", sound => {
    const prefix: Affix = {
      ...prefixIn,
      allomorphs: [{ phonologicalCondition: { position: "following", sounds: [sound] }, written: `i${sound}`, phonemes: ["ɪ", sound], syllables: [{ onset: [], nucleus: ["ɪ"], coda: [sound] }], syllableCount: 1 }],
    };
    const word = fixedRoot({ prefix, onset: sound }).word();
    expect(word.written.clean).toBe(`i${sound}${sound}at`);
    expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual([sound]);
  });

  it.each([
    ["prefix", "un", "over"], ["prefix", "over", "a"],
    ["suffix", "s", "ous"], ["suffix", "ness", "y"],
  ] as const)("preserves a %s variant of different written length: %s → %s", (type, planned, resolved) => {
    const word = fixedRoot({ [type]: customAffix(type, planned, resolved) }).word();
    expect(word.written.clean).toBe(type === "prefix" ? `${resolved}bat` : `bat${resolved}`);
    const parts = word.trace!.morphology!.realization!.emittedParts;
    expect(parts.find(part => part.role === "root")!.text).toBe("bat");
    expect(parts.find(part => part.role === type)!.text).toBe(resolved);
  });

  it("preserves both different-length variants around the same root", () => {
    const word = fixedRoot({ prefix: customAffix("prefix", "over", "a"), suffix: customAffix("suffix", "s", "ous") }).word();
    expect(word.written.clean).toBe("abatous");
    expect(word.trace!.morphology!.realization!.assembledParts).toEqual([
      { role: "prefix", text: "a" }, { role: "root", text: "bat" }, { role: "suffix", text: "ous" },
    ]);
  });

  it.each([
    ["ed", "t", 2, ["ɪ", "d"], 1], ["ed", "k", 0, ["t"], 0], ["ed", "m", 1, ["d"], 0],
    ["s", "s", 2, ["ɪ", "z"], 1], ["s", "k", 0, ["s"], 0], ["s", "m", 1, ["z"], 0],
  ] satisfies [string, string, number, string[], number][])(
    "preserves %s after /%s/, with original variant index %i", (suffix, coda, index, phones, syllables) => {
      const word = fixedRoot({ suffix: suffixNamed(suffix), coda }).word();
      const selected = word.trace!.morphology!.realization!.suffix!;
      expect(selected.allomorphIndex).toBe(index);
      expect(selected.resolved.phonemes).toEqual(phones);
      expect(selected.resolved.syllableCount).toBe(syllables);
      expect(word.syllables).toHaveLength(1 + syllables);
      const finalPhones = word.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda]).map(phone => phone.sound);
      expect(finalPhones.slice(-phones.length)).toEqual(phones);
    },
  );

  it("carries the transformed root rather than reconstructing its original spelling", () => {
    const word = fixedRoot({ suffix: suffixNamed("ing") }).word();
    expect(word.written.clean).toBe("batting");
    expect(word.trace!.morphology!.realization!.assembledParts).toEqual([{ role: "root", text: "batt" }, { role: "suffix", text: "ing" }]);
  });

  it("composes a changed-length prefix with a real suffix boundary transform", () => {
    const word = fixedRoot({ prefix: customAffix("prefix", "over", "a"), suffix: suffixNamed("ing") }).word();
    expect(word.written.clean).toBe("abatting");
    expect(word.trace!.morphology!.realization!.emittedParts).toEqual([
      { role: "prefix", text: "a" }, { role: "root", text: "batt" }, { role: "suffix", text: "ing" },
    ]);
  });

  it("retains paired phonological and written root alternations", () => {
    const word = fixedRoot({ suffix: suffixNamed("ity"), coda: "k" }).word();
    expect(word.written.clean).toBe("basity");
    expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual(["s"]);
    expect(word.trace!.morphology!.realization!.suffix!.boundaryPhoneme!.sound).toBe("k");
    expect(word.trace!.morphology!.realization!.assembledParts[0].text).toBe("bas");
  });

  it("records cleanup loss separately from the selected affix", () => {
    const fixture = fixedRoot({ prefix: customAffix("prefix", "un", "trans"), maxConsonants: 2 });
    const word = fixture.word();
    verifyMorphologyOperations(word, fixture.config);
    const realization = word.trace!.morphology!.realization!;
    expect(realization.prefix!.resolved.written).toBe("trans");
    expect(realization.assembledParts[0].text).toBe("trans");
    expect(realization.emittedParts[0].text).toBe("tran");
    expect(word.written.clean).toBe("tranbat");
    expect(word.trace!.finalWord!.spelling.events.some(event => event.part === "prefix" && event.rule === "repairConsonantLetters")).toBe(true);
    const forged = structuredClone(word); forged.trace!.finalWord!.spelling.events = [];
    expect(() => verifyMorphologyOperations(forged, fixture.config)).toThrow("final cell lineage mismatch");
  });

  it("keeps snapshots independent of config, surface phones, and later calls", () => {
    const fixture = fixedRoot({ prefix: customAffix("prefix", "un", "over") });
    const word = fixture.word();
    const original = structuredClone(word);
    const selected = word.trace!.morphology!.realization!.prefix!;
    selected.resolved.phonemes[0] = "changed";
    selected.resolved.syllables![0].nucleus[0] = "changed";
    selected.planned.phonemes[0] = "changed";
    selected.boundaryPhoneme!.sound = "changed";
    word.trace!.morphology!.realization!.emittedParts[0].text = "changed";
    expect(word.trace!.morphology!.realization!.assembledParts[0].text).toBe("over");
    expect(word.syllables[0].nucleus[0].sound).toBe("ɪ");
    expect(fixture.word()).toEqual(original);
  });

  it("keeps tracing observational and seeded calls deterministic", () => {
    const fixture = fixedRoot({ prefix: prefixIn, suffix: suffixNamed("ed"), onset: "m" });
    const traced = fixture.word();
    const plain = fixture.generator.generateWord(fixture.generation);
    expect({ ...traced, trace: undefined }).toEqual(plain);
    expect(fixture.word()).toEqual(traced);
  });

  it("snapshots only selection features and detaches them from the root phone", () => {
    const fixture = fixedRoot({ prefix: prefixIn });
    const word = fixture.word();
    const boundary = word.trace!.morphology!.realization!.prefix!.boundaryPhoneme!;
    expect(Object.keys(boundary).sort()).toEqual(["mannerOfArticulation", "placeOfArticulation", "sound", "voiced"]);
    boundary.sound = "k";
    boundary.voiced = false;
    boundary.mannerOfArticulation = "fricative";
    boundary.placeOfArticulation = "velar";
    expect(word.syllables[1].onset[0]).toMatchObject({ sound: "b", voiced: true, mannerOfArticulation: "stop", placeOfArticulation: "bilabial" });
    expect(fixture.word().trace!.morphology!.realization!.prefix!.boundaryPhoneme).toEqual({ sound: "b", voiced: true, mannerOfArticulation: "stop", placeOfArticulation: "bilabial" });
  });

  it("preserves im across 100 stratified bilabial-root generations", () => {
    const fixtures = ["b", "p", "m"].map(onset => fixedRoot({ prefix: prefixIn, onset }));
    let selected = 0;
    for (let seed = 0; seed < 100; seed++) {
      const fixture = fixtures[seed % fixtures.length];
      const word = fixture.generator.generateWord({ ...fixture.generation, seed, trace: true });
      const prefix = word.trace!.morphology!.realization!.prefix!;
      expect(prefix.boundaryPhoneme!.placeOfArticulation).toBe("bilabial");
      expect(prefix.resolved.written).toBe("im");
      expect(prefix.resolved.phonemes).toEqual(["ɪ", "m"]);
      expect(word.written.clean.startsWith("im")).toBe(true);
      selected++;
    }
    expect(selected).toBe(100);
  });

  it("preserves assembly across a continuous 10,000-word public-API stream", { timeout: 30_000 }, () => {
    const rand = createSeededRng(20260926);
    let affixed = 0;
    let selectedIm = 0;
    let eligibleIm = 0;
    for (let i = 0; i < 10_000; i++) {
      const word = generateWord({ rand, trace: true });
      const realization = word.trace!.morphology?.realization;
      if (!realization) continue;
      affixed++;
      const prefix = realization.prefix;
      if (prefix?.planned.written === "in") {
        const eligible = prefix.boundaryPhoneme?.placeOfArticulation === "bilabial";
        eligibleIm += Number(eligible);
        expect(prefix.resolved.written).toBe(eligible ? "im" : "in");
        expect(prefix.allomorphIndex).toBe(eligible ? 0 : null);
      }
      expect(realization.emittedParts.map(part => part.text).join("")).toBe(word.written.clean);
      for (const role of ["prefix", "suffix"] as const) {
        const selection = realization[role];
        if (!selection) continue;
        expect(realization.assembledParts.find(part => part.role === role)!.text).toBe(selection.resolved.written);
        if (role === "prefix" && selection.resolved.written === "im") {
          selectedIm++;
          expect(word.written.clean.startsWith("im")).toBe(true);
        }
      }
    }
    expect(affixed).toBeGreaterThan(5000);
    expect(eligibleIm).toBeGreaterThan(0);
    expect(selectedIm).toBe(eligibleIm);
  });
});


describe("recorded morphology root replacements", () => {
  it("replays actual root edits and preserves public trace-on/off output and RNG", () => {
    let recorded = 0;
    for (let seed = 1; seed <= 600; seed++) {
      const tracedRng = createSeededRng(seed);
      const plainRng = createSeededRng(seed);
      const traced = generateWord({ rand: tracedRng, trace: true });
      const plain = generateWord({ rand: plainRng });
      const { trace, ...word } = traced;
      expect(word).toEqual(plain);
      expect(tracedRng()).toBe(plainRng());
      verifyFinalWordSourceLinks(traced);
      verifyMorphologyOperations(traced, englishConfig);
      verifyBareWordOperations(traced, englishConfig);
      expect(trace?.finalWord).toBeDefined();
      expect(replayFinalSpelling(trace!.finalWord!.spelling).map(cell => cell.text).join("")).toBe(traced.written.clean);
      expect(replayFinalPhones(trace!.finalWord!.phones)).toEqual(traced.syllables.flatMap(syllable =>
        [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound)));
      if (trace?.morphology) {
        expect(trace.morphologyPreparation).toBeDefined();
        expect(trace.morphologyPreparation!.after.syllables).toEqual(trace.finalNucleus!.before);
        expect(trace.finalNucleus!.after).toEqual(trace.pronunciationPasses![0].before);
        if (trace.morphology.realization) expect(trace.morphologyWriting!.before.written).toEqual(trace.writerOutput);
      }
      const realization = trace?.morphology?.realization;
      if (realization?.finalPhones) {
        const actualSounds = traced.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound));
        expect(replayFinalPhones(realization.finalPhones)).toEqual(actualSounds);
        expect(realization.finalPhones.final.map(phone => phone.id)).toEqual(realization.phoneAssembly!.final.map(phone => phone.id));
      }
      if (realization?.finalSpelling) {
        expect(replayFinalSpelling(realization.finalSpelling)).toEqual(realization.finalSpelling.cells);
        expect(realization.finalSpelling.surface).toBe(traced.written.clean);
        expect(realization.finalSpelling.cells.map(cell => cell.text).join("")).toBe(traced.written.clean);
      }
      if (!realization?.rootEdits?.length) continue;
      let root = realization.rootEdits[0].before;
      for (const event of realization.rootEdits) {
        expect(event.before).toBe(root);
        root = replaySpellingEdits(root, event.edits);
        expect(root).toBe(event.after);
        recorded++;
      }
      expect(root).toBe(realization.assembledParts.find(part => part.role === "root")!.text);
    }
    expect(recorded).toBeGreaterThan(0);
  });
});

it("rejects self-consistent final cell provenance that points at the wrong base cell", () => {
  const word = generateWord({ seed: 435, trace: true });
  verifyFinalWordSourceLinks(word);
  const forged = structuredClone(word);
  const spelling = forged.trace!.finalWord!.spelling;
  const cell = spelling.initial.find(item => item.source.kind === "base-cell")!;
  if (cell.source.kind !== "base-cell") throw new Error("Missing root fixture");
  cell.source.cellId += 100000;
  const survivor = spelling.cells.find(item => item.id === cell.id);
  if (survivor) survivor.source = structuredClone(cell.source);
  expect(() => replayFinalSpelling(spelling)).not.toThrow();
  expect(() => verifyFinalWordSourceLinks(forged)).toThrow("base cell");
});

it("rejects a forged allomorph choice and configured affix identity", () => {
  const word = generateWord({ seed: 435, trace: true });
  verifyConfiguredAllomorphs(word, englishConfig);
  const choice = structuredClone(word);
  choice.trace!.morphology!.realization!.prefix!.allomorphIndex = null;
  expect(() => verifyConfiguredAllomorphs(choice, englishConfig)).toThrow("selection priority");
  const identity = structuredClone(word);
  identity.trace!.morphology!.realization!.configurationIndices!.prefix = -1;
  expect(() => verifyConfiguredAllomorphs(identity, englishConfig)).toThrow("configured identity");
});

it("rejects forged boundary features even when the selected spelling stays unchanged", () => {
  const word = generateWord({ seed: 435, trace: true });
  verifyConfiguredAllomorphs(word, englishConfig);
  const forged = structuredClone(word);
  const boundary = forged.trace!.morphology!.realization!.prefix!.boundaryPhoneme!;
  boundary.voiced = !boundary.voiced;
  expect(() => verifyConfiguredAllomorphs(forged, englishConfig)).toThrow("selection boundary features");
});

it("rejects reordered morphology operations and unused attachment draws", () => {
  const fixture = fixedRoot({ suffix: { ...suffixNamed("ness"), boundaryTransforms: [
    { name: "first", match: /a/g, replace: "e" },
    { name: "second", match: /e/g, replace: "i" },
  ] } });
  const config: LanguageConfig = { ...fixture.config,
    writtenFormConstraints: { ...fixture.config.writtenFormConstraints, policy: "preserve-phones" } };
  const word = createGenerator(config).generateWord({ ...fixture.generation, trace: true });
  verifyMorphologyOperations(word, config);
  expect(word.trace!.morphologyWriting!.realization!.rootEdits).toHaveLength(2);
  const reordered = structuredClone(word);
  reordered.trace!.morphologyWriting!.realization!.rootEdits!.reverse();
  expect(() => verifyMorphologyOperations(reordered, config)).toThrow("Morphology writing replay mismatch");
  const extra = structuredClone(word); extra.trace!.morphologyWriting!.rolls.push(0.5);
  expect(() => verifyMorphologyOperations(extra, config)).toThrow("Morphology writing replay mismatch");
  const input = structuredClone(word); input.trace!.morphologyWriting!.before.written.clean += "x";
  expect(() => verifyMorphologyOperations(input, config)).toThrow("Morphology writing input mismatch");
});

it("replays a licensed prefix hiatus bridge and rejects its omission", () => {
  const prefix: Affix = { type: "prefix", written: "a", frequency: 1, phonemes: ["ɑ"],
    syllables: [{ onset: [], nucleus: ["ɑ"], coda: [] }], syllableCount: 1, stressEffect: "none" };
  const fixture = fixedRoot({ prefix });
  const zero: [number, number][] = [[0, 1]];
  const config: LanguageConfig = { ...fixture.config,
    clusterLimits: { ...fixture.config.clusterLimits!, maxOnset: 0 },
    syllableStructure: { ...fixture.config.syllableStructure, maxOnsetLength: 0 },
    generationWeights: { ...fixture.config.generationWeights,
      onsetLength: { monosyllabic: zero, followingNucleus: zero, default: zero, long: zero } },
    morphology: { ...fixture.config.morphology!, boundaryPolicy: {
      enablePrefixRootFallback: true, enableRootSuffixFallback: true, fallbackBridgeOnsets: [["h", 1]],
    } },
    writtenFormConstraints: { ...fixture.config.writtenFormConstraints, policy: "preserve-phones" },
  };
  const word = createGenerator(config).generateWord({ ...fixture.generation, trace: true });
  const bridges = word.trace!.finalWord!.phones.initial.filter(phone => phone.source.kind === "bridge");
  expect(bridges).toHaveLength(1);
  expect(bridges[0].initialSound).toBe("h");
  verifyMorphologyOperations(word, config);
  const forged = structuredClone(word);
  forged.trace!.morphologyPreparation!.structural = forged.trace!.morphologyPreparation!.structural.filter(event => event.event !== "morphPrefixHiatusFallback");
  expect(() => verifyMorphologyOperations(forged, config)).toThrow("Morphology preparation replay mismatch");
});

it("rejects an internally consistent invented root phone change", () => {
  const bare = generateWord({ seed: 1, morphology: false, trace: true });
  const forged = structuredClone(bare);
  const phones = forged.trace!.finalWord!.phones;
  const first = phones.final[0];
  phones.changes.push({ id: first.id, before: first.sound, after: first.sound, rule: "invented" });
  expect(() => replayFinalPhones(phones)).not.toThrow();
  expect(() => verifyBareWordOperations(forged, englishConfig)).toThrow("phone lineage mismatch");
  const affixed = generateWord({ seed: 435, trace: true });
  const selection = affixed.trace!.morphology!.realization!.selectionPhones!;
  const edge = selection.final[0];
  selection.changes.push({ id: edge.id, before: edge.sound, after: edge.sound, rule: "invented" });
  expect(() => replayFinalPhones(selection)).not.toThrow();
  expect(() => verifyConfiguredAllomorphs(affixed, englishConfig)).toThrow("selection phone lineage");
});

it("verifies serialized evidence independently of object property order", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const word = generateWord({ seed, trace: true });
    const saved = JSON.parse(serializeTraceEvidence(word)!);
    verifyFinalWordSourceLinks(saved);
    verifyMorphologyOperations(saved, englishConfig);
    verifyBareWordOperations(saved, englishConfig);
  }
});
