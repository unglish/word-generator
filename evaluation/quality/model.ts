import type { Word, WordGenerationOptions } from "../../src/types.js";
import type { Json, SourceFile } from "./serialization.js";
import type { MetricDefinition, MetricId } from "./metrics.js";
import type { DistributionScore } from "./distribution.js";

export type Cohort = "development" | "validation";
export interface Protocol {
  schemaVersion: 1;
  id: string;
  wordsPerReplicate: number;
  reviewDrawsPerReplicate: number;
  profiles: Array<{
    id: string;
    options: Pick<WordGenerationOptions, "mode" | "morphology" | "syllableCount">;
    seeds: Record<Cohort, number[]>;
  }>;
}
export interface MetricCount { hits: number; eligible: number; rate: number | null }
export type MetricCounts = Record<MetricId, MetricCount>;
export interface StratumSummary { id: string; words: number; metrics: MetricCounts }
export interface ReplicateSummary {
  seed: number;
  words: number;
  metrics: MetricCounts;
}
export interface ProfileSummary {
  id: string;
  words: number;
  uniqueSpellings: number;
  meanLetters: number;
  syllableCounts: Record<string, number>;
  phonemeLengths: Record<string, number>;
  morphologyCounts: Record<string, number>;
  distributions: { phonemes: DistributionScore; trigrams: DistributionScore };
  metrics: MetricCounts;
  replicates: ReplicateSummary[];
  strata: StratumSummary[];
}
export interface RunSummary {
  schemaVersion: 1;
  id: string;
  cohort: Cohort;
  protocolDigest: string;
  evaluatorDigest: string;
  referenceDigest: string;
  definitions: readonly MetricDefinition[];
  profiles: ProfileSummary[];
}
export interface Artifact { file: string; sha256: string; bytes: number }
export interface RunEnvironment { node: string; platform: string; arch: string; packageLockDigest: string }
export interface Manifest {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  cohort: Cohort;
  protocol: Protocol;
  protocolDigest: string;
  evaluatorDigest: string;
  referenceDigest: string;
  generator: {
    commit: string;
    dirty: boolean;
    sourceDigest: string;
    effectiveConfig: Json;
    patch: string;
  };
  /** Environment that generated the archived words, retained during rescoring. */
  environment: RunEnvironment;
  /** Evaluation runtime; historical captures evaluated in their generation environment. */
  evaluationEnvironment?: RunEnvironment;
  rescore?: { parentId: string; parentManifestDigest: string; parentEvaluatorDigest: string };
  artifacts: Artifact[];
}
export interface SourceArchive {
  generator: SourceFile[];
  evaluator: SourceFile[];
  references: SourceFile[];
  packageFiles: SourceFile[];
  /** Rescoring retains the original generator dependencies separately from these. */
  evaluatorPackageFiles?: SourceFile[];
}
export interface ArchivedProvenance { manifest: Manifest; digest: string; sources: SourceArchive }
export interface Draw {
  profile: string;
  seed: number;
  drawIndex: number;
  word: Word;
}
