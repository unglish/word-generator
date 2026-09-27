import type { LanguageConfig } from "../config/language.js";
import type { GraphemeReading } from "../types.js";
import { createGraphemeResolver, NoLegalGraphemeError, type GraphemeSlot } from "./grapheme-selection.js";
import { createDoublingModel, type DoublingSlot } from "./spelling-doubling.js";
import { logSum, type SequenceEdge, type SequenceModel } from "./spelling-sequence-probability.js";

type FollowingReading = Extract<GraphemeReading, { kind: "following-letter" }>;
export interface FollowingTarget { phoneme: string; form: string }
export interface SequenceSlot {
  grapheme: GraphemeSlot;
  doubling: Omit<DoublingSlot, "form" | "nucleusForm">;
}
export interface SpellingSequenceState {
  previousForm?: string;
  doublingCount: number;
  currentNucleus: string;
  previousNucleus: string;
  pending: readonly FollowingReading[];
}
export interface SpellingSequenceChoice {
  inventoryIndex: number;
  selected: string;
  realized: string;
  doublingIncrement: number;
}

function acceptsLetter(reading: FollowingReading, letter: string): boolean {
  return (reading.require === undefined || reading.require.some(item => item.toLowerCase() === letter)) &&
    !reading.forbid?.some(item => item.toLowerCase() === letter);
}

/** Initial realized forms only; cell edits and final morphology are not simulated. */
export function createGraphemeSequenceModel(
  config: LanguageConfig, slots: readonly SequenceSlot[], targets: readonly FollowingTarget[],
): SequenceModel<SpellingSequenceState, SpellingSequenceChoice> {
  const resolve = createGraphemeResolver(config);
  const doubling = createDoublingModel(config.doubling);
  const targetKeys = new Set(targets.map(target => JSON.stringify([target.phoneme, target.form])));
  const initial: SpellingSequenceState = { doublingCount: 0, currentNucleus: "", previousNucleus: "", pending: [] };

  function edges(index: number, state: SpellingSequenceState): SequenceEdge<SpellingSequenceState, SpellingSequenceChoice>[] {
    const slot = slots[index];
    let weights: ReturnType<typeof resolve>["weights"];
    try {
      weights = resolve(slot.grapheme, { previousForm: state.previousForm, doublingCount: state.doublingCount }).weights;
    } catch (error) {
      if (error instanceof NoLegalGraphemeError) return [];
      throw error;
    }
    const totalLogWeight = logSum(weights.map(([, weight]) => Math.log(weight)));
    const result: SequenceEdge<SpellingSequenceState, SpellingSequenceChoice>[] = [];
    for (const [grapheme, weight] of weights) {
      const nucleus = slot.grapheme.position === "nucleus" ? grapheme.form : state.currentNucleus;
      const decision = doubling.describe({ ...slot.doubling, form: grapheme.form,
        nucleusForm: slot.grapheme.position === "onset" ? state.previousNucleus : nucleus }, state.doublingCount);
      const realizations = decision.kind === "fixed"
        ? [{ form: decision.form, probability: 1, increment: decision.countIncrement }]
        : [{ form: decision.form, probability: 1 - decision.probability / 100, increment: 0 },
          { form: decision.doubledForm, probability: decision.probability / 100, increment: 1 }];
      for (const realization of realizations) {
        if (realization.probability === 0) continue;
        const first = realization.form.slice(0, 1).toLowerCase();
        if (first && !state.pending.every(reading => acceptsLetter(reading, first))) continue;
        const pending = first ? [] : [...state.pending];
        if (targetKeys.has(JSON.stringify([grapheme.phoneme, realization.form]))) {
          const reading = doubling.readingFor(grapheme, realization.form);
          if (reading?.kind !== "following-letter") throw new Error("Target lacks a following-letter reading");
          pending.push(reading);
        }
        const nextSlot = slots[index + 1];
        const crossesBoundary = !nextSlot || nextSlot.grapheme.syllableIndex !== slot.grapheme.syllableIndex;
        result.push({
          logProbability: Math.log(weight) - totalLogWeight + Math.log(realization.probability),
          choice: { inventoryIndex: config.graphemes.indexOf(grapheme), selected: grapheme.form,
            realized: realization.form, doublingIncrement: realization.increment },
          next: { previousForm: realization.form, doublingCount: state.doublingCount + realization.increment,
            currentNucleus: crossesBoundary ? "" : nucleus,
            previousNucleus: crossesBoundary ? nucleus : state.previousNucleus, pending },
        });
      }
    }
    return result;
  }
  return { length: slots.length, initial, key: state => JSON.stringify(state), edges,
    accepts: state => state.pending.every(reading => acceptsLetter(reading, "")) };
}
