import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import { hasSuffix, nucleusSlots } from "../test-support/syllable-shape.js";

// Issue #473: English writes /ɔɪ/ as "oy" at word end or before a vowel or
// suffix (boy, royal, toys, enjoyed), and as "oi" before a consonant in the
// same syllable (point, moist). oy before a coda gave udoyts, laroynt. The
// issue's follow-on note: /aʊ/ before /t/ is ou (out, doubt), not ow.

describe("/ɔɪ/ oy open-syllable only (#473)", () => {
  it("filters oy out before a same-syllable coda, and traced output matches untraced", () => {
    const closed = (w: Word) => nucleusSlots(w, "ɔɪ").filter((s) =>
      s.codaLength > 0 && s.nucleus.candidates.includes("oy"));
    const { word, options } = findExample((w) => closed(w).length > 0, {
      property: "a closed /ɔɪ/ with oy in its candidate pool",
      limit: 2_000,
      firstSeed: 2_000_000,
    });
    for (const { nucleus } of closed(word)) {
      expect(nucleus.afterCondition, word.written.clean).not.toContain("oy");
      expect(nucleus.afterCondition, word.written.clean).toContain("oi");
    }
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("spells closed /ɔɪ/ as oi and keeps oy before a suffix over a seeded sample", () => {
    let closedOi = 0;
    let oyBeforeSuffix = 0;
    for (const word of generateWords(8_000, { seed: 473, trace: true })) {
      const slots = nucleusSlots(word, "ɔɪ");
      for (const { nucleus, codaLength } of slots) {
        if (codaLength === 0) continue;
        expect(nucleus.selected, `${word.written.clean}: ${nucleus.selected} + ${codaLength} coda`).not.toBe("oy");
        if (nucleus.selected === "oi") closedOi++;
      }
      // toys, enjoyed: a root-final open /ɔɪ/ written oy right before the suffix.
      const last = word.trace!.graphemeSelections.at(-1);
      const suffix = word.trace!.morphology?.realization?.suffix?.resolved.written;
      if (hasSuffix(word) && last?.phoneme === "ɔɪ" && suffix && word.written.clean.endsWith(`oy${suffix}`)) {
        oyBeforeSuffix++;
      }
    }
    expect(closedOi).toBeGreaterThan(20);
    expect(oyBeforeSuffix).toBeGreaterThan(0);
  });

  it("filters ow out of /aʊ/ before /t/", () => {
    const beforeT = (w: Word) => w.trace!.graphemeSelections.filter((g, i, all) =>
      g.phoneme === "aʊ" && all[i + 1]?.phoneme === "t" && g.candidates.includes("ow"));
    const { word, options } = findExample((w) => beforeT(w).length > 0, {
      property: "an /aʊ/ before /t/ with ow in its candidate pool",
      limit: 20_000,
      firstSeed: 2_000_000,
    });
    for (const g of beforeT(word)) {
      expect(g.afterCondition, word.written.clean).not.toContain("ow");
      expect(g.selected, word.written.clean).toBe("ou");
    }
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("never spells /aʊ/ before /t/ as ow, and keeps ow before n and l, over a seeded sample", () => {
    let owBeforeNl = 0;
    for (const word of generateWords(5_000, { seed: 4730, trace: true })) {
      const selections = word.trace!.graphemeSelections;
      selections.forEach((g, i) => {
        const next = selections[i + 1]?.phoneme;
        if (g.phoneme !== "aʊ" || !next) return;
        if (next === "t") expect(g.selected, `${word.written.clean}: /aʊ/ before /t/`).not.toBe("ow");
        if (["n", "l"].includes(next) && g.selected === "ow") owBeforeNl++;
      });
    }
    // About 27 per 5k; the floor only guards against ow vanishing.
    expect(owBeforeNl).toBeGreaterThan(10);
  });
});
