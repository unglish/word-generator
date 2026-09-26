import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createGunzip } from "node:zlib";
import { readRun } from "../capture.js";
import { digest } from "../serialization.js";
import type { Draw } from "../model.js";
import type { SyllableSnapshot } from "../../../src/core/trace.js";

const definitions = {
  id: "nucleus-edges-v1",
  target: "ʊ",
  layers: {
    generatedBase: "generateSyllables.after: the selected attempt's initial base, including repairs inside that generation stage; not all rejected proposals",
    preparedBase: "generateWrittenForm.before: base after structure and stress repair, before spelling, reduction, and affix assembly",
    output: "word.syllables: final surface word after morphology and pronunciation",
  },
  measures: {
    final: "FOOT in any nucleus segment of the final syllable / all observed final syllables",
    closedFinal: "FOOT in a final nucleus followed by a nonempty coda / all closed final syllables",
    openFinalEdge: "Final nucleus segment is FOOT with an empty coda / all open final syllables",
    closedMonosyllable: "FOOT in a closed single-syllable base/word / all closed single-syllable bases/words",
  },
  strata: "Actual morphology template and final output syllable count; base layers retain base-word coordinates.",
  repairTransitions: "Counts of recorded edge-repair events by before->after nucleus; openCheckedAfterRepair counts repaired words whose prepared base ends in /ɪ ɛ æ ʌ ʊ/ with no coda.",
} as const;

interface Count { hits: number; eligible: number }
type Layer = keyof typeof definitions.layers;
type Measure = keyof typeof definitions.measures;
interface LayerCounts { observed: number; unavailable: number; measures: Record<Measure, Count> }
interface Counts {
  words: number;
  layers: Record<Layer, LayerCounts>;
  edgeRepairWords: number;
  stressRepickWords: number;
  unavailableRepairs: number;
  edgeRepairTransitions: Record<string, number>;
  openCheckedAfterRepair: Count;
}

function emptyCounts(): Counts {
  const layer = (): LayerCounts => ({ observed: 0, unavailable: 0, measures: {
    final: { hits: 0, eligible: 0 }, closedFinal: { hits: 0, eligible: 0 },
    openFinalEdge: { hits: 0, eligible: 0 }, closedMonosyllable: { hits: 0, eligible: 0 },
  } });
  return { words: 0, layers: { generatedBase: layer(), preparedBase: layer(), output: layer() }, edgeRepairWords: 0, stressRepickWords: 0, unavailableRepairs: 0, edgeRepairTransitions: {}, openCheckedAfterRepair: { hits: 0, eligible: 0 } };
}

function observeLayer(counts: LayerCounts, syllables: SyllableSnapshot[] | undefined): void {
  if (!syllables?.length) { counts.unavailable++; return; }
  counts.observed++;
  const last = syllables.at(-1)!;
  const foot = last.nucleus.includes(definitions.target);
  const closed = last.coda.length > 0;
  const observe = (measure: Measure, eligible: boolean, hit: boolean) => {
    if (!eligible) return;
    counts.measures[measure].eligible++;
    if (hit) counts.measures[measure].hits++;
  };
  observe("final", true, foot);
  observe("closedFinal", closed, foot);
  observe("openFinalEdge", !closed, last.nucleus.at(-1) === definitions.target);
  observe("closedMonosyllable", closed && syllables.length === 1, foot);
}

function observe(counts: Counts, draw: Draw): void {
  counts.words++;
  const trace = draw.word.trace;
  observeLayer(counts.layers.generatedBase, trace?.stages.find(stage => stage.name === "generateSyllables")?.after);
  const prepared = trace?.stages.find(stage => stage.name === "generateWrittenForm")?.before;
  observeLayer(counts.layers.preparedBase, prepared);
  observeLayer(counts.layers.output, draw.word.syllables.map(syllable => ({
    onset: syllable.onset.map(p => p.sound), nucleus: syllable.nucleus.map(p => p.sound), coda: syllable.coda.map(p => p.sound),
  })));
  if (!trace?.repairs) counts.unavailableRepairs++;
  else {
    const edgeRepairs = trace.repairs.filter(repair => repair.rule === "repairNucleusWordPositions");
    if (edgeRepairs.length) {
      counts.edgeRepairWords++;
      for (const repair of edgeRepairs) {
        const key = `${repair.before}->${repair.after}`;
        counts.edgeRepairTransitions[key] = (counts.edgeRepairTransitions[key] ?? 0) + 1;
      }
      const last = prepared?.at(-1);
      if (last) {
        counts.openCheckedAfterRepair.eligible++;
        if (last.coda.length === 0 && ["ɪ", "ɛ", "æ", "ʌ", "ʊ"].includes(last.nucleus.at(-1)!)) counts.openCheckedAfterRepair.hits++;
      }
    }
    if (trace.repairs.some(repair => repair.rule === "repairStressedNuclei")) counts.stressRepickWords++;
  }
}

