import { describe, it, expect } from "vitest";
import { createGenerator, generateWord, generateWords, _buildCluster as buildCluster } from "./generate";
import { ClusterContext, Phoneme, Word } from "../types";
import type { LanguageConfig } from "../config/language";
import { englishConfig } from "../config/english";
import { createDefaultRng } from "../utils/random";
import { buildGraphemeMaps } from "../elements/graphemes/index";
import { findExample } from "../test-support/find-example";

const maxVowelLetters = englishConfig.writtenFormConstraints!.maxVowelLetters!;
const maxFinalConsonantLetters = englishConfig.writtenFormConstraints!.maxFinalConsonantLetters!;

function repairsFor(word: Word, rule: string) {
  return word.trace!.repairs.filter(repair => repair.rule === rule);
}

function finalVowelRun(spelling: string): number {
  return /[aeiouy]*$/.exec(spelling)![0].length;
}

function endsInConsonantLetters(spelling: string, count: number): boolean {
  return new RegExp(`(^|[aeiouy])[^aeiouy]{${count}}$`).test(spelling);
}

function lastSelection(word: Word) {
  return word.trace!.graphemeSelections.at(-1)!;
}

/** The orthography unit that owns the word's final letter. */
function finalLetterOwner(word: Word) {
  const orthography = word.trace!.orthography!;
  const owner = orthography.chars.at(-1)!.unitId;
  return orthography.graphemeUnits.find(unit => unit.id === owner)!;
}

/** Multiplies the nucleus weight of `sounds`, keeping phonemeMaps pointing at the same objects. */
function withBoostedNuclei(config: LanguageConfig, sounds: string[], factor: number): LanguageConfig {
  const boosted = new Map<Phoneme, Phoneme>();
  const phonemes = config.phonemes.map(phoneme => {
    if (!sounds.includes(phoneme.sound) || phoneme.nucleus === undefined) return phoneme;
    const next = { ...phoneme, nucleus: phoneme.nucleus * factor };
    boosted.set(phoneme, next);
    return next;
  });
  const nucleus = new Map([...config.phonemeMaps.nucleus].map(([sound, entries]) => [sound, entries.map(entry => boosted.get(entry) ?? entry)]));
  return { ...config, phonemes, phonemeMaps: { ...config.phonemeMaps, nucleus } };
}

/**
 * Word-final diphthongs whose run exceeds the vowel-letter cap are rare under
 * the default English weights, so these tests boost them and lower the cap to 1:
 * every final selected vowel spelling of two or more letters then exercises it.
 */
const TERMINAL_VOWEL_CAP = 1;
function terminalVowelConfig(overrides: Partial<LanguageConfig> = {}): LanguageConfig {
  const boosted = withBoostedNuclei(englishConfig, ["eɪ", "ɔɪ"], 100);
  return {
    ...boosted,
    writtenFormConstraints: { ...boosted.writtenFormConstraints!, maxVowelLetters: TERMINAL_VOWEL_CAP },
    ...overrides,
  };
}

function withFinalIProbability(config: LanguageConfig, probability: number): LanguageConfig {
  return { ...config, spellingRules: config.spellingRules!.map(rule => rule.name === "no-final-i" ? { ...rule, probability } : rule) };
}

