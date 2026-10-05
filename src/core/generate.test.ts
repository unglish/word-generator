import { describe, it, expect } from "vitest";
import { createGenerator, generateWord, generateWords, _buildCluster as buildCluster } from "./generate";
import { ClusterContext } from "../types";
import { englishConfig } from "../config/english";
import { createDefaultRng } from "../utils/random";
import { buildGraphemeMaps } from "../elements/graphemes/index";

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
    const word = generateWord({ seed: 11420, morphology: true });
    expect(word.written.hyphenated).toBe(word.written.clean);
  });

  it("preserves wacts + ly through generation with terminal-y-aware repair", () => {
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
    const options = { seed: 19385, mode: "text" as const, syllableCount: 1 };
    const plain = generator.generateWord(options);
    const { trace, ...traced } = generator.generateWord({ ...options, trace: true });
    expect(plain.written).toEqual({ clean: "wactsly", hyphenated: "wactsly" });
    expect(plain.syllables[0].coda.map(phoneme => phoneme.sound)).toContain("t");
    expect(trace!.morphology!.realization!.assembledParts).toEqual([
      { role: "root", text: "wacts" }, { role: "suffix", text: "ly" },
    ]);
    expect(trace!.morphology!.realization!.emittedParts).toEqual(trace!.morphology!.realization!.assembledParts);
    expect(traced).toEqual(plain);
    expect(generator.generateWord(options)).toEqual(plain);
  });

  it("preserves b before terminal y in the post-spelling backstop", () => {
    const word = generateWords(138, { seed: 1, mode: "text", trace: true })[137];
    expect(word.written.clean).toBe("villibthy");
    expect(word.pronunciation).toBe("vəˈlɪb.ðɪ");
    expect(word.trace!.repairs).not.toContainEqual(expect.objectContaining({ rule: "postSpellingBackstop" }));
  });

  it.each([
    { seed: 23, mode: "lexicon" as const, spelling: "soguey", pronunciation: "ˈsɑg.eɪ", selected: "ey", surface: "ey" },
    { seed: 9868, mode: "text" as const, spelling: "quoy", pronunciation: "kʰwɔɪ", selected: "oi", surface: "oy" },
    { seed: 29501, mode: "lexicon" as const, spelling: "rarrigueoy", pronunciation: "ræˈrɪg.ɔɪ", selected: "oi", surface: "oy" },
  ])("preserves the selected terminal vowel spelling in $spelling", ({ seed, mode, spelling, pronunciation, selected, surface }) => {
    const plain = generateWord({ seed, mode });
    const { trace, ...traced } = generateWord({ seed, mode, trace: true });
    expect(plain.written.clean).toBe(spelling);
    expect(plain.written.hyphenated.replace(/&shy;/g, "")).toBe(spelling);
    expect(plain.pronunciation).toBe(pronunciation);
    const lastOwner = trace!.orthography!.chars.at(-1)!.unitId;
    const vowelUnit = trace!.orthography!.graphemeUnits.find(unit => unit.id === lastOwner)!;
    expect(vowelUnit.position).toBe("nucleus");
    expect(vowelUnit.selected).toBe(selected);
    expect(spelling.slice(vowelUnit.start!, vowelUnit.end! + 1)).toBe(surface);
    expect(traced).toEqual(plain);
    expect(generateWord({ seed, mode })).toEqual(plain);
  });

  it("caps the same final vowel run when the final-i rule does not produce y", () => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: englishConfig.spellingRules!.map(rule => rule.name === "no-final-i" ? { ...rule, probability: 1 } : rule),
    });
    const plain = generator.generateWord({ seed: 29501 });
    const { trace, ...traced } = generator.generateWord({ seed: 29501, trace: true });
    expect(plain.written.clean).toBe("rarrigue");
    expect(plain.pronunciation).toBe("ræˈrɪg.ɔɪ");
    expect(trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairVowelLetters:postJoin", before: "rarrigueoi", after: "rarrigue" }));
    expect(traced).toEqual(plain);
  });

  it("does not assign an inserted final y to its neighboring selected vowel", () => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [...englishConfig.spellingRules!, { name: "unowned-final-y", pattern: "$", replacement: "y", scope: "word" }],
    });
    const plain = generator.generateWord({ seed: 70 });
    const { trace, ...traced } = generator.generateWord({ seed: 70, trace: true });
    expect(plain.written.clean).toBe("blenayed");
    expect(trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairVowelLetters:postJoin", before: "blenayy", after: "blenay" }));
    expect(traced).toEqual(plain);
  });

  it("does not protect terminal y belonging to a selected consonant spelling", () => {
    const graphemes = englishConfig.graphemes.map(g => g.phoneme === "s" ? { ...g, form: "aeay" } : g);
    const generator = createGenerator({ ...englishConfig, graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps });
    const options = { seed: 9, syllableCount: 1, morphology: false };
    const plain = generator.generateWord(options);
    const { trace, ...traced } = generator.generateWord({ ...options, trace: true });
    expect(plain.written.clean).toBe("natae");
    expect(trace!.graphemeSelections.at(-1)).toMatchObject({ phoneme: "s", position: "coda", selected: "aeay" });
    expect(trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairVowelLetters", before: "nataeay", after: "natae" }));
    expect(traced).toEqual(plain);
  });

  it("preserves a generator-selected spelling outside the built-in vowel inventory", () => {
    const graphemes = englishConfig.graphemes.map(g => g.phoneme === "eɪ" ? { ...g, form: "aoy" } : g);
    const generator = createGenerator({ ...englishConfig, graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps });
    const options = { seed: 26, morphology: false };
    const plain = generator.generateWord(options);
    const { trace, ...traced } = generator.generateWord({ ...options, trace: true });
    expect(plain.written).toEqual({ clean: "jotimaoy", hyphenated: "jo&shy;tim&shy;aoy" });
    expect(trace!.graphemeSelections.at(-1)).toMatchObject({ phoneme: "eɪ", position: "nucleus", selected: "aoy" });
    expect(trace!.orthography!.graphemeUnits.at(-1)).toMatchObject({ selected: "aoy", present: true, start: 5, end: 7 });
    expect(traced).toEqual(plain);
  });

  it.each([
    { probability: 95, spelling: "quuoy" },
    { probability: 1, spelling: "quu" },
  ])("resolves a deferred vowel unit before applying the cap (final-i probability $probability)", ({ probability, spelling }) => {
    const graphemes = englishConfig.graphemes.map(g => g.phoneme === "ɔɪ" ? { ...g, form: "uoi" } : g);
    const generator = createGenerator({
      ...englishConfig, graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps,
      spellingRules: englishConfig.spellingRules!.map(rule => rule.name === "no-final-i" ? { ...rule, probability } : rule),
    });
    const options = { seed: 9868, mode: "text" as const };
    const plain = generator.generateWord(options);
    const { trace, ...traced } = generator.generateWord({ ...options, trace: true });
    expect(plain.written).toEqual({ clean: spelling, hyphenated: spelling });
    expect(plain.pronunciation).toBe("kʰwɔɪ");
    expect(trace!.graphemeSelections.at(-1)).toMatchObject({ phoneme: "ɔɪ", selected: "uoi" });
    expect(traced).toEqual(plain);
    expect(generator.generateWord(options)).toEqual(plain);
  });

  it("carries vowel ownership through a length-changing captured spelling rewrite", () => {
    const graphemes = englishConfig.graphemes.map(g => g.phoneme === "eɪ" ? { ...g, form: "aoy" } : g);
    const generator = createGenerator({
      ...englishConfig, graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps,
      spellingRules: [...englishConfig.spellingRules!, { name: "owned-capture", pattern: "a(oy)$", replacement: "aa$1", scope: "word" }],
    });
    const options = { seed: 26, morphology: false };
    const plain = generator.generateWord(options);
    const { trace, ...traced } = generator.generateWord({ ...options, trace: true });
    expect(plain.written).toEqual({ clean: "jotimaaoy", hyphenated: "jo&shy;tim&shy;aaoy" });
    expect(trace!.orthography!.graphemeUnits.at(-1)).toMatchObject({ selected: "aoy", present: true, start: 5, end: 8 });
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
