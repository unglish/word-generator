import { digest } from "../snapshot.js";
import { bytesHash } from "../auditory/audio.js";
import type { ComparisonItem, Condition } from "../comparison/comparison-model.js";
import { assessDrawAgreement } from "./agreement.js";
import type { DrawAgreement } from "./agreement.js";
import { validateReadAloudPlan } from "./allocation.js";
import { verifyAdjudication } from "./coding.js";
import { validateReadAloudRoster, verifyReading } from "./readings.js";
import type { FrozenAdjudication, ReadAloudDraw, ReadAloudExport, Reading, ReadingSyllable, ReadingTranscription } from "./model.js";

export interface ReadingMaterial {
  reading_id: string;
  wav: Uint8Array;
  coding?: { coders: [Uint8Array, Uint8Array]; decision: Uint8Array };
}
export interface AlternativeEvidence { sha256: string; bytes: Uint8Array }
export const AGREEMENT_METRICS = ["intended_phones", "intended_phones_and_stress", "accepted_phones", "accepted_phones_and_stress"] as const;
export type AgreementMetric = typeof AGREEMENT_METRICS[number];
export type TrialStatus = "missing" | "skipped" | "recording-failed" | "awaiting-adjudication" | "uncertain" | "untranscribable" | "transcribed";
export interface ReportTrial {
  session_id: string;
  participant_slot: string;
  position: number;
  item_id: string;
  condition: Condition;
  stratum: string;
  spelling: string;
  reading_id: string | null;
  status: TrialStatus;
  unknown_stress: boolean;
  coder_disagreement: boolean | null;
  coder_phone_agreement: boolean | null;
  coder_phones_and_stress_agreement: boolean | null;
}
export interface SourceDrawScores {
  condition: Condition;
  stratum: string;
  sample_id: string;
  draw_index: number;
  item_id: string;
  spelling: string;
  source_available: boolean;
  accepted_alternatives: number;
  scores: { reading_id: string; participant_slot: string; agreement: DrawAgreement }[];
}
export interface MetricSummary {
  mean: number | null;
  pool_draws: number;
  eligible_source_draws: number;
  covered_draws: number;
  pool_spellings: number;
  covered_spellings: number;
  source_draw_score_cells: number;
  matched_source_draw_score_cells: number;
}
export interface AgreementGroup {
  condition: Condition;
  stratum: string | null;
  pool_items: number;
  statuses: Record<TrialStatus, number>;
  planned_trials: number;
  unknown_stress_decisions: number;
  coder_disagreements: number;
  coders_both_definite: number;
  coder_phone_disagreements: number;
  coders_both_definite_known_stress: number;
  coder_combined_disagreements: number;
  adjudicated_recordings: number;
  metrics: Record<AgreementMetric, MetricSummary>;
}
export interface ReadAloudReport {
  version: "read-aloud-report-v1";
  comparison_digest: string;
  plan_digest: string;
  roster_digest: string;
  alternative_evidence_sha256: string[];
  purpose: ReadAloudExport["comparison"]["registration"]["purpose"];
  distinct_roster_person_keys: number;
  verified_distinct_people: null;
  groups: AgreementGroup[];
  contrasts: { stratum: string | null; differences: Record<AgreementMetric, number | null> }[];
  trials: ReportTrial[];
  source_draws: SourceDrawScores[];
  duplicate_audio_groups: { audio_sha256: string; reading_ids: string[] }[];
  intervals: null;
  interpretation: string;
}

