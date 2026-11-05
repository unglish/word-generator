import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import type { Word } from "../../../../src/types.js";

export interface GraphemeProbe {
  words: number;
  decisions: number;
  zeroTotalDecisions: number;
  wordsWithZeroTotal: number;
  singletonDecisions: number;
  observedSelectionDecisions: number;
  unknownSelectionDecisions: number;
  invalidSelectedWeights: number;
  emptyOrdinarySets: number;
  declaredFallbacks: number;
  observedConstraintRestorations: number;
  relaxedDoublingQuotas: number;
  scopes: Record<string, number>;
  fallbacks: Record<string, number>;
}

export function emptyProbe(): GraphemeProbe {
  return {
    words: 0, decisions: 0, zeroTotalDecisions: 0, wordsWithZeroTotal: 0,
    singletonDecisions: 0, observedSelectionDecisions: 0, unknownSelectionDecisions: 0,
    invalidSelectedWeights: 0, emptyOrdinarySets: 0, declaredFallbacks: 0,
    observedConstraintRestorations: 0, relaxedDoublingQuotas: 0, scopes: {}, fallbacks: {},
  };
}

export function observeWord(probe: GraphemeProbe, word: Word): void {
  if (!word.trace) throw new Error("The selection probe requires traced words");
  probe.words++;
  let zeroTotal = false;
  for (const choice of word.trace.graphemeSelections) {
    probe.decisions++;
    if (choice.weights.length === 1) probe.singletonDecisions++;
    if (choice.weights.length > 0 && choice.weights.every(([, weight]) => weight === 0)) {
      probe.zeroTotalDecisions++;
      zeroTotal = true;
    }
    const selection = choice.selection;
    if (!selection) {
      probe.unknownSelectionDecisions++;
      continue;
    }
    probe.observedSelectionDecisions++;
    const selectedWeights = choice.weights.filter(([form]) => form === choice.selected);
    if (!selectedWeights.some(([, weight]) => weight > 0 && Number.isFinite(weight))) {
      probe.invalidSelectedWeights++;
    }
    if (selection.positiveCandidates === 0) probe.emptyOrdinarySets++;
    if (selection.fallback) {
      probe.declaredFallbacks++;
      const reason = `${choice.phoneme}/${choice.selected}/${selection.fallback}`;
      probe.fallbacks[reason] = (probe.fallbacks[reason] ?? 0) + 1;
    } else if (!choice.afterCondition.includes(choice.selected) || !choice.afterPosition.includes(choice.selected)) {
      probe.observedConstraintRestorations++;
    }
    if (selection.preferenceRelaxed) probe.relaxedDoublingQuotas++;
    const scope = `${selection.positionScope}/${selection.segmentPosition}/${selection.syllablePosition}`;
    probe.scopes[scope] = (probe.scopes[scope] ?? 0) + 1;
  }
  if (zeroTotal) probe.wordsWithZeroTotal++;
}

export function probeReport(probe: GraphemeProbe) {
  const observed = probe.observedSelectionDecisions > 0;
  return {
    ...probe,
    invalidSelectedWeights: observed ? probe.invalidSelectedWeights : null,
    emptyOrdinarySets: observed ? probe.emptyOrdinarySets : null,
    declaredFallbacks: observed ? probe.declaredFallbacks : null,
    observedConstraintRestorations: observed ? probe.observedConstraintRestorations : null,
    relaxedDoublingQuotas: observed ? probe.relaxedDoublingQuotas : null,
    zeroTotalWordRate: probe.words ? probe.wordsWithZeroTotal / probe.words : null,
  };
}

async function main(run: string): Promise<void> {
  const directory = join(run, "words");
  const reports: Record<string, ReturnType<typeof probeReport>> = {};
  const total = emptyProbe();
  for (const file of (await readdir(directory)).filter(name => name.endsWith(".jsonl.gz")).sort()) {
    const probe = emptyProbe();
    const lines = createInterface({ input: createReadStream(join(directory, file)).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of lines) {
      const draw = JSON.parse(line) as { word: Word };
      observeWord(probe, draw.word);
      observeWord(total, draw.word);
    }
    reports[file] = probeReport(probe);
  }
  if (total.words === 0) throw new Error("No archived words found");
  process.stdout.write(`${JSON.stringify({ probeVersion: 1, run, total: probeReport(total), replicates: reports }, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("grapheme-selection/analyze.ts")) {
  const run = process.argv[2];
  if (!run) throw new Error("Usage: node --import tsx evaluation/quality/probes/grapheme-selection/analyze.ts RUN_DIRECTORY");
  await main(run);
}
