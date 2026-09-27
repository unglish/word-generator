import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../index.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { createBaseSpellingEvidenceVerifier } from "./spelling-evidence.js";

describe("shared spelling public writer integration", () => {
  it("replays generated ledgers and preserves traced/untraced output and RNG", () => {
    const config = { ...englishConfig, sharedSpellings: englishSharedSpellings };
    const generator = createGenerator(config);
    const replay = createBaseSpellingEvidenceVerifier(config);
    const on = createSeededRng(129); const off = createSeededRng(129);
    let a = 0; let b = 0; let formations = 0;
    for (let draw = 0; draw < 500; draw++) {
      const options = { morphology: draw % 2 === 0, mode: draw % 3 ? "text" as const : "lexicon" as const };
      const traced = generator.generateWord({ ...options, rand: () => { a++; return on(); }, trace: true });
      const plain = generator.generateWord({ ...options, rand: () => { b++; return off(); } });
      const ledger = traced.trace!.baseSpelling!;
      expect(ledger.version).toBe(4);
      if (ledger.version !== 4) throw new Error("Expected v4");
      expect(replay(ledger), `draw ${draw}`).toMatchObject({ version: 4, sharedWriterSchedule: "verified" });
      const syllables = new Set(ledger.phones.map(phone => phone.syllableIndex)).size;
      expect(ledger.shared.scans.map(scan => scan.ruleId)).toEqual([
        ...Array(syllables).fill("ks-to-x"), "ks-to-x", "gz-to-x", "cw-to-qu",
      ]);
      formations += ledger.shared.constructions.length;
      delete traced.trace;
      expect(traced).toEqual(plain);
      expect(a).toBe(b);
    }
    expect(formations).toBeGreaterThan(0);
    expect(on()).toBe(off());
  });
  it("detaches the compiled shared policy from caller mutation", () => {
    const rules = structuredClone(englishSharedSpellings);
    const generator = createGenerator({ ...englishConfig, sharedSpellings: rules });
    const expected = generator.generateWord({ seed: 129, trace: true });
    rules[0].id = "changed";
    rules[0].phonemes[0].sound = "changed";
    rules[1].context.following!.letters.length = 0;
    rules.length = 0;
    expect(generator.generateWord({ seed: 129, trace: true })).toEqual(expected);
  });
  it("records v4 with no formations for an explicit empty policy", () => {
    const generator = createGenerator({ ...englishConfig, sharedSpellings: [] });
    const word = generator.generateWord({ seed: 129, trace: true });
    const ledger = word.trace!.baseSpelling!;
    expect(ledger.version).toBe(4);
    if (ledger.version !== 4) throw new Error("Expected v4");
    expect(createBaseSpellingEvidenceVerifier({ ...englishConfig, sharedSpellings: [] })(ledger))
      .toMatchObject({ sharedWriterSchedule: "verified", verifiedScans: 0 });
    expect(ledger.shared.scans).toEqual([]);
    expect(ledger.shared.constructions).toEqual([]);
  });
  it("rejects shared rules without licensed spelling and ambiguous slots at construction", () => {
    expect(() => createGenerator({ ...englishConfig, sharedSpellings: englishSharedSpellings,
      writtenFormConstraints: undefined })).toThrow("preserve-phones");
    expect(() => createGenerator({ ...englishConfig, sharedSpellings: englishSharedSpellings,
      spellingRules: [] })).toThrow("unique predecessor");
  });
});