function trialKey(sessionId: string, position: number): string { return `${sessionId}/${position}`; }
function sourceKey(draw: ReadAloudDraw): string { return `${draw.condition}/${draw.sample_id}`; }
function canonicalSyllables(syllables: ReadingSyllable[]): ReadingSyllable[] {
  return syllables.map(syllable => ({ phones: [...syllable.phones], stress: syllable.stress }));
}
function codingSignature(observed: ReadingTranscription): string {
  if (observed.status === "transcribed") return digest({ status: observed.status, syllables: canonicalSyllables(observed.syllables) });
  if (observed.status === "uncertain") return digest({ status: observed.status, alternatives: observed.alternatives.map(value => digest(canonicalSyllables(value))).sort() });
  return digest({ status: observed.status });
}
function coderAgreement(decision: FrozenAdjudication | undefined): {
  coder_disagreement: boolean | null; coder_phone_agreement: boolean | null; coder_phones_and_stress_agreement: boolean | null;
} {
  if (!decision) return { coder_disagreement: null, coder_phone_agreement: null, coder_phones_and_stress_agreement: null };
  const first = decision.coders[0].record.transcription, second = decision.coders[1].record.transcription;
  const result = { coder_disagreement: codingSignature(first) !== codingSignature(second),
    coder_phone_agreement: null as boolean | null, coder_phones_and_stress_agreement: null as boolean | null };
  if (first.status !== "transcribed" || second.status !== "transcribed") return result;
  result.coder_phone_agreement = digest(first.syllables.flatMap(syllable => syllable.phones)) === digest(second.syllables.flatMap(syllable => syllable.phones));
  if (![...first.syllables, ...second.syllables].some(syllable => syllable.stress === "unknown")) {
    result.coder_phones_and_stress_agreement = digest(canonicalSyllables(first.syllables)) === digest(canonicalSyllables(second.syllables));
  }
  return result;
}
function requireUnique<T>(values: T[], key: (value: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const id = key(value);
    if (result.has(id)) throw new Error(`Duplicate ${label}; no replacement or latest-answer rule.`);
    result.set(id, value);
  }
  return result;
}

function authenticateExport(data: ReadAloudExport, materials: ReadingMaterial[]): {
  readings: Map<string, Reading>; decisions: Map<string, FrozenAdjudication>;
} {
  if (data.version !== "read-aloud-export-v1") throw new Error("Unknown read-aloud export version.");
  validateReadAloudPlan(data.comparison, data.plan);
  validateReadAloudRoster(data.comparison, data.roster);
  const readings = requireUnique(data.readings, reading => trialKey(reading.session_id, reading.position), "reading trial");
  requireUnique(data.readings, reading => reading.id, "reading receipt");
  const decisions = requireUnique(data.adjudications, decision => decision.reading_id, "adjudication");
  const files = requireUnique(materials, material => material.reading_id, "recording material");
  const recorded = new Set(data.readings.filter(reading => reading.outcome.status === "recorded").map(reading => reading.id));
  if (files.size !== recorded.size || [...files.keys()].some(id => !recorded.has(id))) {
    throw new Error("Every recorded reading requires exactly one original material set; no unused files.");
  }
  for (const reading of data.readings) {
    const material = files.get(reading.id), decision = decisions.get(reading.id);
    verifyReading(data.comparison, data.plan, data.roster, reading, material?.wav);
    if (decision) {
      if (!material?.coding) throw new Error("Original coder and adjudicator bytes are required, not just attestations.");
      verifyAdjudication(data.comparison, reading, data.roster, decision, material.coding.coders, material.coding.decision);
    } else if (material?.coding) throw new Error("Coding materials require their frozen adjudication; incomplete coding remains outside scored exports.");
  }
  if ([...decisions.keys()].some(id => !recorded.has(id))) throw new Error("Adjudication refers to a missing or unrecorded reading.");
  return { readings, decisions };
}

function trialStatus(reading: Reading | undefined, decision: FrozenAdjudication | undefined): TrialStatus {
  if (!reading) return "missing";
  if (reading.outcome.status !== "recorded") return reading.outcome.status;
  if (!decision) return "awaiting-adjudication";
  return decision.decision.transcription.status;
}

