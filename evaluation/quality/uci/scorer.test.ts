import { describe, expect, it } from "vitest";
import { loadSurfaceScorer, projectSurface } from "./reference.js";
import { fitUci, foldFor, type ReferenceDescriptor } from "./scorer.js";

const descriptor: ReferenceDescriptor = {
  schemaVersion: 1, id: "fixture", sampling: "one vote per spelling", projection: "opaque tokens",
  fold: { count: 2, algorithm: "sha256-first-u64be-mod", encoding: "json-string-array-v1" },
  provenance: { source: "unit-test" },
};

describe("positional UCI", () => {
  it("holds homophones together, retains each vote and keeps opaque pair keys distinct", () => {
    const homophone = ["a b", "c"];
    const different = ["a", "b c"];
    const rows = [homophone, homophone, different, ["a b", "c", "g"], ["x"]];
    expect(foldFor(homophone, descriptor.fold)).toBe(1);
    expect(foldFor(rows[3], descriptor.fold)).toBe(0);
    const scorer = fitUci(descriptor, rows);
    const samePosition = { position: 0, symbols: homophone, count: 3, reaching: 4, probability: 0.75 };
    expect(scorer.referenceBigrams(homophone)[0]).toEqual(samePosition);
    expect(scorer.referenceBigrams(rows[3])[0]).toEqual(samePosition);
    expect(scorer.score(homophone)).toEqual({
      length: 2, fold: 1, peers: 3,
      unigram: { raw: 2.5, percentile: 200 / 3 },
      bigram: { raw: 2, percentile: 200 / 3 },
    });
    expect(scorer.score(different).bigram).toEqual({ raw: 1, percentile: 50 / 3 });
    expect(scorer.explain(homophone)).toEqual({
      unigram: [
        { position: 0, symbols: ["a b"], count: 1, reaching: 2, probability: 0.5 },
        { position: 1, symbols: ["c"], count: 1, reaching: 1, probability: 1 },
      ],
      bigram: [{ position: 0, symbols: homophone, count: 1, reaching: 1, probability: 1 }],
    });
    expect(scorer.score(["__proto__", " ", "\u0000", ""]).bigram).toEqual({ raw: 1, percentile: null });
    expect(scorer.score(["__proto__", " ", "\u0000", ""]).unigram).toEqual({ raw: 1, percentile: null });
  });

  it("uses collision-free fold encoding for opaque symbols", () => {
    const fold = { ...descriptor.fold, count: 1009 };
    expect(foldFor(["a b", "c"], fold)).not.toBe(foldFor(["a", "b c"], fold));
    expect(() => foldFor(["a b", "c"], { ...fold, encoding: "space-separated-ascii-uppercase-v1" })).toThrow("uppercase ASCII");
    expect(() => fitUci(descriptor, [])).toThrow("nonempty reference");
  });

  it("marks a mixed mapped and unmapped word entirely ineligible", () => {
    const syllables = [
      { onset: [{ sound: "pʰ" }], nucleus: [{ sound: "ə" }], coda: [{ sound: "t" }] },
      { onset: [{ sound: "r" }], nucleus: [{ sound: "ʌ" }], coda: [{ sound: "ʔ" }] },
    ];
    expect(projectSurface({ syllables: syllables.slice(0, 1) })).toEqual({ kind: "projected", phones: ["P", "AH", "T"] });
    expect(projectSurface({ syllables })).toEqual({
      kind: "ineligible", reason: "unmapped-phones",
      phones: ["P", "AH", "T", "R", "AH", null], unmapped: [{ index: 5, sound: "ʔ" }],
    });
  });

  it("reproduces frozen reference and generated examples with the shipped CMU surface reference", async () => {
    const { scorer, descriptorSha256 } = await loadSurfaceScorer();
    expect(descriptorSha256).toBe("2c6d44fcb8e6aa3e31733bf10db2d60b2d80634f099c542f2fbdbc226f661597");
    expect(scorer.score(["AH"])).toEqual({
      length: 1, fold: 0, peers: 3,
      unigram: { raw: 1.0476917207172836, percentile: 200 / 3 },
      bigram: { raw: 1, percentile: 50 },
    });
    expect(scorer.score("ER B D AH V".split(" "))).toEqual({
      length: 5, fold: 4, peers: 1376,
      unigram: { raw: 1.1833219533747135, percentile: 10.901162790697674 },
      bigram: { raw: 1.010931408825691, percentile: 18.968023255813954 },
    });
    expect(scorer.score("HH AH G W IH P AH T R IH L T IH R AH S IY".split(" "))).toEqual({
      length: 17, fold: 0, peers: 0,
      unigram: { raw: 2.283381411918555, percentile: null },
      bigram: { raw: 1.0552477422954913, percentile: null },
    });
  });
});
