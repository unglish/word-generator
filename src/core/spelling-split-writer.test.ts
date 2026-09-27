import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../index.js";
import { englishSplitVowelSupports } from "../elements/graphemes/split-vowels.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { createSplitLedgerReplayer } from "./spelling-split-replay.js";
import { verifyCompletionSchedule } from "./spelling-completion-schedule.js";

const splitVowels = { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
} };
describe("split vowel public writer integration", () => {
  it("replays public outputs with exact trace-on/off RNG parity", () => {
    const config = { ...englishConfig, sharedSpellings: englishSharedSpellings, splitVowels };
    const generator = createGenerator(config);
    const replay = createSplitLedgerReplayer(config, splitVowels.supports, splitVowels.routes);
    const on = createSeededRng(129); const off = createSeededRng(129);
    let tracedCalls = 0; let plainCalls = 0; let formations = 0; let completions = 0;
    for (let draw = 0; draw < 500; draw++) {
      const options = { morphology: draw % 2 === 0, mode: draw % 3 ? "text" as const : "lexicon" as const };
      const traced = generator.generateWord({ ...options, rand: () => { tracedCalls++; return on(); }, trace: true });
      const plain = generator.generateWord({ ...options, rand: () => { plainCalls++; return off(); } });
      const trace = traced.trace!.baseSpelling!;
      if (trace.version !== 5) throw new Error("Expected v5");
      expect(() => replay(trace), `draw ${draw}`).not.toThrow();
      expect(() => verifyCompletionSchedule(trace), `draw ${draw}`).not.toThrow();
      formations += trace.split.constructions.length; completions += trace.completion.certificates.length;
      delete traced.trace; expect(traced).toEqual(plain); expect(tracedCalls).toBe(plainCalls);
    }
    expect(formations).toBeGreaterThan(0); expect(completions).toBeGreaterThan(0); expect(on()).toBe(off());
  });
});
