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

interface EiSlot {
  nucleus: GraphemeTrace;
  codaLength: number;
}

function eiSlots(word: Word): EiSlot[] {
  const selections = word.trace!.graphemeSelections;
  return selections.flatMap((nucleus, i) => {
    if (nucleus.phoneme !== "eɪ" || nucleus.position !== "nucleus") return [];
    const codaLength = selections
      .slice(i + 1)
      .filter((g) => g.syllableIndex === nucleus.syllableIndex && g.position === "coda").length;
    return [{ nucleus, codaLength }];
  });
}

const isEyAy = (g: GraphemeTrace) => g.selected === "ey" || g.selected === "ay";

describe("/eɪ/ ey/ay open-syllable only (#459)", () => {
  it("does not spell /eɪ/ as ey/ay before a same-syllable coda on the issue seeds", () => {
    for (const seed of ISSUE_SEEDS) {
      const word = generateWord({ seed, trace: true });
      const closedEyAy = eiSlots(word).filter((s) => s.codaLength > 0 && isEyAy(s.nucleus));
      expect(closedEyAy, `seed ${seed} → ${word.written.clean}`).toEqual([]);
      expect(generateWord({ seed, trace: true }).written.clean).toBe(word.written.clean);
    }
  });

  it("keeps ey/ay open-only and spells closed finals as a_e or ai", () => {
    let openFinal = 0;
    let openFinalEyAy = 0;
    let closedFinal = 0;
    const closedFinalForms = new Map<string, number>();
    for (const word of generateWords(5_000, { seed: 459, trace: true })) {
      for (const { nucleus, codaLength } of eiSlots(word)) {
        const where = `${word.written.clean}: ${nucleus.selected} + ${codaLength} coda`;
        if (codaLength > 0) expect(isEyAy(nucleus), where).toBe(false);
        if (nucleus.selection?.syllablePosition !== "final") continue;
        if (codaLength === 0) {
          openFinal++;
          if (isEyAy(nucleus)) openFinalEyAy++;
          continue;
        }
        closedFinal++;
        // Bare "a" before a coda reads /æ/ (bepan); "ae" is only legal where
        // magic-e can split it, i.e. before a single consonant.
        expect(nucleus.selected, where).not.toBe("a");
        if (nucleus.selected === "ae") expect(codaLength, where).toBe(1);
        closedFinalForms.set(nucleus.selected, (closedFinalForms.get(nucleus.selected) ?? 0) + 1);
      }
    }
    expect(openFinal).toBeGreaterThan(20);
    expect(openFinalEyAy / openFinal).toBeGreaterThan(0.5);
    expect(closedFinal).toBeGreaterThan(20);
    expect(closedFinalForms.get("ae") ?? 0).toBeGreaterThan(closedFinal / 2);
  });
});
