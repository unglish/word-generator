import type { LanguageConfig } from "../config/language.js";
import type { BaseSpellingTraceV5 } from "./base-spelling.js";
import { createSplitLedgerReplayer } from "./spelling-split-replay.js";
import { createSplitFormationScheduleVerifier } from "./spelling-split-schedule.js";
import { createSharedWriterScheduleVerifier } from "./spelling-construction-schedule.js";
import { verifyCompletionSchedule } from "./spelling-completion-schedule.js";
import { verifyNormalizationChecks } from "./spelling-normalization-checks.js";

/** Compose recorded semantics and required writer schedules; root evidence does not certify morphology. */
export function createSplitWriterEvidenceVerifier(configuration: LanguageConfig) {
  const config = structuredClone(configuration);
  if (!config.splitVowels || config.sharedSpellings === undefined) throw new Error("V5 evidence requires split and shared configuration");
  const replay = createSplitLedgerReplayer(config, config.splitVowels.supports, config.splitVowels.routes);
  const formation = createSplitFormationScheduleVerifier(config);
  const shared = createSharedWriterScheduleVerifier(config, config.sharedSpellings);
  return (trace: BaseSpellingTraceV5) => {
    const operations = replay(trace);
    verifyNormalizationChecks(trace);
    const sharedSchedule = shared(trace);
    const formationSchedule = formation(trace);
    const completionSchedule = verifyCompletionSchedule(trace);
    return { ...operations, writerSchedule: "verified" as const, sharedSchedule, formationSchedule, completionSchedule };
  };
}