describe("Word Generator", () => {
  it("generates word with specified syllable count", () => {
    const word = generateWord({ syllableCount: 3, morphology: false });
    expect(word.syllables.length).toBe(3);
  });

  it("treats requested counts as root counts across the default morphology mix", () => {
    let affixed = 0;
    for (let syllableCount = 1; syllableCount <= 7; syllableCount++) {
      for (let seed = 0; seed < 20; seed++) {
        const word = generateWord({ seed, syllableCount, trace: true });
        const trace = word.trace!;
        expect(trace.syllableCount).toBe(syllableCount);
        expect(trace.syllablePlans).toHaveLength(syllableCount);
        expect(trace.stages.at(-1)!.after).toHaveLength(syllableCount);
        const realized = trace.morphology?.realization;
        const added = (realized?.prefix?.resolved.syllableCount ?? 0)
          + (realized?.suffix?.resolved.syllableCount ?? 0);
        expect(word.syllables).toHaveLength(syllableCount + added);
        if (trace.summary.morphologyApplied) affixed++;
      }
    }
    expect(affixed).toBeGreaterThan(70);
  });

  it("selects the same root regardless of affix phone, syllable, and letter costs", () => {
    const short: import("../config/language.js").Affix = {
      type: "suffix", written: "s", phonemes: ["z"], syllables: [],
      syllableCount: 0, stressEffect: "none", frequency: 1,
    };
    const long: import("../config/language.js").Affix = {
      ...short, written: "anananananana", phonemes: ["ɑ", "n", "ɑ", "n", "ɑ", "n"],
      syllables: Array.from({ length: 3 }, () => ({ onset: [], nucleus: ["ɑ"], coda: ["n"] })),
      syllableCount: 3,
    };
    const make = (suffix: import("../config/language.js").Affix) => createGenerator({
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!, prefixes: [], suffixes: [suffix],
        templateWeights: {
          text: { bare: 0, suffixed: 1, prefixed: 0, both: 0 },
          lexicon: { bare: 0, suffixed: 1, prefixed: 0, both: 0 },
        },
      },
    });
    const shortGenerator = make(short);
    const longGenerator = make(long);
    for (let seed = 0; seed < 64; seed++) {
      const a = shortGenerator.generateWord({ seed, trace: true });
      const b = longGenerator.generateWord({ seed, trace: true });
      expect(b.trace!.stages).toEqual(a.trace!.stages);
      expect(b.trace!.graphemeSelections).toEqual(a.trace!.graphemeSelections);
      expect(b.trace!.targetPhonemeCount).toBe(a.trace!.targetPhonemeCount);
      expect(b.trace!.syllablePlans).toEqual(a.trace!.syllablePlans);
      expect(b.trace!.attempts).toBe(a.trace!.attempts);
      expect(b.syllables).toHaveLength(a.syllables.length + 3);
    }
    const seven = longGenerator.generateWord({ seed: 13, syllableCount: 7, trace: true });
    expect(seven.trace!.syllableCount).toBe(7);
    expect(seven.syllables).toHaveLength(10);
    expect(() => longGenerator.generateWord({ syllableCount: 8 })).toThrow(RangeError);
  });

  it("generates a word with a valid written form", () => {
    const word = generateWord();
    expect(word.written.clean).toBeTruthy();
    expect(word.written.hyphenated).toBeTruthy();
  });

  it("generates a word with a valid pronunciation", () => {
    const word = generateWord();
    expect(word.pronunciation).toBeTruthy();
  });

  it("keeps hyphenated output aligned after morphology consonant repair", () => {
    // A tighter consonant cap makes junction repairs common enough to find quickly.
    const generator = createGenerator({
      ...englishConfig,
      writtenFormConstraints: { ...englishConfig.writtenFormConstraints!, maxConsonantGraphemes: 3, maxConsonantLetters: 3 },
    });
    const { word, options } = findExample(word => {
      const realization = word.trace!.morphology?.realization;
      return !!realization && realization.emittedParts.some((part, index) => part.text !== realization.assembledParts[index].text);
    }, { property: "an affixed word changed by the post-morphology consonant repair", limit: 3000, generator, options: { morphology: true } });
    expect(word.written.hyphenated).toBe(word.written.clean);
    expect(generator.generateWord({ ...options, trace: false }).written).toEqual(word.written);
  });

  it("preserves a root-final consonant cluster before -ly with terminal-y-aware repair", () => {
    const ly = englishConfig.morphology!.suffixes.find(suffix => suffix.written === "ly")!;
    const generator = createGenerator({
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!, prefixes: [], suffixes: [ly],
        templateWeights: {
          text: { bare: 0, suffixed: 1, prefixed: 0, both: 0 },
          lexicon: { bare: 0, suffixed: 1, prefixed: 0, both: 0 },
        },
      },
    });
    const rootText = (word: Word) => word.trace!.morphology!.realization!.assembledParts.find(part => part.role === "root")!.text;
    // Counting the terminal y as a consonant would push this run past the final-consonant cap.
    const { word, options } = findExample(word => endsInConsonantLetters(rootText(word), maxFinalConsonantLetters), {
      property: `a one-syllable root ending in ${maxFinalConsonantLetters} consonant letters before -ly`,
      limit: 300, generator, options: { mode: "text", syllableCount: 1 },
    });
    const root = rootText(word);
    const plain = generator.generateWord({ ...options, trace: false });
    const { trace, ...traced } = word;
    expect(plain.written.clean).toBe(`${root}ly`);
    expect(plain.written.hyphenated.replace(/&shy;/g, "")).toBe(`${root}ly`);
    expect(trace!.morphology!.realization!.assembledParts).toEqual([
      { role: "root", text: root }, { role: "suffix", text: "ly" },
    ]);
    expect(trace!.morphology!.realization!.emittedParts).toEqual(trace!.morphology!.realization!.assembledParts);
    const rootSyllable = plain.syllables[0];
    const rootPhonemes = rootSyllable.onset.length + rootSyllable.nucleus.length + rootSyllable.coda.length;
    expect(trace!.selection!.selected).toMatchObject({ syllables: 1, phonemes: rootPhonemes, letters: root.length });
    expect(trace!.attempts).toBe(trace!.selection!.attemptsExecuted - 1);
    expect(traced).toEqual(plain);
    expect(generator.generateWord({ ...options, trace: false })).toEqual(plain);
  });

  it("preserves a maximal final consonant run before terminal y in the post-spelling backstop", () => {
    // The final-i rule turns ...CCCi into ...CCCy; y is a vowel there, so the run stays legal.
    const finalIRewrite = (word: Word) => repairsFor(word, "spellingRule:no-final-i")
      .find(repair => endsInConsonantLetters(repair.before.slice(0, -1), maxFinalConsonantLetters));
    const { word } = findExample(word => finalIRewrite(word) !== undefined, {
      property: `a final-i rewrite after ${maxFinalConsonantLetters} consonant letters`,
      limit: 3000, options: { mode: "text", morphology: false },
    });
    expect(word.trace!.repairs).not.toContainEqual(expect.objectContaining({ rule: "postSpellingBackstop" }));
    expect(word.written.clean).toBe(finalIRewrite(word)!.after);
  });

  it.each([
    { mode: "lexicon" as const, selectedEnding: "y", surfaceOf: (selected: string) => selected },
    { mode: "text" as const, selectedEnding: "y", surfaceOf: (selected: string) => selected },
    { mode: "text" as const, selectedEnding: "i", surfaceOf: (selected: string) => `${selected.slice(0, -1)}y` },
  ])("preserves an over-cap terminal vowel spelling selected as ...$selectedEnding ($mode)", ({ mode, selectedEnding, surfaceOf }) => {
    const generator = createGenerator(terminalVowelConfig());
    const { word, options } = findExample(word => {
      const owner = finalLetterOwner(word);
      return word.trace!.morphology!.template === "bare" && owner.position === "nucleus"
        && owner.selected.endsWith(selectedEnding) && finalVowelRun(word.written.clean) > TERMINAL_VOWEL_CAP;
    }, {
      property: `a bare word ending in an over-cap vowel run owned by a nucleus selected as ...${selectedEnding}`,
      limit: selectedEnding === "y" ? 500 : 3000, generator, options: { mode },
    });
    const plain = generator.generateWord({ ...options, trace: false });
    const { trace, ...traced } = word;
    const spelling = plain.written.clean;
    expect(plain.written.hyphenated.replace(/&shy;/g, "")).toBe(spelling);
    expect(trace!.selection!.selected.letters).toBe(spelling.length);
    expect(trace!.attempts).toBe(trace!.selection!.attemptsExecuted - 1);
    const vowelUnit = finalLetterOwner(word);
    expect(vowelUnit.start).toBeDefined();
    expect(spelling.slice(vowelUnit.start!, vowelUnit.end! + 1)).toBe(surfaceOf(vowelUnit.selected));
    expect(traced).toEqual(plain);
    expect(generator.generateWord({ ...options, trace: false })).toEqual(plain);
  });

  it("caps the same final vowel run when the final-i rule does not produce y", () => {
    const generator = createGenerator(withFinalIProbability(terminalVowelConfig(), 1));
    const { word, options } = findExample(word => {
      const selection = lastSelection(word);
      return selection.position === "nucleus" && selection.selected.length > TERMINAL_VOWEL_CAP && selection.selected.endsWith("i")
        && repairsFor(word, "spellingRule:no-final-i").length === 0;
    }, {
      property: "a final multi-letter ...i vowel spelling left as i by the final-i rule",
      limit: 4000, generator, options: { morphology: false },
    });
    const selected = lastSelection(word).selected;
    const cap = repairsFor(word, "repairVowelLetters:postJoin").find(repair => repair.before.endsWith(selected));
    expect(cap, "post-join vowel cap of the selected final spelling").toBeDefined();
    expect(cap!.before.startsWith(cap!.after)).toBe(true);
    expect(finalVowelRun(cap!.after)).toBeLessThanOrEqual(TERMINAL_VOWEL_CAP);
    expect(word.written.clean).toBe(cap!.after);
    expect({ ...word, trace: undefined }).toEqual(generator.generateWord({ ...options, trace: false }));
  });

  it("does not assign an inserted final y to its neighboring selected vowel", () => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [...englishConfig.spellingRules!, { name: "unowned-final-y", pattern: "$", replacement: "y", scope: "word" }],
    });
    // A selected ...Vy spelling plus the inserted y exceeds the vowel-letter cap.
    const { word, options } = findExample(word => lastSelection(word).position === "nucleus" && /[aeiou]y$/.test(lastSelection(word).emitted)
      && repairsFor(word, "spellingRule:unowned-final-y").length > 0, {
      property: "an inserted y after a final selected ...Vy vowel spelling",
      limit: 2000, generator, options: { morphology: false },
    });
    const { trace, ...traced } = word;
    const insertion = repairsFor(word, "spellingRule:unowned-final-y")[0];
    expect(trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairVowelLetters:postJoin", before: insertion.after, after: insertion.before }));
    expect(word.written.clean.endsWith(lastSelection(word).emitted)).toBe(true);
    expect(traced).toEqual(generator.generateWord({ ...options, trace: false }));
  });

  it("does not protect terminal y belonging to a selected consonant spelling", () => {
    const graphemes = englishConfig.graphemes.map(g => g.phoneme === "s" ? { ...g, form: "aeay" } : g);
    const generator = createGenerator({ ...englishConfig, graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps });
    const { word, options } = findExample(word => lastSelection(word).phoneme === "s" && lastSelection(word).selected === "aeay", {
      property: "a word-final /s/ spelled aeay", limit: 300, generator, options: { syllableCount: 1, morphology: false },
    });
    expect(lastSelection(word)).toMatchObject({ phoneme: "s", position: "coda", selected: "aeay" });
    const cap = repairsFor(word, "repairVowelLetters").find(repair => repair.before.endsWith("aeay"));
    expect(cap, "vowel cap of the consonant spelling").toBeDefined();
    expect(cap!.after.endsWith("y")).toBe(false);
    expect(finalVowelRun(cap!.after)).toBeLessThanOrEqual(maxVowelLetters);
    expect(word.written.clean).toBe(cap!.after);
    expect({ ...word, trace: undefined }).toEqual(generator.generateWord({ ...options, trace: false }));
  });

  const aoyGraphemes = englishConfig.graphemes.map(g => g.phoneme === "eɪ" ? { ...g, form: "aoy" } : g);
  const aoyConfig = { ...englishConfig, graphemes: aoyGraphemes, graphemeMaps: buildGraphemeMaps(aoyGraphemes).graphemeMaps };
  const endsInAoyAfterConsonant = (word: Word) => {
    const selections = word.trace!.graphemeSelections;
    return selections.at(-1)!.selected === "aoy" && selections.at(-1)!.position === "nucleus" && selections.at(-2)?.position !== "nucleus";
  };

  it("preserves a generator-selected spelling outside the built-in vowel inventory", () => {
    const generator = createGenerator(aoyConfig);
    const { word, options } = findExample(endsInAoyAfterConsonant, {
      property: "a final /eɪ/ spelled aoy after a consonant", limit: 1000, generator, options: { morphology: false },
    });
    const plain = generator.generateWord({ ...options, trace: false });
    const { trace, ...traced } = word;
    const { clean, hyphenated } = plain.written;
    expect(clean.endsWith("aoy")).toBe(true);
    expect(hyphenated.endsWith("aoy")).toBe(true);
    expect(hyphenated.replace(/&shy;/g, "")).toBe(clean);
    expect(lastSelection(word)).toMatchObject({ phoneme: "eɪ", position: "nucleus", selected: "aoy" });
    expect(trace!.orthography!.graphemeUnits.at(-1)).toMatchObject({ selected: "aoy", present: true, start: clean.length - 3, end: clean.length - 1 });
    expect(traced).toEqual(plain);
  });

  it.each([
    { probability: 95, fired: true },
    { probability: 1, fired: false },
  ])("resolves a deferred vowel unit before applying the cap (final-i probability $probability)", ({ probability, fired }) => {
    const graphemes = englishConfig.graphemes.map(g => g.phoneme === "ɔɪ" ? { ...g, form: "uoi" } : g);
    const generator = createGenerator(withFinalIProbability({
      ...withBoostedNuclei(englishConfig, ["ɔɪ"], 100), graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps,
    }, probability));
    const { word, options } = findExample(word => lastSelection(word).selected === "uoi" && lastSelection(word).position === "nucleus"
      && (repairsFor(word, "spellingRule:no-final-i").length > 0) === fired, {
      property: `a final /ɔɪ/ spelled uoi where the final-i rule ${fired ? "fired" : "did not fire"}`,
      limit: 1000, generator, options: { mode: "text", morphology: false },
    });
    const plain = generator.generateWord({ ...options, trace: false });
    const { trace, ...traced } = word;
    const { clean, hyphenated } = plain.written;
    expect(hyphenated.replace(/&shy;/g, "")).toBe(clean);
    expect(plain.pronunciation.endsWith("ɔɪ")).toBe(true);
    if (fired) {
      // Deferred until the rule turned it into y, the whole selected unit is protected.
      expect(clean.endsWith("uoy")).toBe(true);
    } else {
      expect(clean.endsWith("i")).toBe(false);
      expect(finalVowelRun(clean)).toBeLessThanOrEqual(maxVowelLetters);
    }
    expect(trace!.graphemeSelections.at(-1)).toMatchObject({ phoneme: "ɔɪ", selected: "uoi" });
    expect(traced).toEqual(plain);
    expect(generator.generateWord({ ...options, trace: false })).toEqual(plain);
  });

  it("carries vowel ownership through a length-changing captured spelling rewrite", () => {
    const generator = createGenerator({
      ...aoyConfig,
      spellingRules: [...englishConfig.spellingRules!, { name: "owned-capture", pattern: "a(oy)$", replacement: "aa$1", scope: "word" }],
    });
    const { word, options } = findExample(endsInAoyAfterConsonant, {
      property: "a final /eɪ/ spelled aoy after a consonant", limit: 1000, generator, options: { morphology: false },
    });
    const plain = generator.generateWord({ ...options, trace: false });
    const { trace, ...traced } = word;
    const { clean, hyphenated } = plain.written;
    expect(clean.endsWith("aaoy")).toBe(true);
    expect(hyphenated.endsWith("aaoy")).toBe(true);
    expect(hyphenated.replace(/&shy;/g, "")).toBe(clean);
    expect(trace!.orthography!.graphemeUnits.at(-1)).toMatchObject({ selected: "aoy", present: true, start: clean.length - 4, end: clean.length - 1 });
    expect(traced).toEqual(plain);
  });

  it("generates reproducible word with seed", () => {
    const word1 = generateWord({ seed: 12345 });
    const word2 = generateWord({ seed: 12345 });
    expect(word1.written.clean).toBe(word2.written.clean);
    expect(word1.pronunciation).toBe(word2.pronunciation);
  });

  it("rejects invalid forced syllable counts", () => {
    expect(() => generateWord({ syllableCount: 2.5, morphology: false })).toThrow(RangeError);
    expect(() => generateWord({ syllableCount: Number.POSITIVE_INFINITY, morphology: false })).toThrow(RangeError);
    expect(() => generateWord({ syllableCount: -1, morphology: false })).toThrow(RangeError);
  });

  it("rejects invalid batch counts", () => {
    expect(() => generateWords(Number.POSITIVE_INFINITY, { seed: 1, morphology: false })).toThrow(RangeError);
    expect(() => generateWords(3.2, { seed: 1, morphology: false })).toThrow(RangeError);
    expect(() => generateWords(-1, { seed: 1, morphology: false })).toThrow(RangeError);
    expect(() => generateWords(1_000_001, { seed: 1, morphology: false })).toThrow(RangeError);
  });

  it("boundary policy decisions are deterministic for fixed seed", () => {
    const policyGenerator = createGenerator({
      ...englishConfig,
      generationWeights: {
        ...englishConfig.generationWeights,
        boundaryPolicy: {
          ...englishConfig.generationWeights.boundaryPolicy,
          equalSonorityDrop: 100,
          risingCodaDrop: 100,
        },
      },
    });

    const first = policyGenerator.generateWord({
      seed: 4242,
      mode: "lexicon",
      morphology: false,
      trace: true,
      syllableCount: 4,
    });
    const second = policyGenerator.generateWord({
      seed: 4242,
      mode: "lexicon",
      morphology: false,
      trace: true,
      syllableCount: 4,
    });

    expect(first.written.clean).toBe(second.written.clean);
    expect(first.pronunciation).toBe(second.pronunciation);
    expect(first.trace?.structural).toEqual(second.trace?.structural);
  });

  it("risingCodaDrop policy gates rising-coda drop events", () => {
    const alwaysDrop = createGenerator({
      ...englishConfig,
      generationWeights: {
        ...englishConfig.generationWeights,
        boundaryPolicy: {
          ...englishConfig.generationWeights.boundaryPolicy,
          risingCodaDrop: 100,
        },
      },
    });
    const neverDrop = createGenerator({
      ...englishConfig,
      generationWeights: {
        ...englishConfig.generationWeights,
        boundaryPolicy: {
          ...englishConfig.generationWeights.boundaryPolicy,
          risingCodaDrop: 0,
        },
      },
    });

    let alwaysCount = 0;
    let neverCount = 0;
    for (let s = 0; s < 4000; s++) {
      const onWord = alwaysDrop.generateWord({
        seed: s,
        mode: "lexicon",
        morphology: false,
        trace: true,
        syllableCount: 4,
      });
      const offWord = neverDrop.generateWord({
        seed: s,
        mode: "lexicon",
        morphology: false,
        trace: true,
        syllableCount: 4,
      });
      alwaysCount += onWord.trace!.structural.filter(e => e.event === "risingCodaBoundaryDrop").length;
      neverCount += offWord.trace!.structural.filter(e => e.event === "risingCodaBoundaryDrop").length;
    }

    expect(alwaysCount).toBeGreaterThan(0);
    expect(neverCount).toBe(0);
  });
});

