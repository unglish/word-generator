import { mkdir, open, readFile, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Draw, Manifest, Protocol } from "../model.js";
import { collectFiles, readCapturedDraws, readRun, validateProtocol } from "../capture.js";
import { digest } from "../serialization.js";
import { STAGE_STREAM_SCHEME } from "../../../src/core/stage-streams.js";
import { ROOT, loadSurfaceScorer, projectSurface, sha256 } from "./reference.js";
import { SCORER_VERSION, type Score, type UciScorer } from "./scorer.js";
import { median } from "./statistics.js";
import { renderPacket } from "./report.js";
import { changedFields, countOutputChanges, generatedPairCounts } from "./output-changes.js";
import { traceChanges } from "./trace-difference.js";

const PROFILE = "lexicon-default";
const COHORT = "development";
const TAIL_THRESHOLD = 10;
const EXAMPLES_PER_SEED = 4;
const MOVERS_PER_DIRECTION = 5;
const ARMS = ["before", "after"] as const;
type Arm = typeof ARMS[number];
type ByArm<T> = Record<Arm, T>;
type Word = Draw["word"];
type Trace = NonNullable<Word["trace"]>;
type Stream = NonNullable<Trace["random"]>;

type PhoneEvidence =
  | { kind: "scored"; phones: string[]; score: Score }
  | Extract<ReturnType<typeof projectSurface>, { kind: "ineligible" }>;
interface DrawArm {
  spelling: string;
  ipa: string;
  rootSyllables: number;
  selectedAttempt: number;
  surface: PhoneEvidence;
}

interface PairKey {
  profile: string;
  seed: number;
  drawIndex: number;
  random: Stream;
}

export interface DrawEvidence extends PairKey, ByArm<DrawArm> {}

interface Example extends DrawEvidence {
  bigramDelta: number | null;
}

interface ChangedDraw extends PairKey {
  rowIndex: number;
  fields: ReturnType<typeof changedFields>;
  trace: ReturnType<typeof traceChanges>;
}

function changedReferencePairs(scorer: UciScorer, left: string[], right: string[]) {
  const a = scorer.referenceBigrams(left), b = scorer.referenceBigrams(right);
  return Array.from({ length: Math.max(a.length, b.length) }, (_, position) => ({
    position, before: a[position] ?? null, after: b[position] ?? null,
  })).filter(({ before, after }) => before?.symbols[0] !== after?.symbols[0] || before?.symbols[1] !== after?.symbols[1]);
}

interface Mover extends Omit<Example, "bigramDelta"> {
  bigramDelta: number;
  changes: ReturnType<typeof traceChanges>;
  contributions: ByArm<ReturnType<UciScorer["explain"]>>;
  changedReferencePairs: ReturnType<typeof changedReferencePairs>;
  traces: ByArm<Trace>;
}

function traceFor(draw: Draw) {
  const trace = draw.word.trace;
  if (!trace?.random || trace.random.scheme !== STAGE_STREAM_SCHEME || !/^[0-9a-f]{16}$/.test(trace.random.key)) {
    throw new Error(`Missing compatible trace.random scheme/key for ${draw.profile}/${draw.seed}/${draw.drawIndex}.`);
  }
  if (!trace.selection || !Number.isInteger(trace.selection.selectedAttempt) || !Array.isArray(trace.structural) || !Array.isArray(trace.stages)) {
    throw new Error("Capture is missing root selection, stage snapshots or structural trace data.");
  }
  return { trace, random: trace.random };
}

export function pairIdentity(before: Draw, after: Draw) {
  const { profile, seed, drawIndex } = before;
  if (after.profile !== profile || after.seed !== seed || after.drawIndex !== drawIndex) throw new Error("Capture draw identities disagree.");
  const left = traceFor(before);
  const right = traceFor(after);
  if (left.random.key !== right.random.key) {
    throw new Error(`Paired RNG stream keys disagree for ${profile}/${seed}/${drawIndex}.`);
  }
  return {
    key: { profile, seed, drawIndex, random: left.random } satisfies PairKey,
    traces: { before: left.trace, after: right.trace },
  };
}

function observe(word: Word, scorer: UciScorer): DrawArm {
  const root = word.lexical?.root;
  if (!Array.isArray(root) || !root.length) throw new Error("Capture is missing the realized lexical root.");
  if (typeof word.pronunciation !== "string") throw new Error("Capture is missing the emitted IPA transcription.");
  const projection = projectSurface(word);
  return {
    spelling: word.written.clean, ipa: word.pronunciation, rootSyllables: root.length,
    selectedAttempt: word.trace!.selection!.selectedAttempt,
    surface: projection.kind === "projected"
      ? { kind: "scored", phones: projection.phones, score: scorer.score(projection.phones) }
      : projection,
  };
}

