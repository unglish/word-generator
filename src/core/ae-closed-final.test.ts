import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";

// #459 follow-up. Closed /eɪ/ "ae" relies on magic-e (pae+n → pane). Before a
// hard c or g, magic-e wrote "ace"/"age" (batace, bovages), which read /eɪs/
// and /eɪdʒ/. Where magic-e cannot split (a digraph coda such as "ch") or
// misses its 5% roll, "ae" was left as is (fubaech, bepaen).

interface ClosedAe {
  syllableIndex: number;
  coda: string[];
}

/** Syllables whose /eɪ/ was selected as "ae" before a same-syllable coda. */
function closedAe(word: Word): ClosedAe[] {
  const selections = word.trace!.graphemeSelections;
  return selections.flatMap((nucleus) => {
    if (nucleus.phoneme !== "eɪ" || nucleus.selected !== "ae") return [];
    const coda = selections
      .filter((g) => g.syllableIndex === nucleus.syllableIndex && g.position === "coda")
      .map((g) => g.phoneme);
    return coda.length ? [{ syllableIndex: nucleus.syllableIndex, coda }] : [];
  });
}

/** The syllable's letters after its last syllable-scope spelling rule. */
function spelledSyllable(word: Word, syllableIndex: number): string | undefined {
  const scope = `syllable:${syllableIndex}`;
  return word.trace!.repairs.filter((r) => r.detail === scope && r.rule.startsWith("spellingRule:")).at(-1)?.after;
}

function hasRule(word: Word, rule: string): boolean {
  return word.trace!.repairs.some((r) => r.rule === `spellingRule:${rule}`);
}

describe("closed-syllable /eɪ/ ae (#459 follow-up)", () => {
  it("spells hard /k/ after ae as k, so magic-e gives ake", () => {
    const { word } = findExample(
      (w) => hasRule(w, "ae-hard-c-to-k") && hasRule(w, "magic-e"),
      { property: "an ae + c coda respelled before magic-e", limit: 20_000, firstSeed: 1_000_000 },
    );
    expect(word.written.clean).toMatch(/ak/);
    expect(word.written.clean).not.toMatch(/ac[eiy]/);
  });

  it("spells hard /g/ after ae as ague", () => {
    const { word } = findExample((w) => hasRule(w, "ae-hard-g-to-gue"), {
      property: "an ae + g coda respelled as ague",
      limit: 20_000,
      firstSeed: 1_000_000,
    });
    expect(word.written.clean).toMatch(/agu/);
  });

  it("leaves no closed ae unsplit, and no soft c/g for hard /k g/, over a seeded sample", () => {
    let closed = 0;
    let unsplitToAi = 0;
    for (const word of generateWords(8_000, { seed: 4590, trace: true })) {
      for (const { syllableIndex, coda } of closedAe(word)) {
        closed++;
        const letters = spelledSyllable(word, syllableIndex);
        const where = `${word.written.clean}: syllable ${syllableIndex} → ${letters}`;
        // Every closed ae is rewritten by some syllable rule (magic-e, a hard-stop
        // respell, or ae → ai), and none keeps "ae" before a consonant letter.
        expect(letters, where).toBeDefined();
        expect(letters!, where).not.toMatch(/ae[^aeiouy]/);
        if (coda.length === 1 && coda[0] === "k") expect(letters!, where).not.toMatch(/c[eiy]?$/);
        if (coda.length === 1 && coda[0] === "g") expect(letters!, where).not.toMatch(/age$/);
        if (letters!.includes("ai")) unsplitToAi++;
      }
    }
    expect(closed).toBeGreaterThan(50);
    // Mostly magic-e splits; ai covers its misses and digraph codas.
    expect(unsplitToAi).toBeGreaterThan(0);
    expect(unsplitToAi).toBeLessThan(closed / 2);
  });

  it("is deterministic and trace-neutral", () => {
    const { seed } = findExample((w) => closedAe(w).length > 0, {
      property: "a closed ae",
      limit: 2_000,
      firstSeed: 1_000_000,
    });
    const traced = generateWord({ seed, trace: true });
    const untraced = generateWord({ seed });
    expect(untraced.written.clean).toBe(traced.written.clean);
    expect(untraced.pronunciation).toBe(traced.pronunciation);
  });
});
