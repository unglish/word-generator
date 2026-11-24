import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, generateWord, generateWords } from "../index.js";

describe("soft c and sc before written vowels (#495)", () => {
  it("retains the syllable breaks when a word rule also crosses a join", () => {
    const word = generateWord({ seed: 1617914836, mode: "lexicon", trace: true });
    expect(word.written.clean).toBe("salniquef");
    expect(word.trace?.baseSpelling?.edits.map(edit => edit.rule)).toContain("spellingRule:cw-to-qu");
    const parts = word.written.hyphenated.split("&shy;");
    expect(parts).toHaveLength(word.syllables.length);
    expect(parts.join("")).toBe(word.written.clean);
  });

  it("does not exceed a spelling budget through a custom context repair", () => {
    const generator = createGenerator({
      ...englishConfig,
      writtenFormConstraints: {
        ...englishConfig.writtenFormConstraints,
        letterContexts: [
          { name: "custom", phoneme: "k", forms: ["k"], hardBefore: ["a", "e", "i", "o", "u"], replacement: "e" },
        ],
      },
    });
    const word = generator.generateWord({ seed: 8, mode: "lexicon", morphology: false });
    expect(word.written.clean).toBe("zeker");
  });

  it.each([
    { seed: 8172032, spelling: "sarge", root: "sarge", pronunciation: "særdʒ", source: "c" },
    { seed: 8172171, spelling: "rasurch", root: "rasurch", pronunciation: "ˈrɑs.ɚtʃ", source: "c" },
    { seed: 8173072, spelling: "lieyesord", root: "lieyesord", pronunciation: "ˈlaɪ.jə.sɚd", source: "c" },
    { seed: 8173315, spelling: "outsachty", root: "sachty", pronunciation: "ˈaʊtˌsætʃ.ti:", source: "sc" },
  ])("writes $spelling while keeping its intended sounds", ({ seed, spelling, root, pronunciation, source }) => {
    const word = generateWord({ seed, mode: "lexicon", trace: true });
    expect(word.written.clean).toBe(spelling);
    expect(word.pronunciation).toBe(pronunciation);
    expect(word.trace?.baseSpelling?.surface).toBe(root);
    expect(word.trace?.baseSpelling?.cells.map((cell) => cell.text).join("")).toBe(root);
    expect(word.trace?.graphemeSelections).toContainEqual(expect.objectContaining({
      phoneme: "s", selected: source, letterRespelled: expect.objectContaining({ form: "s" }),
    }));
    expect(word.trace?.baseSpelling?.edits).toContainEqual(expect.objectContaining({ before: source, after: "s" }));

    const untraced = generateWord({ seed, mode: "lexicon" });
    expect(untraced.written).toEqual(word.written);
    expect(untraced.pronunciation).toBe(pronunciation);
  });

  it("keeps /s/ when a suffix drops the e that softened a root-final c", () => {
    const word = generateWord({ seed: 8177826, mode: "lexicon", trace: true });
    expect(word.pronunciation).toBe("ˈpʰræs.ə.bəl");
    expect(word.trace?.baseSpelling?.surface).toBe("prase");
    expect(word.trace?.morphology?.realization?.emittedParts).toEqual([
      { role: "root", text: "pras" },
      { role: "suffix", text: "able" },
    ]);
    expect(word.written.clean).toBe("prasable");
  });

  it.each([
    { seed: 3000007, spelling: "cettasag", pronunciation: "ˈsɛ.tʰə.səg" },
    { seed: 3000656, spelling: "scievedo", pronunciation: "ˈsaɪ.vəd.ə" },
    { seed: 3000000, spelling: "cunave", pronunciation: "ˈkʰun.əv" },
  ])("retains the compatible c spelling in $spelling", ({ seed, spelling, pronunciation }) => {
    const word = generateWord({ seed, mode: "lexicon" });
    expect(word.written.clean).toBe(spelling);
    expect(word.pronunciation).toBe(pronunciation);
  });

  it("uses c for /k/ only where the written vowel cues hard /k/", { timeout: 20_000 }, () => {
    const hardCs = { "eɪ": 0, "ɚ": 0 };
    let ksBeforeSoftLetters = 0;
    const falseSoftCs: string[] = [];
    for (const word of generateWords(6_000, { seed: 4950, mode: "lexicon", trace: true })) {
      const base = word.trace!.baseSpelling!;
      const root = word.trace?.morphology?.realization?.emittedParts.find(part => part.role === "root")?.text
        ?? base.surface;
      if (!base.surface.startsWith(root)) continue;
      for (const [index, cell] of base.cells.entries()) {
        if (index >= root.length) continue;
        const { origin } = cell;
        const sourceIds = origin.kind === "rewrite" ? origin.sourceUnitIds : [origin.unitId];
        if (sourceIds.length !== 1) continue;
        const unit = base.units[sourceIds[0]];
        const phone = base.phones[unit.phoneIds[0]];
        const vowel = base.phones[phone.id + 1];
        if (phone.soundAtSpelling !== "k" || phone.segment !== "onset" ||
            vowel?.segment !== "nucleus" || phone.syllableIndex !== vowel.syllableIndex) continue;
        const sound = vowel.soundAtSpelling;
        if (sound !== "eɪ" && sound !== "ɚ") continue;
        const next = root[index + 1] ?? "";
        if (cell.text === "c" && /^[aou]/.test(next)) hardCs[sound]++;
        if (cell.text === "c" && /^[eiy]/.test(next)) falseSoftCs.push(word.written.clean);
        if (cell.text === "k" && /^[eiy]/.test(next)) ksBeforeSoftLetters++;
      }
    }
    expect(hardCs["eɪ"]).toBeGreaterThan(5);
    expect(hardCs["ɚ"]).toBeGreaterThan(5);
    expect(ksBeforeSoftLetters).toBeGreaterThan(5);
    expect(falseSoftCs).toEqual([]);
  });
});
