import { describe, it, expect } from "vitest";
import { repairClusters, repairFinalCoda } from "./repair.js";
import type { Syllable, Phoneme } from "../types.js";

/** Helper to create a minimal phoneme. */
function ph(sound: string): Phoneme {
  return { sound, stress: 0 } as Phoneme;
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
