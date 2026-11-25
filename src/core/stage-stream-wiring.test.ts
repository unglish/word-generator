/**
 * Checks that each generation stage draws from its own stream (#556).
 *
 * The stage stream probe shifts one stage's draws (`(r + 0.5) % 1`). Shifting a
 * stage must change some words, which shows the stage reads its own stream;
 * shifting it must leave what it cannot affect alone, which shows no other
 * stage reads it.
 */
import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, generateWord } from "../index.js";
import type { Word, WordGenerationOptions } from "../types.js";
import { withShiftedStage, type Stage } from "../test-support/stage-stream-probe.js";
import { ATTEMPT_STAGES, WORD_STAGES } from "./stage-streams.js";


const SEEDS = Array.from({ length: 300 }, (_, i) => 556_000 + i);

function untraced(word: Word): Omit<Word, "trace"> {
  const copy = { ...word };
  delete copy.trace;
  return copy;
}

function generate(options: WordGenerationOptions, stage?: Stage, attempts?: (attempt: number) => boolean): Word {
  const run = () => generateWord({ ...options, mode: "lexicon", trace: true });
  return stage ? withShiftedStage(stage, run, attempts) : run();
}

const selected = (word: Word) => word.trace!.selection!.selectedAttempt;
const gapSpelled = (word: Word) => word.trace!.repairs.some(repair => repair.rule.startsWith("gapSpelling:"));

describe("stage stream wiring (#556)", () => {
  // Every stage, with the morphology setting under which it draws. A bare and
  // an affixed word render their pronunciation at different points, so that
  // stage is checked under both.
  const affixStages: ReadonlySet<Stage> = new Set(["plan_morphology", "preview_morphology"]);
  const stages: ReadonlyArray<[Stage, boolean]> = [
    ...[...WORD_STAGES, ...ATTEMPT_STAGES].map((stage): [Stage, boolean] => [stage, affixStages.has(stage)]),
    ["render_pronunciation", true],
  ];

  // preview_morphology draws only for hiatus bridges and rare re-picks, so the
  // search runs past the shared sample.
  it.each(stages)("%s reads its own stream (morphology %s)", (stage, morphology) => {
    const changes = (seed: number) =>
      JSON.stringify(untraced(generate({ seed, morphology }, stage))) !==
      JSON.stringify(untraced(generate({ seed, morphology })));
    const witness = Array.from({ length: 5_000 }, (_, i) => 556_000 + i).find(changes);
    expect(witness, `a word that shifting ${stage} changes`).toBeDefined();
  });

  // A bare word's gap spellings match its realized syllables, so pronunciation
  // draws can change which applies; the spelling is compared without them.
  it.each([false, true])("spelling and pronunciation streams leave each other and the root alone (morphology %s)", morphology => {
    let compared = 0;
    for (const seed of SEEDS) {
      const base = generate({ seed, morphology });
      const spelled = generate({ seed, morphology }, "spell");
      const finalized = generate({ seed, morphology }, "finalize_root_spelling");
      const rendered = generate({ seed, morphology }, "render_pronunciation");
      for (const word of [spelled, finalized, rendered]) {
        if (selected(word) !== selected(base)) continue;
        compared++;
        expect(word.lexical, `seed ${seed}`).toEqual(base.lexical);
      }
      if (selected(spelled) === selected(base)) expect(spelled.pronunciation, `seed ${seed}`).toBe(base.pronunciation);
      expect(finalized.pronunciation, `seed ${seed}`).toBe(base.pronunciation);
      if (selected(rendered) === selected(base) && !gapSpelled(base) && !gapSpelled(rendered))
        expect(rendered.written, `seed ${seed}`).toEqual(base.written);
    }
    expect(compared).toBeGreaterThan(SEEDS.length);
  });

  it("draws a bare word's gap spelling choice from its spell stream", () => {
    // A weighted pair of overrides for a common monosyllable, so the choice draws.
    const generator = createGenerator({
      ...englishConfig,
      gapSpellings: ["braw", "brau"].map(replacement => ({
        name: replacement, phonemes: ["b", "r", "ɔ"], replacement, weight: 50, targetLayer: "grapheme" as const,
      })),
    });
    const options = { mode: "text", morphology: false, syllableCount: 1, trace: true } as const;
    let gapWords = 0, flipped = 0;
    for (let seed = 0; seed < 20_000 && gapWords < 12; seed++) {
      const run = () => generator.generateWord({ ...options, seed });
      const base = run();
      if (!gapSpelled(base)) continue;
      gapWords++;
      expect(withShiftedStage("render_pronunciation", run).written, `seed ${seed}`).toEqual(base.written);
      const spelled = withShiftedStage("spell", run);
      if (selected(spelled) === selected(base) && spelled.written.clean !== base.written.clean) flipped++;
    }
    expect(gapWords).toBe(12);
    expect(flipped).toBeGreaterThan(0);
  });

  it.each([false, true])("finishing stages use the selected attempt's streams (morphology %s)", morphology => {
    let laterAttempts = 0;
    for (const seed of SEEDS) {
      const base = generate({ seed, morphology });
      const chosen = selected(base);
      if (chosen > 0) laterAttempts++;
      const elsewhere = (attempt: number) => attempt !== chosen;
      expect(untraced(generate({ seed, morphology }, "finalize_root_spelling", elsewhere)), `seed ${seed}`)
        .toEqual(untraced(base));
      if (base.trace!.morphology && base.trace!.morphology.template !== "bare") {
        expect(untraced(generate({ seed, morphology }, "render_pronunciation", elsewhere)), `seed ${seed}`)
          .toEqual(untraced(base));
      }
    }
    expect(laterAttempts).toBeGreaterThan(30);
  });
});
