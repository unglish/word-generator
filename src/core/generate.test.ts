import { describe, it, expect } from "vitest";
import { createGenerator, generateWord, generateWords, _buildCluster as buildCluster } from "./generate";
import { ClusterContext } from "../types";
import { englishConfig } from "../config/english";
import { createDefaultRng } from "../utils/random";

describe("Word Generator", () => {
  it("generates word with specified syllable count", () => {
    const word = generateWord({ syllableCount: 3, morphology: false });
    expect(word.syllables.length).toBe(3);
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