type Bucket = "1" | "2" | "3" | "4" | "5+";
const BUCKETS: readonly Bucket[] = ["1", "2", "3", "4", "5+"];

function inBucket(bucket: Bucket, length: number): boolean {
  return bucket === "5+" ? length >= 5 : length === Number(bucket);
}

export function rootBucket(length: number): Bucket {
  const bucket = BUCKETS.find(bucket => inBucket(bucket, length));
  if (!bucket) throw new Error(`Invalid realized root length: ${length}.`);
  return bucket;
}

interface Rankable {
  seed: number;
  drawIndex: number;
  bigramDelta: number;
}

export function insertMover<T extends Rankable>(list: T[], candidate: Rankable, direction: 1 | -1, seeds: readonly number[], detail: () => T): void {
  if (direction * candidate.bigramDelta <= 0) return;
  const rank = (row: T) => direction * (row.bigramDelta - candidate.bigramDelta) ||
    seeds.indexOf(candidate.seed) - seeds.indexOf(row.seed) || candidate.drawIndex - row.drawIndex;
  const index = list.findIndex(row => rank(row) < 0);
  if (index === -1 && list.length >= MOVERS_PER_DIRECTION) return;
  list.splice(index === -1 ? list.length : index, 0, detail());
  if (list.length > MOVERS_PER_DIRECTION) list.pop();
}

function subtract(before: number | null, after: number | null): number | null {
  return before === null || after === null ? null : after - before;
}

function percentile(surface: PhoneEvidence, kind: "unigram" | "bigram"): number | null {
  return surface.kind === "scored" ? surface.score[kind].percentile : null;
}

function tail(values: number[]) {
  const numerator = values.filter(value => value < TAIL_THRESHOLD).length;
  return { numerator, denominator: values.length, rate: values.length ? numerator / values.length : null };
}

function armSummary(rows: readonly DrawEvidence[], arm: Arm) {
  const unigram: number[] = [];
  const bigram: number[] = [];
  let ineligible = 0;
  let noPeers = 0;
  for (const row of rows) {
    const { surface } = row[arm];
    if (surface.kind === "ineligible") {
      ineligible++;
      continue;
    }
    if (surface.score.peers === 0) noPeers++;
    if (surface.score.unigram.percentile !== null) unigram.push(surface.score.unigram.percentile);
    if (surface.score.bigram.percentile !== null) bigram.push(surface.score.bigram.percentile);
  }
  return {
    draws: rows.length, ineligible, noPeers,
    unigram: { median: median(unigram), below10: tail(unigram) },
    bigram: { median: median(bigram), below10: tail(bigram) },
  };
}

function comparison(rows: readonly DrawEvidence[], includes: (root: number) => boolean) {
  const arm = (side: Arm) => armSummary(rows.filter(row => includes(row[side].rootSyllables)), side);
  const before = arm("before");
  const after = arm("after");
  const delta = {
    unigramMedian: subtract(before.unigram.median, after.unigram.median),
    bigramMedian: subtract(before.bigram.median, after.bigram.median),
    unigramBelow10Rate: subtract(before.unigram.below10.rate, after.unigram.below10.rate),
    bigramBelow10Rate: subtract(before.bigram.below10.rate, after.bigram.below10.rate),
  };
  return { before, after, delta };
}

function paired(rows: readonly DrawEvidence[]) {
  const changes = (kind: "unigram" | "bigram") => rows.flatMap(row => {
    const value = subtract(percentile(row.before.surface, kind), percentile(row.after.surface, kind));
    return value === null ? [] : [value];
  });
  const unigram = changes("unigram");
  const bigram = changes("bigram");
  return { unigram: { pairs: unigram.length, deltaMedian: median(unigram) }, bigram: { pairs: bigram.length, deltaMedian: median(bigram) } };
}