function summarizeMetric(draws: SourceDrawScores[], metric: AgreementMetric): MetricSummary {
  let sumDrawMeans = 0, coveredDraws = 0, availableCells = 0, matchedCells = 0;
  const coveredSpellings = new Set<string>();
  for (const draw of draws) {
    const available = draw.scores.map(score => score.agreement[metric]).filter((value): value is boolean => value !== null);
    if (!available.length) continue;
    const matches = available.filter(Boolean).length;
    sumDrawMeans += matches / available.length;
    coveredDraws++; availableCells += available.length; matchedCells += matches;
    coveredSpellings.add(draw.spelling);
  }
  return { mean: coveredDraws ? sumDrawMeans / coveredDraws : null,
    pool_draws: draws.length, eligible_source_draws: draws.filter(draw => draw.source_available).length,
    covered_draws: coveredDraws, pool_spellings: new Set(draws.map(draw => draw.spelling)).size,
    covered_spellings: coveredSpellings.size, source_draw_score_cells: availableCells,
    matched_source_draw_score_cells: matchedCells };
}

function summarizeGroup(condition: Condition, stratum: string | null, data: ReadAloudExport,
  trials: ReportTrial[], allDraws: SourceDrawScores[]): AgreementGroup {
  const selectedTrials = trials.filter(trial => trial.condition === condition && (stratum === null || trial.stratum === stratum));
  const draws = allDraws.filter(draw => draw.condition === condition && (stratum === null || draw.stratum === stratum));
  const statuses: Record<TrialStatus, number> = { missing: 0, skipped: 0, "recording-failed": 0,
    "awaiting-adjudication": 0, uncertain: 0, untranscribable: 0, transcribed: 0 };
  for (const trial of selectedTrials) statuses[trial.status]++;
  return { condition, stratum,
    pool_items: data.comparison.partition.items.filter(item => item.condition === condition && (stratum === null || item.stratum === stratum)).length,
    statuses, planned_trials: selectedTrials.length, unknown_stress_decisions: selectedTrials.filter(trial => trial.unknown_stress).length,
    coder_disagreements: selectedTrials.filter(trial => trial.coder_disagreement === true).length,
    coders_both_definite: selectedTrials.filter(trial => trial.coder_phone_agreement !== null).length,
    coder_phone_disagreements: selectedTrials.filter(trial => trial.coder_phone_agreement === false).length,
    coders_both_definite_known_stress: selectedTrials.filter(trial => trial.coder_phones_and_stress_agreement !== null).length,
    coder_combined_disagreements: selectedTrials.filter(trial => trial.coder_phones_and_stress_agreement === false).length,
    adjudicated_recordings: selectedTrials.filter(trial => trial.coder_disagreement !== null).length,
    metrics: { intended_phones: summarizeMetric(draws, "intended_phones"), intended_phones_and_stress: summarizeMetric(draws, "intended_phones_and_stress"),
      accepted_phones: summarizeMetric(draws, "accepted_phones"), accepted_phones_and_stress: summarizeMetric(draws, "accepted_phones_and_stress") } };
}

