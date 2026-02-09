import { describe, it, expect } from "vitest";
import { repairClusters, repairFinalCoda, repairClusterShape } from "./repair.js";
import type { Syllable, Phoneme } from "../types.js";

/** Helper to create a minimal phoneme. */
function ph(sound: string, overrides?: Partial<Phoneme>): Phoneme {
  return { sound, stress: 0, ...overrides } as Phoneme;
}

/** Helper to create a minimal syllable. */
function syl(onset: string[], nucleus: string[], coda: string[]): Syllable {
  return {
    onset: onset.map(ph),
    nucleus: nucleus.map(ph),
    coda: coda.map(ph),
  } as Syllable;
}

describe("repairClusters", () => {
  const banned = new Set(["ŋ|t", "ŋ|d", "p|b"]);

  it("drops banned coda phoneme at syllable boundary", () => {
    const syllables = [syl(["t"], ["æ"], ["ŋ"]), syl(["t"], ["ɪ"], [])];
    repairClusters(syllables, banned, "drop-coda");
    expect(syllables[0].coda).toHaveLength(0);
  });

  it("handles cascading drops", () => {
    // coda [p, ŋ] + onset [t] → ŋ|t banned → drop ŋ → p|t not banned → stop
    const syllables = [syl(["s"], ["æ"], ["p", "ŋ"]), syl(["t"], ["ɪ"], [])];
    repairClusters(syllables, banned, "drop-coda");
    expect(syllables[0].coda.map((p) => p.sound)).toEqual(["p"]);
  });

  it("cascading drops can empty the coda", () => {
    // coda [ŋ, ŋ] + onset [t] → both banned
    const syllables = [syl([], ["æ"], ["ŋ", "ŋ"]), syl(["t"], ["ɪ"], [])];
    repairClusters(syllables, banned, "drop-coda");
    expect(syllables[0].coda).toHaveLength(0);
  });

  it("drops onset with drop-onset strategy", () => {
    const syllables = [syl([], ["æ"], ["ŋ"]), syl(["t"], ["ɪ"], [])];
    repairClusters(syllables, banned, "drop-onset");
    expect(syllables[1].onset).toHaveLength(0);
  });

  it("does nothing when no violations exist", () => {
    const syllables = [syl(["t"], ["æ"], ["s"]), syl(["t"], ["ɪ"], [])];
    repairClusters(syllables, banned, "drop-coda");
    expect(syllables[0].coda.map((p) => p.sound)).toEqual(["s"]);
  });

  it("does nothing for empty syllables array", () => {
    repairClusters([], banned, "drop-coda");
    // no throw
  });

  it("skips boundaries with empty coda or onset", () => {
    const syllables = [syl(["t"], ["æ"], []), syl([], ["ɪ"], ["n"])];
    repairClusters(syllables, banned, "drop-coda");
    expect(syllables[0].coda).toHaveLength(0);
    expect(syllables[1].coda).toHaveLength(1);
  });
});

describe("repairFinalCoda", () => {
  const allowed = new Set(["t", "n", "s"]);

  it("drops disallowed final phoneme", () => {
    const syllables = [syl(["t"], ["æ"], ["ʒ"])];
    repairFinalCoda(syllables, allowed);
    expect(syllables[0].coda).toHaveLength(0);
  });

  it("keeps dropping until an allowed phoneme is found", () => {
    const syllables = [syl([], ["æ"], ["t", "ð", "ʒ"])];
    repairFinalCoda(syllables, allowed);
    expect(syllables[0].coda.map((p) => p.sound)).toEqual(["t"]);
  });

  it("does nothing when final phoneme is allowed", () => {
    const syllables = [syl([], ["æ"], ["n"])];
    repairFinalCoda(syllables, allowed);
    expect(syllables[0].coda.map((p) => p.sound)).toEqual(["n"]);
  });

  it("does nothing for empty coda", () => {
    const syllables = [syl(["t"], ["æ"], [])];
    repairFinalCoda(syllables, allowed);
    expect(syllables[0].coda).toHaveLength(0);
  });

  it("does nothing for empty syllables array", () => {
    repairFinalCoda([], allowed);
    // no throw
  });

  it("only checks the last syllable", () => {
    const syllables = [syl([], ["æ"], ["ʒ"]), syl([], ["ɪ"], ["t"])];
    repairFinalCoda(syllables, allowed);
    // First syllable's disallowed coda is untouched
    expect(syllables[0].coda.map((p) => p.sound)).toEqual(["ʒ"]);
    expect(syllables[1].coda.map((p) => p.sound)).toEqual(["t"]);
  });
});