export function summarizeDraws(rows: readonly DrawEvidence[], seeds: readonly number[]) {
  const lengths = [...new Set(rows.flatMap(row => ARMS.map(arm => row[arm].rootSyllables)))].sort((a, b) => a - b);
  function summarize(sample: readonly DrawEvidence[]) {
    return {
      overall: comparison(sample, () => true),
      exactRoot: lengths.map(rootSyllables => ({ rootSyllables, ...comparison(sample, length => rootSyllables === length) })),
      rootBuckets: BUCKETS.map(bucket => ({ bucket, ...comparison(sample, length => inBucket(bucket, length)) })),
      paired: paired(sample),
      outputChanges: {
        overall: countOutputChanges(sample),
        byBeforeRoot: BUCKETS.map(bucket => ({ bucket, ...countOutputChanges(sample.filter(row => inBucket(bucket, row.before.rootSyllables))) })),
      },
    };
  }
  const pooled = summarize(rows);
  const bySeed = seeds.map(seed => ({ seed, ...summarize(rows.filter(row => row.seed === seed)) }));
  function ranges(deltas: readonly (typeof pooled.overall.delta)[]) {
    const range = (metric: keyof typeof pooled.overall.delta) => {
      const values = deltas.flatMap(delta => delta[metric] ?? []);
      return values.length ? { min: Math.min(...values), max: Math.max(...values), seeds: values.length } : null;
    };
    return {
      unigramMedian: range("unigramMedian"), bigramMedian: range("bigramMedian"),
      unigramBelow10Rate: range("unigramBelow10Rate"), bigramBelow10Rate: range("bigramBelow10Rate"),
    };
  }
  return {
    pooled, bySeed,
    seedDeltaRanges: {
      overall: ranges(bySeed.map(seed => seed.overall.delta)),
      exactRoot: lengths.map((rootSyllables, index) => ({ rootSyllables, ...ranges(bySeed.map(seed => seed.exactRoot[index].delta)) })),
      rootBuckets: BUCKETS.map((bucket, index) => ({ bucket, ...ranges(bySeed.map(seed => seed.rootBuckets[index].delta)) })),
    },
  };
}

function captureProvenance(manifest: Manifest, engineLabel: string | undefined) {
  return {
    id: manifest.id, manifestSha256: digest(manifest),
    generatorCommit: manifest.generator.commit, dirty: manifest.generator.dirty,
    generatorSourceSha256: manifest.generator.sourceDigest,
    effectiveConfig: manifest.generator.effectiveConfig,
    effectiveConfigSha256: digest(manifest.generator.effectiveConfig),
    protocolSha256: manifest.protocolDigest,
    evaluatorSha256: manifest.evaluatorDigest, captureReferenceSha256: manifest.referenceDigest,
    environment: manifest.environment, evaluationEnvironment: manifest.evaluationEnvironment ?? manifest.environment,
    rootEngine: engineLabel === undefined ? { status: "unverified" as const } : { status: "declared" as const, label: engineLabel },
  };
}

export function validateCaptureSchedule(before: Manifest, after: Manifest, committed: Protocol) {
  if (before.cohort !== COHORT || after.cohort !== COHORT || before.protocolDigest !== after.protocolDigest) {
    throw new Error("UCI captures must share one development protocol.");
  }
  const expected = committed.profiles.find(profile => profile.id === PROFILE);
  if (!expected) throw new Error(`Committed protocol has no ${PROFILE} profile.`);
  for (const { protocol, artifacts, cohort } of [before, after]) {
    validateProtocol(protocol);
    const profile = protocol.profiles.find(entry => entry.id === PROFILE);
    if (protocol.wordsPerReplicate !== committed.wordsPerReplicate || !profile || digest(profile.options) !== digest(expected.options) ||
        digest(profile.seeds[COHORT]) !== digest(expected.seeds[COHORT])) {
      throw new Error(`Capture does not match the committed ${PROFILE}/${COHORT} schedule.`);
    }
    const pinned = new Set(artifacts.map(item => item.file));
    for (const entry of protocol.profiles) {
      for (const seed of entry.seeds[cohort]) {
        if (!pinned.has(`words/${entry.id}-${seed}.jsonl.gz`)) throw new Error(`Capture is missing the ${entry.id}/${seed} word shard.`);
      }
    }
  }
  return { profile: PROFILE, cohort: COHORT, seeds: expected.seeds[COHORT], drawsPerSeed: committed.wordsPerReplicate };
}

async function scorerSourcePin() {
  const local = await collectFiles(ROOT, "evaluation/quality/uci");
  const dependencies = [
    "evaluation/quality/capture.ts", "evaluation/quality/git.ts", "evaluation/quality/serialization.ts",
    "evaluation/corpus/cmu.ts", "evaluation/review/wordlikeness/model.ts",
    "src/phonology/identity.ts", "src/core/stage-streams.ts", "src/utils/pronunciation.ts",
  ];
  const sources = [...local.map(({ path, content }) => ({ path, sha256: sha256(content) })),
    ...await Promise.all(dependencies.map(async path => ({ path, sha256: sha256(await readFile(join(ROOT, path))) })))];
  return { version: SCORER_VERSION, sourceSha256: digest(sources), sources, node: process.version };
}

interface PacketInput {
  before: string;
  after: string;
  engineLabels?: Partial<ByArm<string>>;
  /** Programmatic callers can pin a smaller capture protocol. The CLI always uses the repository protocol. */
  protocolPath?: string;
}