describe("buildCluster function", () => {
  it("produces s + p/t/k + * onset clusters", () => {
    const attempts = 10000;
    const exceptionalClusters = ["sp", "st", "sk"];
    const foundClusters = new Set<string>();
    const allClusters = new Set<string>();

    for (let i = 0; i < attempts; i++) {
      const context: ClusterContext = {
        rand: createDefaultRng(),
        position: "onset",
        cluster: [],
        ignoreSet: new Set(),
        clusterSounds: [],
        isStartOfWord: true,
        isEndOfWord: false,
        maxLength: 3,
        syllableCount: 1,
      };
      const cluster = buildCluster(context);
      const clusterString = cluster.map(p => p.sound).join("");

      allClusters.add(clusterString);

      // Check if the cluster starts with any special cluster and is 3 characters long
      if (exceptionalClusters.some(sc => clusterString.startsWith(sc)) && clusterString.length === 3) {
        foundClusters.add(clusterString.slice(0, 2));
      }

      if (foundClusters.size === exceptionalClusters.length) break;
    }

    expect(foundClusters.size).toBe(exceptionalClusters.length);
    exceptionalClusters.forEach(cluster => {
      expect(foundClusters.has(cluster)).toBe(true);
    });
  });

  it("produces *some* SSP violating clusters in codas", () => {
    const attempts = 10000;
    const exceptionalClusters = ["pt", "ps", "ks", "pt"];
    const foundClusters = new Set<string>();
    const allClusters = new Set<string>();

    for (let i = 0; i < attempts; i++) {
      const context: ClusterContext = {
        rand: createDefaultRng(),
        position: "coda",
        cluster: [],
        ignoreSet: new Set(),
        clusterSounds: [],
        isStartOfWord: false,
        isEndOfWord: true,
        maxLength: 2,
        syllableCount: 1,
      };
      const cluster = buildCluster(context);
      const clusterString = cluster.map(p => p.sound).join("");

      allClusters.add(clusterString);

      if (exceptionalClusters.some(exception => clusterString.endsWith(exception))) {
        foundClusters.add(clusterString.slice(0, 2));
      }

      if (foundClusters.size === exceptionalClusters.length) break;
    }

    expect(foundClusters.size).toBeGreaterThan(0);
  });
});

