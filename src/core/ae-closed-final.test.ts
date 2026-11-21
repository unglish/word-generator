import { describe, expect, it } from "vitest";
import { createGenerator, generateWord, generateWords } from "../index.js";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Word } from "../types.js";
import { findExample, type WordSource } from "../test-support/find-example.js";

// #459 follow-up. Closed /eɪ/ "ae" relies on magic-e (pae+n → pane). Before a
// hard c or g, magic-e wrote "ace"/"age" (batace, bovages), which read /eɪs/
// and /eɪdʒ/. Where magic-e cannot split (a digraph coda such as "ch", one
// ending in a vowel letter such as "ssi", or one already spelled with a final e
// such as "ge") or misses its 5% roll, "ae" was left as is (fubaech, bepaen,
// ataege).

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

/** First seeded word with a closed ae syllable matching `predicate`. */
function findClosedAe(
  predicate: (word: Word, ae: ClosedAe) => boolean,
  property: string,
  generator?: WordSource,
  limit = 20_000,
): { word: Word; syllableIndex: number } {
  const { word } = findExample((w) => closedAe(w).some((ae) => predicate(w, ae)), {
    property,
    generator,
    limit,
    firstSeed: 1_000_000,
  });
  return { word, syllableIndex: closedAe(word).find((ae) => predicate(word, ae))!.syllableIndex };
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
      limit: 40_000,
      firstSeed: 1_000_000,
    });
    expect(word.written.clean).toMatch(/agu/);
  });

  it("rewrites closed ae before a one-consonant coda spelled with a final e (age, ace, ave)", () => {
    // One coda consonant spelled with a final e (ce, ge, ve, se): the digraph's
    // e is dropped, not turned into ai (traece → trace, not traice).
    const { word, syllableIndex } = findClosedAe((w, ae) => {
      const coda = w.trace!.graphemeSelections.filter(
        (g) => g.syllableIndex === ae.syllableIndex && g.position === "coda",
      );
      return coda.length === 1 && /^[bcdfghjklmnpqrstvwxz]e$/.test(coda[0].emitted);
    }, "a closed ae before a one-consonant coda spelled with a final e", undefined, 40_000);
    const letters = spelledSyllable(word, syllableIndex);
    expect(letters, word.written.clean).toBeDefined();
    expect(letters!, word.written.clean).toMatch(/a[bcdfghjklmnpqrstvwxz]e$/);
    expect(hasRule(word, "ae-before-e-coda"), word.written.clean).toBe(true);
  });

  // Rare codas, reached by boosting one coda spelling in a test generator.
  function withBoostedCoda(phoneme: string, form: string) {
    const graphemes = englishConfig.graphemes.map((g) =>
      g.phoneme === phoneme && g.form === form ? { ...g, frequency: g.frequency * 200 } : g,
    );
    return createGenerator({ ...englishConfig, graphemes, graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps });
  }

  function beforeCoda(form: string) {
    return (w: Word, ae: ClosedAe) => {
      const coda = w.trace!.graphemeSelections.filter(
        (g) => g.syllableIndex === ae.syllableIndex && g.position === "coda",
      );
      return coda.length === 1 && coda[0].emitted === form;
    };
  }

  // /ʃ/ ssi ends in a vowel letter, so magic-e cannot split it: ai.
  it("spells closed ae before an ssi coda as aissi", () => {
    const { word, syllableIndex } = findClosedAe(
      beforeCoda("ssi"),
      "a closed ae before an ssi coda",
      withBoostedCoda("ʃ", "ssi"),
      40_000,
    );
    const letters = spelledSyllable(word, syllableIndex);
    expect(letters, word.written.clean).toBeDefined();
    expect(letters!, word.written.clean).toMatch(/ai(ssi)$/);
  });

  // Closed /eɪ/ + /g/, "nge" and e-final clusters are too rare to sample even
  // with a boosted spelling, so check the configured rule patterns directly.
  it("rewrites ae + gue to ague, ae + nge to ange, and e-final clusters to ai", () => {
    const rewrite = (name: string, letters: string) => {
      const rule = englishConfig.spellingRules!.find((r) => r.name === name)!;
      return letters.replace(new RegExp(rule.pattern), rule.replacement);
    };
    expect(rewrite("ae-before-e-coda", "vaegue")).toBe("vague");
    expect(rewrite("ae-before-e-coda", "snaenge")).toBe("snange");
    expect(rewrite("ae-before-e-coda", "aege")).toBe("age");
    expect(rewrite("ae-before-e-coda", "faelse")).toBe("faelse");
    expect(rewrite("ae-unsplit-to-ai", "faelse")).toBe("failse");
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
        // respell, dropping the digraph e before an e-final coda, or ae → ai),
        // and none keeps "ae" before a consonant letter.
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