// ---------------------------------------------------------------------------
// repairClusterShape
// ---------------------------------------------------------------------------

/** Helper to create phonemes with articulation metadata for voicing/manner/place. */
function phFull(sound: string, manner: string, voiced: boolean, place = "alveolar"): Phoneme {
  return { sound, mannerOfArticulation: manner, voiced, placeOfArticulation: place, stress: 0 } as Phoneme;
}

function sylFull(onset: Phoneme[], nucleus: Phoneme[], coda: Phoneme[]): Syllable {
  return { onset, nucleus, coda } as Syllable;
}

describe("repairClusterShape", () => {
  describe("cluster length truncation", () => {
    it("truncates onset to maxOnset", () => {
      const syllables = [sylFull(
        [ph("s"), ph("t"), ph("r"), ph("l")],
        [ph("æ")],
        [],
      )];
      repairClusterShape(syllables, { clusterLimits: { maxOnset: 3, maxCoda: 3 } });
      expect(syllables[0].onset.map(p => p.sound)).toEqual(["t", "r", "l"]);
    });

    it("truncates coda to maxCoda", () => {
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [ph("m"), ph("p"), ph("t"), ph("s")],
      )];
      repairClusterShape(syllables, { clusterLimits: { maxOnset: 3, maxCoda: 3 } });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["p", "t", "s"]);
    });

    it("allows coda appendant to extend beyond maxCoda", () => {
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [ph("m"), ph("p"), ph("t"), ph("s")],
      )];
      repairClusterShape(syllables, {
        clusterLimits: { maxOnset: 3, maxCoda: 3, codaAppendants: ["s", "z"] },
        codaAppendantSet: new Set(["s", "z"]),
      });
      // 4 consonants but last is "s" (appendant), so effective max is 4
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["m", "p", "t", "s"]);
    });
  });

  describe("voicing agreement", () => {
    it("drops voiced obstruent before voiceless obstruent in coda", () => {
      // /b/ (voiced stop) + /s/ (voiceless sibilant) → drop /b/
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [phFull("b", "stop", true, "bilabial"), phFull("s", "sibilant", false)],
      )];
      repairClusterShape(syllables, {
        codaConstraints: { voicingAgreement: true },
      });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["s"]);
    });

    it("keeps agreeing obstruents", () => {
      // /p/ (voiceless) + /s/ (voiceless) → keep both
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [phFull("p", "stop", false, "bilabial"), phFull("s", "sibilant", false)],
      )];
      repairClusterShape(syllables, {
        codaConstraints: { voicingAgreement: true },
      });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["p", "s"]);
    });

    it("does not affect sonorants", () => {
      // /n/ (nasal, voiced) + /s/ (voiceless) → keep both (nasal is not obstruent)
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [phFull("n", "nasal", true), phFull("s", "sibilant", false)],
      )];
      repairClusterShape(syllables, {
        codaConstraints: { voicingAgreement: true },
      });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["n", "s"]);
    });
  });

  describe("homorganic nasal+stop", () => {
    it("drops nasal when place disagrees with following stop", () => {
      // /m/ (bilabial) + /t/ (alveolar) → drop /m/
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [phFull("m", "nasal", true, "bilabial"), phFull("t", "stop", false, "alveolar")],
      )];
      repairClusterShape(syllables, {
        codaConstraints: { homorganicNasalStop: true },
      });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["t"]);
    });

    it("keeps homorganic nasal+stop", () => {
      // /n/ (alveolar) + /t/ (alveolar) → keep both
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [phFull("n", "nasal", true, "alveolar"), phFull("t", "stop", false, "alveolar")],
      )];
      repairClusterShape(syllables, {
        codaConstraints: { homorganicNasalStop: true },
      });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["n", "t"]);
    });

    it("drops ŋ before non-velar stop", () => {
      // /ŋ/ (velar) + /t/ (alveolar) → drop /ŋ/
      const syllables = [sylFull(
        [],
        [ph("æ")],
        [phFull("ŋ", "nasal", true, "velar"), phFull("t", "stop", false, "alveolar")],
      )];
      repairClusterShape(syllables, {
        codaConstraints: { homorganicNasalStop: true },
      });
      expect(syllables[0].coda.map(p => p.sound)).toEqual(["t"]);
    });
  });
});