describe("isValidCluster", () => {
  describe("should only generate attested onsets", () => {
    // With the attested onset whitelist replacing the old regex system,
    // invalid onsets are blocked during generation (buildCluster) rather
    // than by a post-hoc isValidCluster check. Verify that 10k generated
    // onsets only produce attested clusters.
    it("never generates an unattested multi-consonant onset", () => {
      const attestedSet = new Set(
        englishConfig.clusterLimits!.attestedOnsets!.map((a: string[]) => a.join("|"))
      );
      for (let i = 0; i < 10000; i++) {
        const context: ClusterContext = {
          rand: createDefaultRng(),
          position: "onset",
          cluster: [],
          ignoreSet: new Set(),
          clusterSounds: [],
          isStartOfWord: true,
          isEndOfWord: false,
          maxLength: 3,
          syllableCount: 1,
        };
        const cluster = buildCluster(context);
        if (cluster.length >= 2) {
          const key = cluster.map(p => p.sound).join("|");
          expect(attestedSet.has(key)).toBe(true);
        }
      }
    });
  });

  describe("should only generate attested codas", () => {
    it("never generates an unattested multi-consonant coda", () => {
      const attestedSet = new Set(
        englishConfig.clusterLimits!.attestedCodas!.map((a: string[]) => a.join("|"))
      );
      const appendants = new Set(englishConfig.clusterLimits!.codaAppendants ?? []);
      for (let i = 0; i < 10000; i++) {
        const context: ClusterContext = {
          rand: createDefaultRng(),
          position: "coda",
          cluster: [],
          ignoreSet: new Set(),
          clusterSounds: [],
          isStartOfWord: false,
          isEndOfWord: true,
          maxLength: 4,
          syllableCount: 1,
        };
        const cluster = buildCluster(context);
        if (cluster.length >= 2) {
          let sounds = cluster.map(p => p.sound);
          // Strip trailing appendant for check
          if (appendants.has(sounds[sounds.length - 1]) && sounds.length > 2) {
            sounds = sounds.slice(0, -1);
          }
          if (sounds.length >= 2) {
            const key = sounds.join("|");
            expect(attestedSet.has(key), `unattested coda: ${sounds.join("+")}`).toBe(true);
          }
        }
      }
    });
  });

  // it('should return false "dm" in an onset', () => {
  //   const validOnsetCluster = [getPhonemeBySound('d')];
  //   expect(isValidCluster(getPhonemeBySound('n'), { cluster: validOnsetCluster, position: 'onset' } as ClusterContext)).toBe(false);
  // });

  // it('should return false "fn" in an onset', () => {
  //   const validOnsetCluster = [getPhonemeBySound('f')];
  //   expect(isValidCluster(getPhonemeBySound('n'), { cluster: validOnsetCluster, position: 'onset' } as ClusterContext)).toBe(false);
  // });

  // it('should return false "dm" in an coda', () => {
  //   const validOnsetCluster = [getPhonemeBySound('d')];
  //   expect(isValidCluster(getPhonemeBySound('m'), { cluster: validOnsetCluster, position: 'coda' } as ClusterContext)).toBe(false);
  // });
});
