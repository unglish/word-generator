import type { ResponseRow, ReviewExport } from "../model.js";
import { validateExport } from "../report.js";
import { digest } from "../snapshot.js";
import { sha256 } from "./model.js";
import { METRICS, type Metric, type WordScores } from "./score.js";
import { validateMachineArtifact, type MachineArtifact, type MachineRow } from "./artifact.js";

/** Ties receive their average one-based rank. */
export function ranks(values: number[]): number[] {
  if (values.some(value => !Number.isFinite(value))) throw new Error("Ranks require finite values.");
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result: number[] = [];
  for (let i = 0; i < order.length;) {
    let end = i + 1;
    while (end < order.length && order[end].value === order[i].value) end++;
    for (let j = i; j < end; j++) result[order[j].index] = (i + 1 + end) / 2;
    i = end;
  }
  return result;
}
export function spearman(x: number[], y: number[]): number | null {
  if (x.length !== y.length) throw new Error("Unpaired observations.");
  if (x.length < 2) return null;
  const a = ranks(x);
  const b = ranks(y);
  const mean = (x.length + 1) / 2;
  let covariance = 0, varianceA = 0, varianceB = 0;
  a.forEach((value, i) => {
    covariance += (value - mean) * (b[i] - mean);
    varianceA += (value - mean) ** 2;
    varianceB += (b[i] - mean) ** 2;
  });
  return varianceA && varianceB ? covariance / Math.sqrt(varianceA * varianceB) : null;
}
/** Stable spelling groups, independent of response order, sample ID, and rubric. */
export function splitSpelling(spelling: string, seed = "issue-301-v1"): "train" | "heldout" {
  return parseInt(sha256(`${seed}\0${spelling.toLowerCase()}`).slice(0, 8), 16) / 0x100000000 < 0.2 ? "heldout" : "train";
}
interface JoinedRating extends ResponseRow { study_id: string; rubric_version: string; spelling: string }
interface Item {
  spelling: string;
  metrics: WordScores["metrics"];
  machine_rows: { study_id: string; row: MachineRow }[];
  ratings: JoinedRating[];
  trace_evidence: { sample_id: string; word_digest: string; trace: ReviewExport["samples"][number]["word"]["trace"] }[];
  split: "train" | "heldout";
}
function mean(values: (number | null)[]): number | null {
  if (!values.length) return null;
  let total = 0;
  for (const value of values) {
    if (value === null) return null;
    total += value;
  }
  return total / values.length;
}
function summarize(item: Item, rubric: string | null, familiarity: boolean | null) {
  const responses = item.ratings.filter(rating => rubric === null || rating.rubric_version === rubric);
  const rated = responses.filter(rating => rating.status === "rated" && (familiarity === null || rating.familiar === familiarity));
  const distribution = [1, 2, 3, 4, 5].map(value => rated.filter(rating => rating.rating === value).length);
  return { spelling: item.spelling, mean: mean(rated.map(rating => rating.rating!)), denominator: rated.length, distribution,
    skips: responses.filter(rating => rating.status === "skipped").length,
    familiar: responses.filter(rating => rating.status === "rated" && rating.familiar).length,
    metrics: item.metrics };
}
type Summary = ReturnType<typeof summarize>;
function compareLengthBaseline(items: Summary[], metric: Metric, length: "written_length" | "syllable_count") {
  const paired = items.filter(item => item.metrics[length] !== null);
  const means = paired.map(item => item.mean!);
  const candidate = spearman(paired.map(item => item.metrics[metric]!), means);
  const shorter = spearman(paired.map(item => -item.metrics[length]!), means);
  return { n: paired.length, candidate_rho: candidate, shorter_is_better_rho: shorter,
    delta_rho: candidate === null || shorter === null ? null : candidate - shorter };
}
function comparison(items: Summary[], metric: Metric) {
  const eligible = items.filter(item => item.mean !== null && item.metrics[metric] !== null);
  const values = eligible.map(item => item.metrics[metric]!);
  const means = eligible.map(item => item.mean!);
  const rho = spearman(values, means);
  const machineRanks = ranks(values), humanRanks = ranks(means);
  const disagreement = eligible.map((item, index) => ({ spelling: item.spelling, machine_score: values[index], human_mean: item.mean,
    denominator: item.denominator, distribution: item.distribution, machine_rank: machineRanks[index], human_rank: humanRanks[index],
    rank_gap: (machineRanks[index] - humanRanks[index]) / Math.max(1, eligible.length - 1) }));
  const sorted = [...disagreement].sort((a, b) => a.machine_score - b.machine_score || a.spelling.localeCompare(b.spelling, "en"));
  return { metric, n: eligible.length, rated_spellings: items.filter(item => item.mean !== null).length, rho,
    missing_spellings: items.filter(item => item.mean !== null && item.metrics[metric] === null).map(item => item.spelling),
    length_baselines_on_same_words: {
      written_length: compareLengthBaseline(eligible, metric, "written_length"),
      syllable_count: compareLengthBaseline(eligible, metric, "syllable_count"),
    },
    low: sorted.slice(0, 3), high: sorted.slice(-3).reverse(),
    disagreements: disagreement.sort((a, b) => Math.abs(b.rank_gap) - Math.abs(a.rank_gap) || a.spelling.localeCompare(b.spelling, "en")).slice(0, 5) };
}
function joinExports(exports: ReviewExport[], artifact: MachineArtifact): Item[] {
  validateMachineArtifact(artifact);
  if (!exports.length || new Set(exports.map(data => data.study.id)).size !== exports.length) throw new Error("Provide one export per study; repeated exports would double-count judgments.");
  const items = new Map<string, Item>();
  let frozenWords: string | undefined;
  for (const data of exports) {
    validateExport(data);
    const words = digest(data.samples.map(sample => sample.word));
    if (frozenWords !== undefined && words !== frozenWords) throw new Error("Rubric studies must reuse the same frozen words in draw order.");
    frozenWords = words;
    const machine = artifact.studies.find(study => study.study_id === data.study.id);
    if (!machine || machine.snapshot_digest !== data.study.digest || machine.source_digest !== data.study.manifest.generator.source_digest || machine.rows.length !== data.samples.length) throw new Error("Scores do not match exported snapshot provenance.");
    const sampleSpellings = new Map<string, string>();
    data.samples.forEach((sample, index) => {
      const row = machine.rows[index];
      if (row.sample_id !== sample.id || row.draw_index !== sample.draw_index || row.spelling !== sample.spelling || row.word_digest !== digest(sample.word)) throw new Error("Machine sample/spelling mismatch.");
      sampleSpellings.set(sample.id, sample.spelling);
      let item = items.get(sample.spelling);
      if (!item) {
        item = { spelling: sample.spelling, metrics: row.scores.metrics, machine_rows: [], ratings: [], trace_evidence: [], split: splitSpelling(sample.spelling) };
        items.set(sample.spelling, item);
      }
      item.machine_rows.push({ study_id: data.study.id, row });
      if (!item.trace_evidence.some(evidence => evidence.word_digest === row.word_digest)) item.trace_evidence.push({ sample_id: sample.id, word_digest: row.word_digest, trace: sample.word.trace });
    });
    for (const response of data.responses) {
      const spelling = sampleSpellings.get(response.sample_id)!;
      items.get(spelling)!.ratings.push({ ...response,
        study_id: data.study.id, rubric_version: data.study.manifest.rubric.version, spelling });
    }
  }
  // Duplicate spellings may have different saved pronunciations. Average distinct draws,
  // not rubric copies; missing sound scores propagate instead of biasing the average.
  for (const item of items.values()) {
    const draws = [...new Map(item.machine_rows.map(({ row }) => [row.draw_index, row])).values()];
    item.metrics = Object.fromEntries(METRICS.map(metric =>
      [metric, mean(draws.map(row => row.scores.metrics[metric]))],
    )) as WordScores["metrics"];
  }
  return [...items.values()].sort((a, b) => a.spelling.localeCompare(b.spelling, "en"));
}
function familiarityLabel(familiarity: boolean | null): string {
  if (familiarity === null) return "all";
  return familiarity ? "familiar" : "unfamiliar";
}
export function evaluate(exports: ReviewExport[], artifact: MachineArtifact) {
  const items = joinExports(exports, artifact);
  const rubrics = [...new Set(exports.map(data => data.study.manifest.rubric.version))].sort();
  const views = [null, ...rubrics].flatMap(rubric => [null, false, true].map(familiarity => {
    const summaries = items.map(item => summarize(item, rubric, familiarity));
    return { rubric: rubric ?? "combined", familiarity: familiarityLabel(familiarity),
      items: summaries, comparisons: METRICS.map(metric => comparison(summaries, metric)) };
  }));
  return { version: "wordlikeness-evaluation-v1", machine_digest: artifact.digest,
    sources: exports.map(data => ({ study_id: data.study.id, rubric: data.study.manifest.rubric, snapshot_digest: data.study.digest,
      exported_at: data.exported_at, export_digest: digest(data) })),
    analysis: "Descriptive only; no coefficients, smoothing choices, or combined model fitted to ratings. Both rubrics pooled in the primary view; separate views are sensitivity analyses, not causal wording comparisons.",
    limitation: "Anonymous batches and sessions are not verified independent people. Continued reviewing can repeat contributors. No population confidence intervals or reviewer-level generalization are justified. Comments remain qualitative, not training labels.",
    split: { seed: "issue-301-v1", rule: "SHA-256(seed + NUL + lowercase spelling), first 32 bits / 2^32 < 0.2 is heldout; reserved for future fitting, not used to claim validation here." },
    items, views };
}
const format = (value: number | null) => value === null ? "missing/undefined" : value.toFixed(3);
function traceEvidenceMarkdown(item: Item, evidence: Item["trace_evidence"][number]): string[] {
  const row = item.machine_rows.find(entry => entry.row.word_digest === evidence.word_digest)!.row;
  const trace = evidence.trace!;
  const changed = trace.stages.filter(stage => digest(stage.before) !== digest(stage.after));
  return ["", `Sample ${evidence.sample_id}; word digest ${evidence.word_digest}.`, "",
    "Saved observations below describe the generated form, not a causal explanation of a human rating. Morphology explanations remain hypotheses.", "", "```json", JSON.stringify({
      saved_syllables: row.scores.saved_syllables,
      rarest_constituents: [...row.scores.sound.components].sort((a, b) => (a.probability ?? 0) - (b.probability ?? 0)).slice(0, 3),
      lowest_probability_trigrams: [...row.scores.orthographic.components].sort((a, b) => a.probability! - b.probability!).slice(0, 3),
      diagnostics: row.scores.sound.diagnostics, stages: changed, graphemeSelections: trace.graphemeSelections,
      structural: trace.structural, repairs: trace.repairs, morphology: trace.morphology,
    }, null, 2), "```"];
}
export function evaluationMarkdown(report: ReturnType<typeof evaluate>): string {
  const lines = ["# Private exploratory wordlikeness report", "", report.analysis, "", report.limitation, "",
    "Paper-based scores use an adapted CMU grammar and maximum-likelihood constituent probabilities. Typicality normalization and character trigrams are unvalidated extensions. These results do not replicate the paper's spoken task or establish a percentage English, acceptance gate, or calibrated prediction.", "",
    "Skips are excluded from rating denominators. Mean ratings are compared once per distinct spelling, with average ranks for ties. Familiar-only and unfamiliar-only views retain their denominators. A null correlation means insufficient coverage or no rank variation.", "",
    "Length-baseline deltas compare each candidate with negative length (shorter-is-better) on exactly the same words; positive deltas are descriptive advantages, not proven predictive improvement. Raw length rows retain positive lengths. Sound scores for repeated spellings average their original draws, with any missing draw making that spelling's sound metric missing.", "",
    `Machine artifact: ${report.machine_digest}`, "", ...report.sources.map(source => `- ${source.study_id}: ${source.exported_at}, snapshot ${source.snapshot_digest}, export ${source.export_digest}`)];
  for (const view of report.views) {
    lines.push("", `## ${view.rubric} / ${view.familiarity}`, "", "| Metric | Covered / rated spellings | Spearman | Δ vs shorter spelling | Δ vs fewer syllables |", "|---|---:|---:|---:|---:|");
    for (const result of view.comparisons) lines.push(`| ${result.metric} | ${result.n}/${result.rated_spellings} | ${format(result.rho)} | ${format(result.length_baselines_on_same_words.written_length.delta_rho)} | ${format(result.length_baselines_on_same_words.syllable_count.delta_rho)} |`);
  }
  lines.push("", "## Representative scores and disagreements", "", "Selection is mechanical: three lowest/highest machine scores and five largest absolute percentile-rank gaps per candidate in the combined all-ratings view. Inspect all details in report.json; small denominators make rankings unstable. Positive gaps mean the machine ranks the spelling higher than the ratings do.");
  const selected = new Set<string>();
  for (const result of report.views[0].comparisons.filter(result => !["written_length", "syllable_count"].includes(result.metric))) {
    lines.push("", `### ${result.metric}`, "", `Low: ${result.low.map(item => item.spelling).join(", ")}. High: ${result.high.map(item => item.spelling).join(", ")}.`, "", "| Spelling | Machine | Human mean | n | Counts 1–5 | Rank gap |", "|---|---:|---:|---:|---|---:|");
    for (const item of [...result.low, ...result.high, ...result.disagreements]) selected.add(item.spelling);
    for (const item of result.disagreements) lines.push(`| ${item.spelling} | ${format(item.machine_score)} | ${format(item.human_mean)} | ${item.denominator} | ${item.distribution.join(" / ")} | ${format(item.rank_gap)} |`);
  }
  for (const spelling of selected) {
    const item = report.items.find(item => item.spelling === spelling)!;
    lines.push("", `### Trace evidence: ${spelling}`);
    for (const evidence of item.trace_evidence) lines.push(...traceEvidenceMarkdown(item, evidence));
  }
  lines.push("", "## Interpretation", "", "Use the signed correlations and paired length-baseline deltas above to compare candidates descriptively. Coverage differences, familiarity sensitivity, repeated contributors, and the small pilot prevent selecting a validated winner. Do not tune the generator or choose thresholds from this report. Any fitted follow-up must group all ratings and rubric copies of a spelling in the same deterministic split; its small held-out set supports tentative conclusions only.");
  return `${lines.join("\n")}\n`;
}
