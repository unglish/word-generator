import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import { nucleusSlots } from "../test-support/syllable-shape.js";

// Issue #472: English writes /aɪ/ as "ie" only after a consonant (pie, tried).
// An onsetless "ie" started words with "ie" (iesitur, iekay, ielemed). Its
// share must not move to "is", which English uses for /aɪ/ only before /l/
// (isle, island), not in israke.

/** Onsetless /aɪ/ in the root's first syllable. */
const initialOnsetless = (w: Word) =>
  nucleusSlots(w, "aɪ").filter((s) => s.onsetLength === 0 && s.nucleus.syllableIndex === 0);

describe("/aɪ/ ie needs an onset (#472)", () => {
  it("filters ie out of an onsetless initial /aɪ/, and traced output matches untraced", () => {
    const { word, options } = findExample(
      (w) => initialOnsetless(w).some((s) => s.nucleus.candidates.includes("ie")),
      { property: "an onsetless root-initial /aɪ/", limit: 2_000, firstSeed: 2_000_000 },
    );
    for (const { nucleus } of initialOnsetless(word)) {
      expect(nucleus.afterCondition, word.written.clean).not.toContain("ie");
      expect(nucleus.selected, word.written.clean).not.toBe("ie");
    }
    expect(word.written.clean.startsWith("ie")).toBe(false);
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("filters is out of /aɪ/ after an onset, even before /l/", () => {
    // After an onset, is reads /ɪs/ (lisltig); English uses it only in isle, island.
    const onsetBeforeL = (w: Word) => nucleusSlots(w, "aɪ").filter((s) =>
      s.onsetLength > 0 && s.nucleus.candidates.includes("is")
      && w.trace!.graphemeSelections[s.nucleus.index + 1]?.phoneme === "l");
    const { word } = findExample((w) => onsetBeforeL(w).length > 0, {
      property: "an /aɪ/ after an onset and before /l/",
      limit: 5_000,
      firstSeed: 2_000_000,
    });
    for (const { nucleus } of onsetBeforeL(word)) {
      expect(nucleus.afterCondition, word.written.clean).not.toContain("is");
    }
  });

  it("keeps ie after an onset and is before /l/ over a seeded sample", () => {
    let onsetIe = 0;
    let onsetlessI = 0;
    let onsetless = 0;
    for (const word of generateWords(5_000, { seed: 472, trace: true })) {
      const selections = word.trace!.graphemeSelections;
      for (const { nucleus, onsetLength } of nucleusSlots(word, "aɪ")) {
        const where = `${word.written.clean}: /aɪ/ ${nucleus.selected}`;
        if (nucleus.selected === "is") expect(selections[nucleus.index + 1]?.phoneme, where).toBe("l");
        if (onsetLength > 0) {
          if (nucleus.selected === "ie") onsetIe++;
          continue;
        }
        expect(nucleus.selected, where).not.toBe("ie");
        onsetless++;
        if (nucleus.selected === "i") onsetlessI++;
      }
    }
    expect(onsetless).toBeGreaterThan(50);
    // Onsetless /aɪ/ is mostly plain i (idle, iron); pie-type ie survives.
    expect(onsetlessI / onsetless).toBeGreaterThan(0.7);
    expect(onsetIe).toBeGreaterThan(20);
  });
});
