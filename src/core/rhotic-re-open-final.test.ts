import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import { hasSuffix, nucleusSlots } from "../test-support/syllable-shape.js";

// Issue #471: English writes /ɚ/ as "re" only in an open final syllable
// (centre, acre), which may take a suffix (acres, centred). Before a coda the
// letters read /rɛ/ (kalmrel, packirzrem, reuggrenned).

describe("/ɚ/ re only in an open final syllable (#471)", () => {
  it("filters re out of a closed final /ɚ/, and traced output matches untraced", () => {
    // The trace keeps the pool before and after the condition filter.
    const closedFinal = (w: Word) => nucleusSlots(w, "ɚ").filter((s) =>
      s.codaLength > 0 && s.nucleus.selection?.syllablePosition === "final" && s.nucleus.candidates.includes("re")
      && !["l", "r"].includes(w.trace!.graphemeSelections[s.nucleus.index - 1]?.phoneme ?? ""));
    const { word, options } = findExample((w) => closedFinal(w).length > 0, {
      property: "a closed final /ɚ/ after a consonant other than l or r",
      limit: 200,
      firstSeed: 2_000_000,
    });
    for (const { nucleus } of closedFinal(word)) {
      expect(nucleus.afterCondition, word.written.clean).not.toContain("re");
      expect(nucleus.afterCondition, word.written.clean).toContain("er");
    }
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("filters re out of an open medial /ɚ/ by position", () => {
    // midWord 0: an open /ɚ/ in a medial syllable passes the coda condition,
    // so only the position filter keeps re out.
    const openMedial = (w: Word) => nucleusSlots(w, "ɚ").filter((s) =>
      s.codaLength === 0 && s.nucleus.selection?.syllablePosition === "medial"
      && s.nucleus.afterCondition.includes("re"));
    const { word } = findExample((w) => openMedial(w).length > 0, {
      property: "an open medial /ɚ/ with re past the condition filter",
      limit: 2_000,
      firstSeed: 2_000_000,
    });
    for (const { nucleus } of openMedial(word)) {
      expect(nucleus.afterPosition, word.written.clean).not.toContain("re");
      expect(nucleus.afterPosition, word.written.clean).toContain("er");
    }
  });

  it("keeps re to open final syllables over a seeded sample", () => {
    let closedFinal = 0;
    let openWordFinalRe = 0;
    let openBeforeSuffixRe = 0;
    for (const word of generateWords(5_000, { seed: 471, trace: true })) {
      for (const { nucleus, codaLength } of nucleusSlots(word, "ɚ")) {
        const where = `${word.written.clean}: ${nucleus.selected} + ${codaLength} coda`;
        const position = nucleus.selection?.syllablePosition;
        if (nucleus.selected === "re") {
          expect(codaLength, where).toBe(0);
          expect(position, where).toBe("final");
          if (hasSuffix(word)) openBeforeSuffixRe++;
          else openWordFinalRe++;
        }
        if (codaLength > 0 && position === "final") closedFinal++;
      }
    }
    expect(closedFinal).toBeGreaterThan(100);
    // The legitimate forms survive: okeleatre, and before a suffix shopres.
    expect(openWordFinalRe).toBeGreaterThan(0);
    expect(openBeforeSuffixRe).toBeGreaterThan(0);
  });
});
