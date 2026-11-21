import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import type { GraphemeTrace } from "./trace.js";

// Issue #459: English writes /eɪ/ as ey/ay almost only in an open syllable
// (they, grey, play) or before a suffix (plays). Same-syllable coda uses
// blocked the pattern (relampeyl, bepayn). Root coda /s|/z/ is also banned.

const ISSUE_SEEDS = [
  1000191, 1000213, 1000165, 1000231, 1000122, 1000052, 1000289, 1000386,
] as const;

const SAMPLE = 20_000;
const RANGE_START = 1_000_000;
const RANGE_END = 1_020_000;

function eiNucleusSelections(word: Word): { nucleus: GraphemeTrace; next?: GraphemeTrace }[] {
  const selections = word.trace!.graphemeSelections;
  return selections.flatMap((nucleus, i) => {
    if (nucleus.phoneme !== "eɪ" || nucleus.position !== "nucleus") return [];
    return [{ nucleus, next: selections[i + 1] }];
  });
}

/** ey/ay whose next root grapheme is a same-syllable coda consonant. */
function eyAyBeforeSameSyllableCoda(word: Word): GraphemeTrace[] {
  return eiNucleusSelections(word).flatMap(({ nucleus, next }) => {
    if (nucleus.selected !== "ey" && nucleus.selected !== "ay") return [];
    if (!next || next.syllableIndex !== nucleus.syllableIndex || next.position !== "coda") {
      return [];
    }
    return [nucleus];
  });
}

describe("/eɪ/ ey/ay open-syllable only (#459)", () => {
  it("does not spell /eɪ/ as ey/ay before a same-syllable coda on the issue seeds", () => {
    for (const seed of ISSUE_SEEDS) {
      const word = generateWord({ seed, trace: true });
      expect(eyAyBeforeSameSyllableCoda(word), `seed ${seed} → ${word.written.clean}`).toEqual([]);
      const again = generateWord({ seed, trace: true });
      expect(again.written.clean).toBe(word.written.clean);
    }
  });

  it("never selects ey/ay before a same-syllable coda over a large sample", () => {
    let ei = 0;
    let openEyAy = 0;
    for (const word of generateWords(SAMPLE, { seed: 459, morphology: true, trace: true })) {
      for (const { nucleus, next } of eiNucleusSelections(word)) {
        ei++;
        const beforeCoda = Boolean(
          next && next.syllableIndex === nucleus.syllableIndex && next.position === "coda",
        );
        if (nucleus.selected === "ey" || nucleus.selected === "ay") {
          expect(beforeCoda, `${word.written.clean}: ${nucleus.selected} before /${next?.phoneme}/`).toBe(
            false,
          );
          openEyAy++;
        }
      }
    }
    expect(ei).toBeGreaterThan(500);
    // Open-syllable ey/ay must remain productive (day, they, plays).
    expect(openEyAy).toBeGreaterThan(50);
  });

  it("keeps ey/ay for open root-final /eɪ/, including before a suffix", () => {
    let openFinal = 0;
    let openFinalEyAy = 0;
    let beforeSuffix = 0;
    for (let seed = RANGE_START; seed < RANGE_END; seed++) {
      const word = generateWord({ seed, trace: true });
      const suffix = word.trace!.morphology?.suffix;
      for (const { nucleus, next } of eiNucleusSelections(word)) {
        if (nucleus.selection?.syllablePosition !== "final") continue;
        const beforeCoda =
          next && next.syllableIndex === nucleus.syllableIndex && next.position === "coda";
        if (beforeCoda) continue;
        openFinal++;
        if (nucleus.selected !== "ey" && nucleus.selected !== "ay") continue;
        openFinalEyAy++;
        if (suffix) beforeSuffix++;
      }
    }
    expect(openFinal).toBeGreaterThan(100);
    expect(openFinalEyAy / openFinal).toBeGreaterThan(0.5);
    expect(beforeSuffix).toBeGreaterThan(10);
  });

  it("reports zero ey/ay-before-coda on seeds 1000000–1019999", () => {
    let beforeCoda = 0;
    let beforeSz = 0;
    for (let seed = RANGE_START; seed < RANGE_END; seed++) {
      const word = generateWord({ seed, trace: true });
      for (const hit of eyAyBeforeSameSyllableCoda(word)) {
        beforeCoda++;
        const i = word.trace!.graphemeSelections.indexOf(hit);
        const next = word.trace!.graphemeSelections[i + 1];
        if (next?.phoneme === "s" || next?.phoneme === "z") beforeSz++;
      }
    }
    expect(beforeCoda).toBe(0);
    expect(beforeSz).toBe(0);
  });
});
