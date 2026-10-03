import type { LexicalStyleConfig } from "../../core/lexical-style-model.js";
import { englishOriginSources } from "./origin-assessment.js";

/** Registered heuristic pilot; lexical examples do not estimate these strengths. */
export const englishStyleExperiment: LexicalStyleConfig = {
  id: "q20-plain-marked-v1",
  policy: {
    version: "soft-orthographic-style-v1", strength: 1,
    styles: [
      { style: { id: "plain", label: "Plain", interpretation: "Soft preference away from the declared marked spellings; no etymological assignment." }, prior: 1 },
      { style: { id: "marked", label: "Marked", interpretation: "Soft affinity for the declared ph/ps/mn spellings; no etymological assignment." }, prior: 1 },
    ],
    sources: structuredClone(englishOriginSources.filter(source => ["ahd-philosophy", "ahd-nephew", "ahd-psalm", "ahd-mnemonic"].includes(source.id))),
    features: [
      { phoneme: "f", form: "ph", source_ids: ["ahd-philosophy", "ahd-nephew"], strength_basis: "experimental-heuristic", associations: [{ style_id: "plain", multiplier: .5 }, { style_id: "marked", multiplier: 1.5 }] },
      { phoneme: "s", form: "ps", source_ids: ["ahd-psalm"], strength_basis: "experimental-heuristic", associations: [{ style_id: "plain", multiplier: .5 }, { style_id: "marked", multiplier: 1.5 }] },
      { phoneme: "n", form: "mn", source_ids: ["ahd-mnemonic"], strength_basis: "experimental-heuristic", associations: [{ style_id: "plain", multiplier: .5 }, { style_id: "marked", multiplier: 1.5 }] },
    ],
  },
};
