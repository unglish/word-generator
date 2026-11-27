import { renderPhone } from "../../../src/utils/pronunciation.js";
import type { Packet } from "./packet.js";
import { compareSelectedAttempts, type StageDifference } from "./trace-difference.js";

type Comparison = Packet["summaries"]["pooled"]["overall"];
type Side = Comparison["before"];
type Example = Packet["examples"][number];
type Word = Example["before"];
type SeedRanges = Packet["summaries"]["seedDeltaRanges"]["overall"];
type Changes = Packet["summaries"]["pooled"]["outputChanges"]["overall"];
type ChangedDraw = Packet["changedDraws"][number];
type Mover = Packet["movers"][number]["positive"][number];
type Capture = Packet["captures"]["before"];

const number = (value: number | null) => value === null ? "—" : value.toFixed(3);
const points = (value: number | null) => value === null ? "—" : number(100 * value);
const code = (value: string) => `\`${value.replaceAll("|", "\\|").replaceAll("`", "'")}\``;

function side(side: Side): string[] {
  const { median, below10 } = side.bigram;
  return [String(side.draws), String(side.ineligible), String(side.noPeers), number(side.unigram.median), number(median),
    `${below10.numerator}/${below10.denominator}`];
}

function delta(comparison: Comparison): string[] {
  return [number(comparison.delta.unigramMedian), number(comparison.delta.bigramMedian), points(comparison.delta.bigramBelow10Rate)];
}

function summaryRow(label: string, comparison: Comparison): string {
  return `| ${[label, ...side(comparison.before), ...side(comparison.after), ...delta(comparison)].join(" | ")} |`;
}

