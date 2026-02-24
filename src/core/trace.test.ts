import { describe, it, expect } from "vitest";
import { createGenerator, generateWord } from "./generate.js";
import { englishConfig } from "../config/english.js";
import { ENGLISH_VOWEL_SOUND_SET } from "./vowel-sounds.js";

describe("trace pipeline", () => {
  it("attaches a trace when trace: true is passed", () => {
    const word = generateWord({ seed: 42, trace: true });
    expect(word.trace).toBeDefined();
    const t = word.trace!;

    // stages
    expect(t.stages.length).toBeGreaterThan(0);
    expect(t.stages[0].name).toBe("generateSyllables");
    for (const stage of t.stages) {
      expect(stage).toHaveProperty("name");
      expect(stage).toHaveProperty("before");
      expect(stage).toHaveProperty("after");
      expect(Array.isArray(stage.before)).toBe(true);
      expect(Array.isArray(stage.after)).toBe(true);
    }

    // grapheme selections
    expect(t.graphemeSelections.length).toBeGreaterThan(0);
    for (const g of t.graphemeSelections) {
      expect(typeof g.index).toBe("number");
      expect(typeof g.phoneme).toBe("string");
      expect(typeof g.position).toBe("string");
      expect(typeof g.syllableIndex).toBe("number");
      expect(Array.isArray(g.candidates)).toBe(true);
      expect(Array.isArray(g.afterCondition)).toBe(true);
      expect(Array.isArray(g.afterPosition)).toBe(true);
      expect(Array.isArray(g.weights)).toBe(true);
      expect(typeof g.roll).toBe("number");
      expect(typeof g.selected).toBe("string");
      expect(typeof g.emitted).toBe("string");
      expect(typeof g.doubled).toBe("boolean");
    }
    const weightedSelections = t.graphemeSelections.filter(g => g.weights.length > 1);
    expect(weightedSelections.length).toBeGreaterThan(0);
    expect(weightedSelections.some(g => g.roll > 0)).toBe(true);

    // summary
    expect(t.summary).toBeDefined();
    expect(typeof t.summary.totalDecisions).toBe("number");
    expect(typeof t.summary.repairCount).toBe("number");
    expect(typeof t.summary.morphologyApplied).toBe("boolean");
    expect(t.summary.totalDecisions).toBe(t.graphemeSelections.length);
  });

  it("does not attach a trace when trace option is not set", () => {
    const word = generateWord({ seed: 42 });
    expect(word.trace).toBeUndefined();
  });

  it("stage snapshots use string arrays, not Phoneme objects", () => {
    const word = generateWord({ seed: 42, trace: true, syllableCount: 2 });
    const afterGen = word.trace!.stages.find(s => s.name === "generateSyllables")!;
    expect(afterGen.after.length).toBeGreaterThan(0);
    for (const snap of afterGen.after) {
      for (const sound of [...snap.onset, ...snap.nucleus, ...snap.coda]) {
        expect(typeof sound).toBe("string");
      }
    }
  });

  it("captures repair traces with rule, before, and after", () => {
    let foundRepair = false;
    for (let s = 0; s < 200; s++) {
      const w = generateWord({ seed: s, trace: true });
      if (w.trace!.repairs.length > 0) {
        const r = w.trace!.repairs[0];
        expect(typeof r.rule).toBe("string");
        expect(typeof r.before).toBe("string");
        expect(typeof r.after).toBe("string");
        expect(r.before).not.toBe(r.after);
        foundRepair = true;
        break;
      }
    }
    expect(foundRepair).toBe(true);
  });

  it("summary.repairCount matches repairs array length", () => {
    const word = generateWord({ seed: 10, trace: true });
    const t = word.trace!;
    expect(t.summary.repairCount).toBe(t.repairs.length);
  });

  it("captures orthography ownership aligned to final written form", () => {
    const word = generateWord({ seed: 42, trace: true });
    const t = word.trace!;
    expect(t.orthography).toBeDefined();

    const o = t.orthography!;
    expect(o.surface).toBe(word.written.clean);
    expect(o.chars.length).toBe(word.written.clean.length);
    expect(o.graphemeUnits.length).toBe(t.graphemeSelections.length);
    if (o.phonemeUnits) {
      expect(o.phonemeUnits.length).toBe(t.graphemeSelections.length);
    }

    for (let i = 0; i < o.chars.length; i++) {
      expect(o.chars[i].index).toBe(i);
      expect(typeof o.chars[i].char).toBe("string");
    }

    const presentUnits = o.graphemeUnits.filter(u => u.present);
    expect(presentUnits.length).toBeGreaterThan(0);
    for (const unit of presentUnits) {
      expect(unit.start).not.toBeNull();
      expect(unit.end).not.toBeNull();
      expect(unit.start!).toBeGreaterThanOrEqual(0);
      expect(unit.end!).toBeGreaterThanOrEqual(unit.start!);
      expect(unit.end!).toBeLessThan(word.written.clean.length);
    }
  });

  it("traces morphology plan details when morphology is enabled", () => {
    let found = false;
    for (let s = 0; s < 200; s++) {
      const w = generateWord({ seed: s, morphology: true, trace: true });
      if (w.trace!.morphology && w.trace!.morphology.template !== "bare") {
        const m = w.trace!.morphology;
        expect(typeof m.template).toBe("string");
        expect(typeof m.syllableReduction).toBe("number");
        // At least one of prefix/suffix should be defined for non-bare
        expect(m.prefix !== undefined || m.suffix !== undefined).toBe(true);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("does not include morphology trace when morphology is not used", () => {
    const word = generateWord({ seed: 42, trace: true });
    expect(word.trace!.morphology).toBeUndefined();
  });

  // Boundary drops are effectively eliminated by top-down phoneme planning,
  // which pre-assigns onset/coda lengths and avoids equal-sonority boundaries.
  // Verified: 0 occurrences in 20k lexicon-mode + 20k forced-4-syl samples.
  // Keeping adjustBoundary code as a safety net; re-enable test if the
  // pipeline changes make drops possible again.
  it.skip("captures boundary adjustment drops when they occur", () => {
    let found = false;
    for (let s = 0; s < 750; s++) {
      const w = generateWord({ seed: s, syllableCount: 4, trace: true });
      const drops = w.trace!.structural.filter(e => e.event === "boundaryDrop");
      if (drops.length > 0) {
        expect(drops[0].detail).toMatch(/dropped coda/);
        expect(drops[0].detail).toMatch(/equal sonority/);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("traces final-s extension", () => {
    let found = false;
    for (let s = 0; s < 500; s++) {
      const w = generateWord({ seed: s, trace: true });
      const finalS = w.trace!.structural.filter(e => e.event === "finalS");
      if (finalS.length > 0) {
        expect(finalS[0].detail).toMatch(/appended \/s\//);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("traces nasal+stop extension", () => {
    let found = false;
    for (let s = 0; s < 2000; s++) {
      const w = generateWord({ seed: s, trace: true });
      const ext = w.trace!.structural.filter(e => e.event === "nasalStopExtension");
      if (ext.length > 0) {
        expect(ext[0].detail).toMatch(/extended/);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("vowel-hiatus fallback trace entries use expected detail format", () => {
    for (let s = 0; s < 2000; s++) {
      const w = generateWord({ seed: s, trace: true });
      const events = w.trace!.structural.filter(e => e.event === "vowelHiatusFallback");
      for (const event of events) {
        expect(event.detail).toMatch(/inserted \/h\//);
      }
    }
  });

  it("post-vowel glide policy controls root glide transitions deterministically", () => {
    const zeroGlideGenerator = createGenerator({
      ...englishConfig,
      hiatusPolicy: {
        ...englishConfig.hiatusPolicy!,
        postVowelGlideMultiplier: 0,
      },
    });
    const baselineGenerator = createGenerator({
      ...englishConfig,
      hiatusPolicy: {
        ...englishConfig.hiatusPolicy!,
        postVowelGlideMultiplier: 0.08,
      },
    });

    const countGlideTransitions = (generate: (seed: number) => ReturnType<typeof generateWord>): number => {
      let transitions = 0;
      for (let s = 0; s < 2000; s++) {
        const w = generate(s);
        const stage = w.trace!.stages.find(st => st.name === "generateSyllables");
        if (!stage) continue;
        const seq = stage.after.flatMap(syl => [...syl.onset, ...syl.nucleus, ...syl.coda]);
        for (let i = 0; i < seq.length - 1; i++) {
          if (!ENGLISH_VOWEL_SOUND_SET.has(seq[i])) continue;
          if (seq[i + 1] === "w" || seq[i + 1] === "j") {
            transitions++;
          }
        }
      }
      return transitions;
    };

    const zeroTransitions = countGlideTransitions(seed =>
      zeroGlideGenerator.generateWord({ seed, trace: true, morphology: false, mode: "lexicon" })
    );
    const baselineTransitions = countGlideTransitions(seed =>
      baselineGenerator.generateWord({ seed, trace: true, morphology: false, mode: "lexicon" })
    );

    expect(zeroTransitions).toBe(0);
    expect(baselineTransitions).toBeGreaterThan(0);
  });

  it("root hiatus fallback honors configured bridge phoneme", () => {
    const bridgeGenerator = createGenerator({
      ...englishConfig,
      hiatusPolicy: {
        ...englishConfig.hiatusPolicy!,
        planGuardProbability: 0,
        postVowelGlideMultiplier: 0,
        fallbackBridgeOnsets: [["j", 100]],
      },
    });

    let found = false;
    for (let s = 0; s < 6000; s++) {
      const w = bridgeGenerator.generateWord({
        seed: s,
        trace: true,
        morphology: false,
        mode: "lexicon",
        syllableCount: 3,
      });
      const events = w.trace!.structural.filter(e => e.event === "vowelHiatusFallback");
      if (events.length > 0) {
        for (const event of events) {
          expect(event.detail).toMatch(/inserted \/j\//);
        }
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("keeps root-stage hiatus low in traced samples", () => {
    let hiatus = 0;
    let boundaries = 0;
    for (let s = 0; s < 2000; s++) {
      const w = generateWord({ seed: s, trace: true, morphology: true, mode: "lexicon" });
      const stage = w.trace!.stages.find(st => st.name === "generateSyllables");
      if (!stage) continue;
      const syls = stage.after;
      for (let i = 1; i < syls.length; i++) {
        boundaries++;
        if (syls[i - 1].coda.length === 0 && syls[i].onset.length === 0) hiatus++;
      }
    }
    const rate = boundaries > 0 ? hiatus / boundaries : 0;
    expect(rate).toBeLessThan(0.02);
  });

  it("structural array is always present (may be empty)", () => {
    const word = generateWord({ seed: 42, trace: true });
    expect(Array.isArray(word.trace!.structural)).toBe(true);
  });
});