export async function buildPacket(input: PacketInput) {
  const [before, after, source, committed, scorerPin] = await Promise.all([
    readRun(input.before, true), readRun(input.after, true), loadSurfaceScorer(),
    readFile(input.protocolPath ?? join(ROOT, "evaluation/quality/protocol.json"), "utf8"), scorerSourcePin(),
  ]);
  const defaultProtocol: Protocol = JSON.parse(committed);
  const schedule = validateCaptureSchedule(before.manifest, after.manifest, defaultProtocol);
  const rows: DrawEvidence[] = [];
  const examples: Example[] = [];
  const changedDraws: ChangedDraw[] = [];
  const buckets = new Map(BUCKETS.map(bucket => [bucket, { positive: [] as Mover[], negative: [] as Mover[] }]));
  for (const seed of schedule.seeds) {
    const iterateBefore = readCapturedDraws(input.before, before.manifest, PROFILE, seed);
    const iterateAfter = readCapturedDraws(input.after, after.manifest, PROFILE, seed);
    try {
      for (let index = 0; index <= schedule.drawsPerSeed; index++) {
        const [left, right] = await Promise.all([iterateBefore.next(), iterateAfter.next()]);
        if (left.done || right.done) {
          if (!left.done || !right.done || index !== schedule.drawsPerSeed) throw new Error(`Unequal capture size for seed ${seed}.`);
          break;
        }
        const { key, traces } = pairIdentity(left.value, right.value);
        const a = observe(left.value.word, source.scorer);
        const b = observe(right.value.word, source.scorer);
        const row = { ...key, before: a, after: b };
        rows.push(row);
        const fields = changedFields(row);
        const changes = fields.length ? traceChanges(traces.before, traces.after) : null;
        if (changes) changedDraws.push({ ...key, rowIndex: rows.length - 1, fields, trace: changes });
        const bigramDelta = subtract(percentile(row.before.surface, "bigram"), percentile(row.after.surface, "bigram"));
        const example = { ...row, bigramDelta };
        if (index < EXAMPLES_PER_SEED) examples.push(example);
        if (changes && bigramDelta !== null && bigramDelta !== 0 && a.surface.kind === "scored" && b.surface.kind === "scored") {
          const leftPhones = a.surface.phones;
          const rightPhones = b.surface.phones;
          const direction = bigramDelta > 0 ? 1 : -1;
          const bucket = buckets.get(rootBucket(a.rootSyllables));
          if (!bucket) throw new Error("Invalid root bucket.");
          insertMover(direction === 1 ? bucket.positive : bucket.negative, { ...key, bigramDelta }, direction, schedule.seeds, () => ({
            ...example, bigramDelta, changes, traces,
            contributions: { before: source.scorer.explain(leftPhones), after: source.scorer.explain(rightPhones) },
            changedReferencePairs: changedReferencePairs(source.scorer, leftPhones, rightPhones),
          }));
        }
      }
    } finally {
      await Promise.all([iterateBefore.return(undefined), iterateAfter.return(undefined)]);
    }
  }
  return {
    schemaVersion: 2, schedule, committedProtocolSha256: sha256(committed),
    captureProtocol: before.manifest.protocol,
    captures: {
      before: captureProvenance(before.manifest, input.engineLabels?.before),
      after: captureProvenance(after.manifest, input.engineLabels?.after),
    },
    metric: { tailStrictlyBelow: TAIL_THRESHOLD, scorer: scorerPin, reference: {
      descriptor: source.descriptor, descriptorSha256: source.descriptorSha256,
    } },
    summaries: summarizeDraws(rows, schedule.seeds),
    examples, changedDraws, generatedPairs: generatedPairCounts(rows),
    movers: [...buckets].map(([beforeRootBucket, directions]) => ({ beforeRootBucket, ...directions })),
    draws: rows,
  };
}

export type Packet = Awaited<ReturnType<typeof buildPacket>>;

export async function writePacket(input: PacketInput, out: string) {
  await mkdir(out);
  const created: string[] = [];
  try {
    const packet = await buildPacket(input);
    const files = [["packet.json", `${JSON.stringify(packet)}\n`], ["packet.md", renderPacket(packet)]];
    for (const [name, contents] of files) {
      const path = join(out, name);
      const file = await open(path, "wx");
      created.push(path);
      try {
        await file.writeFile(contents);
      } finally {
        await file.close();
      }
    }
    return { ...packet.summaries.pooled.overall, outputChanges: packet.summaries.pooled.outputChanges.overall };
  } catch (error) {
    await Promise.all(created.map(path => unlink(path)));
    await rmdir(out);
    throw error;
  }
}
