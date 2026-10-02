import type { Snapshot } from "../model.js";
import { digest, validateSnapshot } from "../snapshot.js";
import { SCORING_VERSION, type ReferenceModel } from "./model.js";
import { scoreWord, type WordScores } from "./score.js";

export interface MachineRow { sample_id: string; draw_index: number; spelling: string; word_digest: string; scores: WordScores }
export interface MachineArtifact {
  version: typeof SCORING_VERSION;
  model_digest: string;
  implementation_digest: string;
  comparator_digest: string;
  studies: { study_id: string; snapshot_digest: string; source_digest: string; rows: MachineRow[] }[];
  digest: string;
}
export function scoreSnapshots(snapshots: Snapshot[], model: ReferenceModel, implementationDigest: string, comparatorDigest: string): MachineArtifact {
  if (model.version !== SCORING_VERSION) throw new Error("Unsupported reference model version.");
  if (!snapshots.length || new Set(snapshots.map(snapshot => snapshot.manifest.study_id)).size !== snapshots.length) throw new Error("Provide distinct frozen studies.");
  const studies = snapshots.map(snapshot => {
    validateSnapshot(snapshot);
    return { study_id: snapshot.manifest.study_id, snapshot_digest: snapshot.digest, source_digest: snapshot.manifest.generator.source_digest,
      rows: snapshot.samples.map(sample => ({ sample_id: sample.id, draw_index: sample.draw_index, spelling: sample.spelling,
        word_digest: digest(sample.word), scores: scoreWord(sample.word, sample.spelling, model) })) };
  });
  const artifact: Omit<MachineArtifact, "digest"> = { version: SCORING_VERSION, model_digest: digest(model), implementation_digest: implementationDigest, comparator_digest: comparatorDigest, studies };
  return { ...artifact, digest: digest(artifact) };
}
export function validateMachineArtifact(artifact: MachineArtifact): void {
  const { digest: hash, ...content } = artifact;
  if (artifact.version !== SCORING_VERSION || digest(content) !== hash) throw new Error("Invalid machine-score artifact or version.");
  if (new Set(artifact.studies.map(study => study.study_id)).size !== artifact.studies.length) throw new Error("Duplicate machine study.");
}