function summaryTable() {
  return [
    "| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
}

function range(ranges: SeedRanges, key: keyof SeedRanges, format = number) {
  const values = ranges[key];
  return values ? `${format(values.min)} to ${format(values.max)} (${values.seeds} seeds)` : "—";
}

function rangeRow(label: string, ranges: SeedRanges): string {
  return `| ${[label, range(ranges, "unigramMedian"), range(ranges, "bigramMedian"), range(ranges, "bigramBelow10Rate", points)].join(" | ")} |`;
}

function form(word: Word): string {
  return `${code(word.spelling)} /${word.ipa.replaceAll("|", "\\|")}/`;
}

function word(word: Word): string {
  const { surface } = word;
  const annotated = `${form(word)} · root ${word.rootSyllables}`;
  if (surface.kind === "ineligible") return `${annotated} · ${surface.reason}`;
  const { fold, peers, unigram, bigram } = surface.score;
  return `${annotated} · ${code(surface.phones.join(" "))} · fold ${fold} / ${peers} peers · U ${number(unigram.raw)} / ${number(unigram.percentile)} · B ${number(bigram.raw)} / ${number(bigram.percentile)}`;
}

function exampleRow(example: Example): string {
  return `| ${example.seed}/${example.drawIndex} | ${word(example.before)} | ${word(example.after)} | ${number(example.bigramDelta)} |`;
}

export function formatStageDifference(change: StageDifference | null): string {
  if (!change) return "Recorded syllable snapshots match";
  if (change.kind === "stage") return `Stage ${change.stageIndex + 1} · before ${change.before ?? "absent"}, after ${change.after ?? "absent"}`;
  const location = `${code(change.stage)} (${change.snapshot}), syllable ${change.syllableIndex + 1}`;
  if (change.kind === "syllable") return `${location} present only ${change.after ? "after" : "before"}`;
  if (change.kind === "stress") return `${location}, stress before ${change.before ?? "unset"}, after ${change.after ?? "unset"}`;
  const phone = (p: typeof change.before) => p ? code(renderPhone(p.sound, p.aspirated)) + (p.reduced ? " (reduced)" : "") : "absent";
  const slot = `${location}, ${change.slot} ${change.phoneIndex + 1}`;
  const left = phone(change.before), right = phone(change.after);
  if (left === right && change.before && change.after) {
    const encoding = (p: NonNullable<typeof change.before>) => `${code(p.sound)} with aspiration flag ${p.aspirated}`;
    return `${slot} ${left} in both snapshots (before ${encoding(change.before)}, after ${encoding(change.after)})`;
  }
  return `${slot} before ${left}, after ${right}`;
}

function traceSummary(changes: ChangedDraw["trace"], before: Word, after: Word): string {
  // Earlier v2 packets recorded the indices on the draw arms.
  const attempts = changes.attemptComparison ?? compareSelectedAttempts(before.selectedAttempt, after.selectedAttempt);
  const label = attempts.scope === "different-winners"
    ? `Different winning attempts (before ${attempts.before}, after ${attempts.after})`
    : `Same winning attempt ${attempts.before}`;
  const parts = [label, formatStageDifference(changes.firstStageDifference)];
  const sections = changes.differingSectionsWithMatchingSnapshots;
  if (sections) {
    if (!sections.length) return `${label} · selected word traces match`;
    parts.push(`differences in ${sections.map(({ section, firstIndex }) => firstIndex === null ? section : `${section} (entry ${firstIndex + 1})`).join(", ")}`);
  }
  if (changes.retries) parts.push("retry count changed");
  if (changes.structuralBoundary) parts.push("boundary events differ");
  if (changes.vowelHiatus) parts.push("hiatus events differ");
  if (changes.aspiration) parts.push("aspiration events differ");
  return parts.join(" · ");
}

function outputRow(label: string, c: Changes): string {
  return `| ${label} | ${c.draws} | ${c.any} | ${c.spelling} | ${c.ipa} | ${c.projectedPhones}/${c.comparableProjections} | ${c.projectionEligibility} | ${c.rootSyllables} | ${c.selectedAttempt} |`;
}

function outputSection(packet: Packet): string[] {
  const { summaries, changedDraws, generatedPairs } = packet;
  const { overall, byBeforeRoot } = summaries.pooled.outputChanges;
  const lines = [
    "## Changes across paired draws", "",
    "Spelling and emitted IPA are compared on every draw. Projected-phone differences use pairs with complete projections in both arms. A draw can change several fields.",
    "", "| Sample | Draws | Any field | Spelling | IPA | Projected phones / comparable | Projection eligibility | Root syllables | Winning attempt |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    outputRow("All", overall), ...byBeforeRoot.map(c => outputRow(`Before root ${c.bucket}`, c)),
    ...summaries.bySeed.map(seed => outputRow(`Seed ${seed.seed}`, seed.outputChanges.overall)), "",
  ];
  if (changedDraws.length) {
    const sample = changedDraws.slice(0, 20);
    const fieldNames = { spelling: "spelling", ipa: "IPA", projectedPhones: "projected phones",
      rootSyllables: "root syllables", selectedAttempt: "winning attempt", projectionEligibility: "projection eligibility" };
    lines.push(`Showing ${sample.length} of ${changedDraws.length} changed draws in protocol order. The JSON lists every changed draw and its row index.`,
      "Each trace describes its winning root attempt. When different attempts win, the observations below compare two independently generated attempts. Explaining why selection changed requires evidence from matching attempts.",
      "", "| Seed/draw | Before | After | Changed fields | Winning attempts and trace observations |", "| --- | --- | --- | --- | --- |");
    for (const change of sample) {
      const { before, after } = packet.draws[change.rowIndex];
      lines.push(`| ${change.seed}/${change.drawIndex} | ${form(before)} | ${form(after)} | ${change.fields.map(field => fieldNames[field]).join(", ")} | ${traceSummary(change.trace, before, after)} |`);
    }
    lines.push("");
  }
  lines.push("## Adjacent sound pairs in generated output", "",
    `Across ${generatedPairs.comparableDraws} mutually projectable draws (${generatedPairs.excludedDraws} excluded), before had ${generatedPairs.tokens.before} adjacent tokens and after had ${generatedPairs.tokens.after}. Repeats count at every position within a word.`, "");
  const ordered = generatedPairs.pairs.filter(p => p.delta !== 0).sort((a, b) => b.delta - a.delta);
  if (!ordered.length) return [...lines, "All pair counts match.", ""];
  // Stable sorting keeps the canonical pair order for equal-sized changes.
  const decreases = ordered.filter(p => p.delta < 0).sort((a, b) => a.delta - b.delta);
  lines.push(`${ordered.length} distinct pairs changed count. Up to five gains and five losses are shown. The JSON includes every observed pair and its share of each arm’s tokens.`,
    "", "| Sound pair | Before tokens | After tokens | Change in tokens | Before per 10,000 tokens | After per 10,000 tokens |", "| --- | ---: | ---: | ---: | ---: | ---: |");
  const perTenThousand = (share: number | null) => share === null ? "—" : (share * 10_000).toFixed(3);
  for (const p of [...ordered.filter(p => p.delta > 0).slice(0, 5), ...decreases.slice(0, 5)]) {
    lines.push(`| ${code(p.symbols.join(" "))} | ${p.before} | ${p.after} | ${p.delta > 0 ? "+" : ""}${p.delta} | ${perTenThousand(p.beforeShare)} | ${perTenThousand(p.afterShare)} |`);
  }
  return [...lines, ""];
}

function rawBigramDelta(before: Word["surface"], after: Word["surface"]): string {
  if (before.kind !== "scored" || after.kind !== "scored") return "—";
  const delta = (after.score.bigram.raw - before.score.bigram.raw).toFixed(6);
  return before.score.fold === after.score.fold ? delta : `${delta} (different held-out models, folds ${before.score.fold} → ${after.score.fold})`;
}

function moverRow(mover: Mover): string {
  const { before, after } = mover;
  const pair = mover.changedReferencePairs[0];
  const contribution = (c: typeof pair.before) => c ? `${code(c.symbols.join(" "))} ${c.count}/${c.reaching}` : "absent";
  const reference = pair ? `Position ${pair.position + 1} · ${contribution(pair.before)} → ${contribution(pair.after)}` : "Same positional pairs";
  const rawDelta = rawBigramDelta(before.surface, after.surface);
  return `| ${mover.seed}/${mover.drawIndex} | ${word(before)} | ${word(after)} | ${number(mover.bigramDelta)} | ${rawDelta} | ${reference} | ${traceSummary(mover.changes, before, after)} |`;
}

function environment(env: Capture["environment"]): string {
  return `${env.node} · ${env.platform}/${env.arch} · lock ${code(env.packageLockDigest)}`;
}

function provenance(name: string, capture: Capture): string {
  const engine = capture.rootEngine.status === "declared" ? `${code(capture.rootEngine.label)} (declared)` : "unverified";
  const generation = environment(capture.environment), evaluation = environment(capture.evaluationEnvironment);
  return `| ${name} ${code(capture.id)} | ${code(capture.generatorCommit)} (${capture.dirty ? "dirty" : "clean"}) · source ${code(capture.generatorSourceSha256)} | ${code(capture.effectiveConfigSha256)} | ${engine} | ${generation}${generation === evaluation ? "" : ` · evaluation ${evaluation}`} |`;
}

export function renderPacket(packet: Packet): string {
  const { schedule, summaries, captures, metric } = packet;
  const lines = [
    "# Surface positional UCI comparison",
    "",
    `Paired ${schedule.profile} / ${schedule.cohort} with ${schedule.drawsPerSeed} draws per seed.`,
    "",
    "| Capture | Generator revision and source | Config | Root engine | Capture environment |", "| --- | --- | --- | --- | --- |",
    provenance("Before", captures.before), provenance("After", captures.after), "",
    ...(environment(captures.before.environment) === environment(captures.after.environment) ? [] :
      ["Generation environments differ. Word differences can reflect the runtime or dependencies as well as the generator change.", ""]),
    `Capture protocol ${code(captures.before.protocolSha256)}, reference ${code(metric.reference.descriptorSha256)}, scorer ${code(metric.scorer.sourceSha256)}.`,
    "",
    "U and B are unigram and bigram. The medians use matched percentiles. The tail counts percentiles strictly below 10 among draws with peers. Deltas are after minus before. Root strata use the realized lexical-root length in each arm.",
    "",
    ...outputSection(packet),
    "## Pooled",
    "",
    ...summaryTable(),
    summaryRow("All", summaries.pooled.overall),
    ...summaries.pooled.rootBuckets.map(bucket => summaryRow(bucket.bucket, bucket)),
    "",
    "## Paired seeds",
    "",
    "| Seed | Median paired difference U | Matched U pairs | Median paired difference B | Matched B pairs |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...summaries.bySeed.map(({ seed, paired }) => `| ${seed} | ${number(paired.unigram.deltaMedian)} | ${paired.unigram.pairs} | ${number(paired.bigram.deltaMedian)} | ${paired.bigram.pairs} |`),
    "",
    "| Root syllables | Range Δ U median | Range Δ B median | Range Δ B tail (pp) |",
    "| --- | ---: | ---: | ---: |",
    rangeRow("All", summaries.seedDeltaRanges.overall),
    ...summaries.seedDeltaRanges.rootBuckets.map(bucket => rangeRow(bucket.bucket, bucket)),
    "",
  ];
  for (const seed of summaries.bySeed) {
    lines.push(`### Seed ${seed.seed}`, "", ...summaryTable(), summaryRow("All", seed.overall),
      ...seed.rootBuckets.map(bucket => summaryRow(bucket.bucket, bucket)), "");
  }
  lines.push("## First four paired draws per seed", "",
    "Each pronunciation shows spelling, IPA, realized root syllables, projected phones, fold, peer count, and each metric’s raw score / percentile.",
    "",
    "| Seed/draw | Before | After | Δ B percentile |",
    "| --- | --- | --- | ---: |",
    ...packet.examples.map(example => exampleRow(example)), "",
    "## Biggest percentile changes", "",
    "Ranked by the unrounded pair-percentile change within each before-root group. A change in phone count or fold can change the comparison group. The first changed pair shows counts at that absolute position in the same full dictionary for both words. JSON includes every changed position, the original held-out contributions and both selected attempts’ traces. Use a random-draw replay to establish what caused an event to change.",
    "");
  for (const bucket of packet.movers) {
    lines.push(`### Before root ${bucket.beforeRootBucket}`, "");
    for (const [name, movers] of [["Higher pair percentile", bucket.positive], ["Lower pair percentile", bucket.negative]] as const) {
      lines.push(`#### ${name}`, "");
      if (movers.length) {
        lines.push("| Seed/draw | Before | After | Δ B percentile | Δ B raw | First changed pair in full dictionary | Winning attempts and trace observations |",
          "| --- | --- | --- | ---: | ---: | --- | --- |", ...movers.map(moverRow), "");
      } else {
        lines.push("No movers in this direction.", "");
      }
    }
  }
  return lines.join("\n");
}