export function reportReadAloud(data: ReadAloudExport, materials: ReadingMaterial[], evidence: AlternativeEvidence[] = []): ReadAloudReport {
  const { readings, decisions } = authenticateExport(data, materials), comparison = data.comparison;
  const expectedEvidence = new Set(comparison.registration.alternatives.map(alternative => alternative.evidence_sha256));
  const evidenceFiles = requireUnique(evidence, file => file.sha256, "alternative evidence file");
  if (evidenceFiles.size !== expectedEvidence.size || [...evidenceFiles].some(([hash, file]) => !expectedEvidence.has(hash) || bytesHash(file.bytes) !== hash)) {
    throw new Error("Every prospectively accepted alternative requires its exact retained original rationale evidence bytes; no unused evidence files.");
  }
  const items = new Map(comparison.partition.items.map(item => [item.id, item]));
  const trialRows: ReportTrial[] = [];
  for (const session of data.plan.sessions) {
    session.item_ids.forEach((id, position) => {
      const item = items.get(id)!, reading = readings.get(trialKey(session.id, position)), decision = reading && decisions.get(reading.id);
      const observed = decision?.decision.transcription;
      trialRows.push({ session_id: session.id, participant_slot: session.participant_slot, position,
        item_id: id, condition: item.condition, stratum: item.stratum, spelling: item.spelling,
        reading_id: reading?.id ?? null, status: trialStatus(reading, decision),
        unknown_stress: observed?.status === "transcribed" && observed.syllables.some(syllable => syllable.stress === "unknown"),
        ...coderAgreement(decision) });
    });
  }
  const sourceItems = new Map<string, ComparisonItem>(comparison.partition.items.flatMap(item => item.draws.map(draw => [`${draw.condition}/${draw.sample_id}`, item] as const)));
  const trialsByItem = new Map<string, ReportTrial[]>();
  for (const trial of trialRows) {
    if (!trialsByItem.has(trial.item_id)) trialsByItem.set(trial.item_id, []);
    trialsByItem.get(trial.item_id)!.push(trial);
  }
  const draws = comparison.draws.map(draw => {
    const item = sourceItems.get(sourceKey(draw))!;
    const scores = (trialsByItem.get(item.id) ?? []).flatMap(trial => {
      if (!trial.reading_id) return [];
      const observed = decisions.get(trial.reading_id)?.decision.transcription ?? null;
      return [{ reading_id: trial.reading_id, participant_slot: trial.participant_slot,
        agreement: assessDrawAgreement(comparison.registration.pronunciation, draw, observed) }];
    });
    return { condition: draw.condition, stratum: draw.stratum, sample_id: draw.sample_id, draw_index: draw.draw_index,
      item_id: item.id, spelling: item.spelling, source_available: draw.intended.status === "resolved",
      accepted_alternatives: draw.alternatives.length, scores };
  });
  const audioGroups = new Map<string, string[]>();
  for (const reading of data.readings) {
    if (reading.outcome.status !== "recorded") continue;
    const hash = reading.outcome.audio.sha256;
    if (!audioGroups.has(hash)) audioGroups.set(hash, []);
    audioGroups.get(hash)!.push(reading.id);
  }
  const strata = [null, ...comparison.registration.strata.map(stratum => stratum.id)];
  const groups = (["baseline", "candidate"] as const).flatMap(condition =>
    strata.map(stratum => summarizeGroup(condition, stratum, data, trialRows, draws)));
  const contrasts = strata.map(stratum => {
    const baseline = groups.find(group => group.condition === "baseline" && group.stratum === stratum)!;
    const candidate = groups.find(group => group.condition === "candidate" && group.stratum === stratum)!;
    const differences = Object.fromEntries(AGREEMENT_METRICS.map(metric => {
      const first = baseline.metrics[metric].mean, second = candidate.metrics[metric].mean;
      return [metric, first === null || second === null ? null : second - first];
    })) as Record<AgreementMetric, number | null>;
    return { stratum, differences };
  });
  return { version: "read-aloud-report-v1", comparison_digest: comparison.digest, plan_digest: data.plan.digest, roster_digest: data.roster.digest,
    alternative_evidence_sha256: [...expectedEvidence].sort(),
    purpose: comparison.registration.purpose, distinct_roster_person_keys: new Set(data.roster.entries.map(entry => entry.person_key)).size,
    verified_distinct_people: null, groups, contrasts,
    trials: trialRows, source_draws: draws,
    duplicate_audio_groups: [...audioGroups].filter(([, ids]) => ids.length > 1).map(([audio_sha256, reading_ids]) => ({ audio_sha256, reading_ids })),
    intervals: null, interpretation: "Descriptive conditional agreement only. Average available readers per original source draw, then average covered source draws. Repeated draw score cells are dependent, not extra participants. Combined phones/stress includes syllable boundaries. Candidate-minus-baseline differences compare registered condition distributions; same seeds do not isolate a spelling-only cause. Roster/first-attempt/blindness attestations are not independent proof. No calibrated population interval or human-quality verdict." };
}
