import type { LanguageConfig } from "../../../../src/config/language.js";
import type { Word } from "../../../../src/types.js";
import type { Draw } from "../../model.js";

export interface ObservationGroup {
  counts: Record<string, number>;
  selections: Record<string, number>;
  boundaries: Record<string, number>;
  cleanupChanges: Record<string, number>;
}

export interface AnalysisResult {
  directory: string;
  id: string;
  manifestFileDigest: string;
  manifestDigest: string;
  sourceDigest: string;
  protocolDigest: string;
  evaluatorDigest?: string;
  referenceDigest?: string;
  supportsSourceDerivedIm: boolean;
  total: ObservationGroup;
  profiles: Record<string, ObservationGroup>;
  strata: Record<string, ObservationGroup>;
  replicates: Record<string, ObservationGroup>;
  witnesses: Record<string, Draw[]>;
}

export function digest(value: unknown): string;
export function empty(): ObservationGroup;
export function supportsDefaultIm(config: LanguageConfig): boolean;
export function observe(group: ObservationGroup, word: Word, config: LanguageConfig): string[];
export function analyzeRun(directory: string): Promise<AnalysisResult>;
