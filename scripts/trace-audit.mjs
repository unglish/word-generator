#!/usr/bin/env node

/**
 * Reusable trace-first audit for structural debugging and quality tracking.
 *
 * Usage:
 *   node scripts/trace-audit.mjs --count 50000 --seed 42 --mode lexicon --morphology true
 *
 * Optional metric selection:
 *   --metrics trigrams,hiatus,glide,morphology,structural
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateWords } from "../dist/core/generate.js";
import { ENGLISH_VOWEL_SOUND_SET } from "../dist/core/vowel-sounds.js";
import { parseMetrics, parseFailOn, evaluateFailOn } from "./lib/trace-audit-core.mjs";

const DEFAULT_TARGET_TRIGRAMS = ["iin", "iow", "aow", "eae", "eai", "eao", "eoe", "oou"];
const SCHEMA_VERSION = "1.0.0";
const METRIC_KEYS = ["trigrams", "hiatus", "glide", "morphology", "structural"];

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function parseBool(v, fallback) {
  if (v === undefined) return fallback;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

function countHiatus(syllables) {
  let count = 0;
  for (let i = 1; i < syllables.length; i++) {
    if (syllables[i - 1].coda.length === 0 && syllables[i].onset.length === 0) count++;
  }
  return count;
}

function countBoundaries(syllables) {
  return Math.max(0, syllables.length - 1);
}

function countVowelToGlideTransitions(syllables) {
  let totalFromVowel = 0;
  let transitions = 0;
  let prev;

  const visit = current => {
    if (prev !== undefined && ENGLISH_VOWEL_SOUND_SET.has(prev)) {
      totalFromVowel++;
      if (current === "w" || current === "j") transitions++;
    }
    prev = current;
  };

  for (const syl of syllables) {
    for (const sound of syl.onset) visit(sound);
    for (const sound of syl.nucleus) visit(sound);
    for (const sound of syl.coda) visit(sound);
  }

  return { totalFromVowel, transitions };
}

function toSyllablesFromStage(stageAfter) {
  return stageAfter.map(s => ({
    onset: s.onset,
    nucleus: s.nucleus,
    coda: s.coda,
  }));
}

function printHelp() {
  console.log(`trace-audit.mjs
Usage: node scripts/trace-audit.mjs [options]
Options:
  --count <n>           Number of words to generate (default: 50000)
  --seed <n>            RNG seed (default: 42)
  --mode <text|lexicon> Generation mode (default: lexicon)
  --morphology <bool>   Enable morphology (default: true)
  --targets <csv>       Trigram targets (default built-in set)
  --metrics <csv>       Metrics to run: ${METRIC_KEYS.join(",")}
  --fail-on <csv>       CI gate comparisons (quote in shell), e.g. 'final.hiatusRate<=0.001'
  --quiet               Suppress JSON report stdout
  --no-pretty           Emit compact JSON (single line)
  --out <path>          Write JSON report to file
  --help, -h            Show this help
Examples:
  node scripts/trace-audit.mjs --count 200000 --mode lexicon --morphology true
  node scripts/trace-audit.mjs --metrics hiatus,glide --fail-on 'final.hiatusRate<=0.001'`);
}
function createMetricProcessors(targets) {
  return {
    trigrams: {
      init() {
        return {
          totalTrigrams: 0,
          targetCounts: Object.fromEntries(targets.map(t => [t, 0])),
        };
      },
      consume(state, word) {
        const clean = word.written.clean.toLowerCase();
        for (let i = 0; i <= clean.length - 3; i++) {
          const tri = clean.slice(i, i + 3);
          if (state.targetCounts[tri] !== undefined) state.targetCounts[tri]++;
          state.totalTrigrams++;
        }
      },
      finalize(state) {
        return {
          totalTrigrams: state.totalTrigrams,
          targets: state.targetCounts,
          targetSum: Object.values(state.targetCounts).reduce((a, b) => a + b, 0),
        };
      },
    },
    hiatus: {
      init() {
        return {
          rootHiatus: 0,
          rootBoundaries: 0,
          finalHiatus: 0,
          finalBoundaries: 0,
        };
      },
      consume(state, word, traceStageAfter) {
        state.finalHiatus += countHiatus(word.syllables);
        state.finalBoundaries += countBoundaries(word.syllables);

        if (!traceStageAfter) return;
        const rootSyllables = toSyllablesFromStage(traceStageAfter);
        state.rootHiatus += countHiatus(rootSyllables);
        state.rootBoundaries += countBoundaries(rootSyllables);
      },
      finalize(state) {
        return {
          root: {
            hiatus: state.rootHiatus,
            boundaries: state.rootBoundaries,
            hiatusRate: state.rootBoundaries ? state.rootHiatus / state.rootBoundaries : 0,
          },
          final: {
            hiatus: state.finalHiatus,
            boundaries: state.finalBoundaries,
            hiatusRate: state.finalBoundaries ? state.finalHiatus / state.finalBoundaries : 0,
          },
          delta: {
            extraHiatus: state.finalHiatus - state.rootHiatus,
            extraBoundaries: state.finalBoundaries - state.rootBoundaries,
            extraHiatusRate: (state.finalBoundaries - state.rootBoundaries) > 0
              ? (state.finalHiatus - state.rootHiatus) / (state.finalBoundaries - state.rootBoundaries)
              : 0,
          },
        };
      },
    },
    glide: {
      init() {
        return {
          rootVowelToGlideTransitions: 0,
          rootTotalVowelTransitions: 0,
        };
      },
      consume(state, _word, traceStageAfter) {
        if (!traceStageAfter) return;
        const rootSyllables = toSyllablesFromStage(traceStageAfter);
        const glides = countVowelToGlideTransitions(rootSyllables);
        state.rootVowelToGlideTransitions += glides.transitions;
        state.rootTotalVowelTransitions += glides.totalFromVowel;
      },
      finalize(state) {
        return {
          glide: {
            rootVowelToGlideTransitions: state.rootVowelToGlideTransitions,
            rootTotalVowelTransitions: state.rootTotalVowelTransitions,
            rootVowelToGlideRate: state.rootTotalVowelTransitions
              ? state.rootVowelToGlideTransitions / state.rootTotalVowelTransitions
              : 0,
          },
        };
      },
    },
    morphology: {
      init() {
        return {
          templates: {},
          prefixes: {},
          suffixes: {},
        };
      },
      consume(state, _word, _stageAfter, trace) {
        if (!trace) return;
        const m = trace.morphology;
        const template = m?.template || "bare";
        state.templates[template] = (state.templates[template] || 0) + 1;
        if (m?.prefix) state.prefixes[m.prefix] = (state.prefixes[m.prefix] || 0) + 1;
        if (m?.suffix) state.suffixes[m.suffix] = (state.suffixes[m.suffix] || 0) + 1;
      },
      finalize(state) {
        return {
          morphology: {
            templates: state.templates,
            prefixes: state.prefixes,
            suffixes: state.suffixes,
          },
        };
      },
    },
    structural: {
      init() {
        return { counts: {} };
      },
      consume(state, _word, _stageAfter, trace) {
        if (!trace) return;
        for (const event of trace.structural) {
          state.counts[event.event] = (state.counts[event.event] || 0) + 1;
        }
      },
      finalize(state) {
        return { structural: state.counts };
      },
    },
  };
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const count = Number.parseInt(getArg("count", "50000"), 10);
  const seed = Number.parseInt(getArg("seed", "42"), 10);
  const mode = getArg("mode", "lexicon");
  const morphology = parseBool(getArg("morphology", "true"), true);
  const targets = (getArg("targets", DEFAULT_TARGET_TRIGRAMS.join(",")) || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const out = getArg("out", "");
  const selectedMetrics = parseMetrics(getArg("metrics", METRIC_KEYS.join(",")) || "", METRIC_KEYS);
  const failOn = parseFailOn(getArg("fail-on", ""));
  const quiet = process.argv.includes("--quiet");
  const pretty = !process.argv.includes("--no-pretty");

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Invalid --count: ${String(count)}`);
  }
  if (mode !== "text" && mode !== "lexicon") {
    throw new Error(`Invalid --mode: ${String(mode)} (expected text|lexicon)`);
  }

  const words = generateWords(count, { seed, mode, morphology, trace: true });

  const processors = createMetricProcessors(targets);
  const active = selectedMetrics.map(name => ({
    name,
    api: processors[name],
    state: processors[name].init(),
  }));

  for (const word of words) {
    const trace = word.trace;
    const stageAfter = trace?.stages.find(s => s.name === "generateSyllables")?.after;
    for (const metric of active) {
      metric.api.consume(metric.state, word, stageAfter, trace);
    }
  }

  const report = {
    schemaVersion: SCHEMA_VERSION,
    config: {
      count,
      seed,
      mode,
      morphology,
      targets,
      metrics: selectedMetrics,
      failOn: failOn.map(c => c.raw),
    },
    ...Object.assign({}, ...active.map(metric => metric.api.finalize(metric.state))),
  };
  const serialized = pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);

  if (out) {
    const outPath = resolve(process.cwd(), out);
    writeFileSync(outPath, `${serialized}\n`);
    if (!quiet) {
      console.log(`Wrote ${outPath}`);
    }
  }

  if (!quiet) {
    console.log(serialized);
  }

  const failures = evaluateFailOn(report, failOn);
  if (failures.length > 0) {
    console.error(`Fail-on thresholds violated (${failures.length}):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