function witnessKinds(draw: Draw): string[] {
  const trace = draw.word.trace;
  const syllables = trace?.stages.find(stage => stage.name === "generateWrittenForm")?.before;
  const last = syllables?.at(-1);
  const kinds: string[] = [];
  if (last?.nucleus.includes("ʊ")) {
    kinds.push(last.coda.length ? "closedFinalBaseFoot" : "openFinalBaseFoot");
    if (syllables!.length === 1 && last.coda.length) kinds.push("closedMonosyllableFoot");
  }
  if (trace?.repairs.some(repair => repair.rule === "repairNucleusWordPositions")) {
    kinds.push("edgeRepair");
    if (last?.coda.length === 0 && ["ɪ", "ɛ", "æ", "ʌ", "ʊ"].includes(last.nucleus.at(-1)!)) kinds.push("openCheckedAfterEdgeRepair");
  }
  if (trace?.repairs.some(repair => repair.rule === "repairStressedNuclei" && repair.after === "ʊ")) kinds.push("stressRepickFoot");
  const output = draw.word.syllables.at(-1);
  if (output?.coda.length === 0 && output.nucleus.at(-1)?.sound === "ʊ") kinds.push("openFinalOutputFoot");
  return kinds;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { run: { type: "string" }, out: { type: "string" } } });
  if (!values.run || !values.out) throw new Error("--run and --out are required.");
  const directory = resolve(values.run);
  const { manifest } = await readRun(directory, true);
  const evaluatorSource = await readFile(fileURLToPath(import.meta.url), "utf8");
  const witnesses: Record<string, Draw> = {};
  const profiles = [];
  for (const profile of manifest.protocol.profiles) {
    const totals = emptyCounts();
    const strata: Record<string, Counts> = {};
    const replicates = [];
    for (const seed of profile.seeds[manifest.cohort]) {
      const counts = emptyCounts();
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      if (!manifest.artifacts.some(artifact => artifact.file === file)) throw new Error(`Unpinned raw stream: ${file}`);
      const compressed = createReadStream(join(directory, file));
      const gunzip = createGunzip();
      compressed.on("error", error => gunzip.destroy(error));
      const lines = createInterface({ input: compressed.pipe(gunzip), crlfDelay: Infinity });
      try {
        for await (const line of lines) {
          const draw = JSON.parse(line) as Draw;
          if (draw.profile !== profile.id || draw.seed !== seed || draw.drawIndex !== counts.words || counts.words >= manifest.protocol.wordsPerReplicate) {
            throw new Error(`Invalid draw identity/order in ${file}.`);
          }
          observe(counts, draw); observe(totals, draw);
          const morphology = draw.word.trace?.morphology;
          const actual = morphology && morphology.template !== "bare" && (morphology.prefix || morphology.suffix) ? morphology.template : "bare";
          const stratum = `${actual}/syllables:${draw.word.syllables.length}`;
          observe(strata[stratum] ??= emptyCounts(), draw);
          for (const kind of witnessKinds(draw)) witnesses[`${profile.id}/${kind}`] ??= draw;
        }
      } finally {
        lines.close(); compressed.destroy(); gunzip.destroy();
      }
      if (counts.words !== manifest.protocol.wordsPerReplicate) throw new Error(`Incomplete raw stream: ${file}`);
      replicates.push({ seed, counts });
    }
    profiles.push({ id: profile.id, totals, replicates, strata });
    console.log(`${profile.id}: ${totals.words.toLocaleString()} archived words measured`);
  }
  if (evaluatorSource !== await readFile(fileURLToPath(import.meta.url), "utf8")) throw new Error("Probe source changed during measurement.");
  const report = { schemaVersion: 1, definitions, evaluator: { digest: digest({ definitions, source: evaluatorSource }), source: evaluatorSource },
    run: { id: manifest.id, manifestDigest: digest(manifest), generator: manifest.generator, protocol: manifest.protocol, protocolDigest: manifest.protocolDigest,
      environment: manifest.environment, originalEvaluatorDigest: manifest.evaluatorDigest },
    profiles, witnesses,
  };
  const out = resolve(values.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report)}\n`, { flag: "wx" });
  console.log(`Saved nucleus edge evidence: ${out}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
