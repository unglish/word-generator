/**
 * Checks that each generation stage draws from its own stream (#556).
 *
 * The stage stream probe shifts one stage's draws (`(r + 0.5) % 1`). Shifting a
 * stage must change some words, which shows the stage reads its own stream;
 * shifting it must leave what it cannot affect alone, which shows no other
 * stage reads it.
 */
import { describe, expect, it, vi } from "vitest";
import { generateWord } from "../index.js";
import type { Word, WordGenerationOptions } from "../types.js";
import { withShiftedStage, type Stage } from "../test-support/stage-stream-probe.js";

vi.mock("./stage-streams.js", async (original) =>
  (await import("../test-support/stage-stream-probe.js")).probeStageStreams(await original()));

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
  // Each stage, with the morphology setting under which it draws.
  const stages: ReadonlyArray<[Stage, boolean]> = [
    ["set_constraints", false],
    ["plan_morphology", true],
    ["plan_shape", false],
    ["select_segments", false],
    ["assign_stress", false],
    ["post_stress_repair", false],
    ["preview_morphology", true],
    ["spell", false],
    ["finalize_root_spelling", false],
    ["render_pronunciation", false],
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
