const DEFAULTS = {
  seed: 85,
  minCount: 2_000_000,
  maxCount: 10_000_000,
  mode: "lexicon",
  morphology: true,
  traceMisses: 0,
};

const TRACE_BUCKETS = {
  structural: "structural blocker",
  grapheme: "grapheme competition / orthography-selection miss",
  morphology: "morphology interaction",
  mixed: "mixed / unclear",
};

function readFlagValue(argv, name) {
  const flag = `--${name}`;
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  const next = argv[index + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

function parseIntegerFlag(argv, name, fallback) {
  const raw = readFlagValue(argv, name);
  if (raw === undefined) return fallback;
  if (raw === true) {
    throw new Error(`--${name} requires a numeric value`);
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --${name} value: ${raw}`);
  }
  return parsed;
}

function parseBooleanFlag(argv, name, fallback) {
  const raw = readFlagValue(argv, name);
  if (raw === undefined) return fallback;
  if (raw === true) return true;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error(`Invalid --${name} value: ${raw} (expected true|false|1|0)`);
}

function parseTraceMissesFlag(argv) {
  const raw = readFlagValue(argv, "trace-misses");
  if (raw === undefined) return DEFAULTS.traceMisses;
  if (raw === true) return 2;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --trace-misses value: ${raw}`);
  }
  return parsed;
}

export function parseCommonWordCoverageArgs(argv) {
  const seed = parseIntegerFlag(argv, "seed", DEFAULTS.seed);
  const minCount = parseIntegerFlag(argv, "min-count", DEFAULTS.minCount);
  const maxCount = parseIntegerFlag(argv, "max-count", DEFAULTS.maxCount);
  const mode = readFlagValue(argv, "mode");
  const morphology = parseBooleanFlag(argv, "morphology", DEFAULTS.morphology);
  const traceMisses = parseTraceMissesFlag(argv);

  const resolvedMode = mode === undefined || mode === true ? DEFAULTS.mode : mode;
  if (resolvedMode !== "lexicon" && resolvedMode !== "text") {
    throw new Error(`Invalid --mode value: ${String(resolvedMode)} (expected lexicon|text)`);
  }
  if (minCount > maxCount) {
    throw new Error(`--min-count (${minCount}) must be <= --max-count (${maxCount})`);
  }

  return {
    seed,
    minCount,
    maxCount,
    mode: resolvedMode,
    morphology,
    traceMisses,
  };
}

export function loadCommonWordsFromDemoWorker(workerSource) {
  const match = workerSource.match(/const commonWords = \[([\s\S]*?)\];/);
  if (!match) {
    throw new Error("Unable to locate commonWords array in demo/commonWordsWorker.js");
  }

  const words = [];
  const pattern = /'([^']+)'/g;
  let next;
  while ((next = pattern.exec(match[1])) !== null) {
    words.push(next[1].toLowerCase());
  }

  if (words.length === 0) {
    throw new Error("Parsed an empty commonWords array from demo/commonWordsWorker.js");
  }
  return words;
}

export function createCoverageTracker(targetWords) {
  const orderedWords = [];
  const seen = new Set();
  const byWord = new Map();
  for (const rawWord of targetWords) {
    const word = String(rawWord).trim().toLowerCase();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    const row = { word, hits: 0, firstSeenGeneration: null };
    orderedWords.push(row);
    byWord.set(word, row);
  }

  let foundCount = 0;
  return {
    consume(cleanWord, generation) {
      const row = byWord.get(cleanWord);
      if (!row) return false;
      row.hits += 1;
      if (row.firstSeenGeneration === null) {
        row.firstSeenGeneration = generation;
        foundCount += 1;
        return true;
      }
      return false;
    },
    isComplete() {
      return foundCount === orderedWords.length;
    },
    get foundCount() {
      return foundCount;
    },
    get rows() {
      return orderedWords;
    },
  };
}

function normalizeWordRecord(record) {
  if (typeof record === "string") {
    return { clean: record.toLowerCase(), pronunciation: undefined, trace: undefined };
  }
  const clean = record?.written?.clean ?? record?.clean;
  if (!clean || typeof clean !== "string") {
    throw new Error("Generated word record is missing written.clean");
  }
  return {
    clean: clean.toLowerCase(),
    pronunciation: record.pronunciation,
    trace: record.trace,
  };
}

export function runCoverage({
  targetWords,
  minCount,
  maxCount,
  nextWord,
}) {
  const tracker = createCoverageTracker(targetWords);
  const uniqueGenerated = new Set();
  let totalIterations = 0;
  let stopReason = "max-count-reached";

  while (totalIterations < maxCount) {
    totalIterations += 1;
    const normalized = normalizeWordRecord(nextWord({ trace: false }));
    uniqueGenerated.add(normalized.clean);
    tracker.consume(normalized.clean, totalIterations);

    if (totalIterations >= minCount && tracker.isComplete()) {
      stopReason = "all-targets-found";
      break;
    }
  }

  return {
    tracker,
    totalIterations,
    uniqueGeneratedCount: uniqueGenerated.size,
    stopReason,
  };
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const prev = new Array(right.length + 1);
  const curr = new Array(right.length + 1);
  for (let j = 0; j <= right.length; j++) prev[j] = j;

  for (let i = 1; i <= left.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= right.length; j++) prev[j] = curr[j];
  }

  return prev[right.length];
}

function sharedPrefixLength(left, right) {
  let count = 0;
  while (count < left.length && count < right.length && left[count] === right[count]) {
    count += 1;
  }
  return count;
}

function sharedSuffixLength(left, right) {
  let count = 0;
  while (
    count < left.length
    && count < right.length
    && left[left.length - 1 - count] === right[right.length - 1 - count]
  ) {
    count += 1;
  }
  return count;
}

function isPlausibleNearMiss(target, clean, distance) {
  if (distance === 0) return false;
  if (distance <= 2) return true;
  if (target.startsWith("wh") && clean.startsWith("w")) return distance <= 3;
  if (target.endsWith("ould") && clean.endsWith("oud")) return true;
  if (/^(be|he|me|we)$/.test(target) && /(ee|ie|ei)$/.test(clean)) return true;
  if (target === "people" && clean.includes("peop")) return true;
  return false;
}

function summarizeTrace(record) {
  const trace = record.trace;
  return {
    graphemes: trace?.graphemeSelections?.slice(0, 10).map((entry) => `${entry.phoneme}>${entry.selected}`) ?? [],
    repairs: trace?.repairs?.slice(0, 8).map((entry) => entry.rule) ?? [],
    morphologyTemplate: trace?.morphology?.template,
  };
}

function scoreNearMiss(target, clean, distance) {
  const prefix = sharedPrefixLength(target, clean);
  const suffix = sharedSuffixLength(target, clean);
  const sameLengthBonus = Math.abs(target.length - clean.length) === 0 ? 8 : 0;
  return distance * 100 - prefix * 11 - suffix * 7 - sameLengthBonus;
}

function insertCandidate(list, candidate, maxCandidatesPerWord) {
  const existingIndex = list.findIndex((entry) => entry.word === candidate.word);
  if (existingIndex !== -1) {
    if (list[existingIndex].score <= candidate.score) return;
    list.splice(existingIndex, 1);
  }

  list.push(candidate);
  list.sort((left, right) => left.score - right.score || left.word.localeCompare(right.word));
  if (list.length > maxCandidatesPerWord) {
    list.length = maxCandidatesPerWord;
  }
}

function classifyNearMiss(target, candidate) {
  if (!candidate) {
    return {
      bucket: TRACE_BUCKETS.mixed,
      note: "No plausible near miss appeared in the traced sample.",
    };
  }

  const clean = candidate.word;
  const repairs = new Set(candidate.traceSummary.repairs);
  if (candidate.traceSummary.morphologyTemplate) {
    return {
      bucket: TRACE_BUCKETS.morphology,
      note: `Best near miss "${clean}" arrived with morphology template "${candidate.traceSummary.morphologyTemplate}".`,
    };
  }

  if (/^(be|he|me|we)$/.test(target)) {
    return {
      bucket: TRACE_BUCKETS.structural,
      note: `Observed "${clean}" instead of bare final-e "${target}", which points to the missing final /i:/ -> e path.`,
    };
  }

  if (/^(would|could)$/.test(target)) {
    return {
      bucket: TRACE_BUCKETS.structural,
      note: `Observed "${clean}" near "${target}", which is consistent with the silent-consonant ould gap.`,
    };
  }

  if (target === "who") {
    return {
      bucket: TRACE_BUCKETS.structural,
      note: `Observed "${clean}" while tracing "${target}", which points to the wh-for-/h/ plus final high-vowel spelling gap.`,
    };
  }

  if (target.startsWith("wh")) {
    return {
      bucket: TRACE_BUCKETS.grapheme,
      note: `Observed "${clean}" near "${target}", which points to /w/ -> wh orthography competition rather than a missing word shape.`,
    };
  }

  if (target === "people") {
    return {
      bucket: TRACE_BUCKETS.structural,
      note: `Observed "${clean}" near "${target}", which points to the under-modeled people/peop-le orthography class.`,
    };
  }

  if (target === "their" || target === "first") {
    return {
      bucket: TRACE_BUCKETS.structural,
      note: `Observed "${clean}" near "${target}", which points to the missing rhotic spelling class.`,
    };
  }

  if (
    repairs.has("spellingRule:whu-to-who")
    || repairs.has("spellingRule:oud-to-ould")
    || repairs.has("spellingRule:eopVowel-l-to-eople")
  ) {
    return {
      bucket: TRACE_BUCKETS.structural,
      note: `Trace repairs on "${clean}" show that the near miss depends on a dedicated orthography repair path.`,
    };
  }

  return {
    bucket: TRACE_BUCKETS.grapheme,
    note: `Observed "${clean}" as the closest traced competitor to "${target}".`,
  };
}

export function traceMissingWords({
  missingWords,
  maxIterations,
  maxCandidatesPerWord,
  nextWord,
}) {
  if (missingWords.length === 0 || maxCandidatesPerWord <= 0 || maxIterations <= 0) {
    return { analyses: [], sampledIterations: 0 };
  }

  const orderedTargets = [...missingWords].map((word) => word.toLowerCase());
  const candidatesByTarget = new Map(orderedTargets.map((word) => [word, []]));
  let sampledIterations = 0;

  while (sampledIterations < maxIterations) {
    sampledIterations += 1;
    const record = normalizeWordRecord(nextWord({ trace: true }));
    for (const target of orderedTargets) {
      const distance = levenshteinDistance(target, record.clean);
      if (!isPlausibleNearMiss(target, record.clean, distance)) continue;

      insertCandidate(candidatesByTarget.get(target), {
        word: record.clean,
        pronunciation: record.pronunciation,
        distance,
        sharedPrefix: sharedPrefixLength(target, record.clean),
        sharedSuffix: sharedSuffixLength(target, record.clean),
        score: scoreNearMiss(target, record.clean, distance),
        traceSummary: summarizeTrace(record),
      }, maxCandidatesPerWord);
    }
  }

  const analyses = orderedTargets.map((target) => {
    const candidates = candidatesByTarget.get(target) ?? [];
    const classification = classifyNearMiss(target, candidates[0]);
    return {
      target,
      bucket: classification.bucket,
      note: classification.note,
      candidates: candidates.map(({ score, ...rest }) => rest),
    };
  });

  return { analyses, sampledIterations };
}

export function summarizeNearMissBuckets(analyses) {
  const grouped = new Map();
  for (const analysis of analyses) {
    if (!grouped.has(analysis.bucket)) {
      grouped.set(analysis.bucket, []);
    }
    grouped.get(analysis.bucket).push(analysis.target);
  }

  return Array.from(grouped.entries())
    .map(([bucket, words]) => ({
      bucket,
      words,
      note:
        bucket === TRACE_BUCKETS.structural
          ? "Best traced competitors still point to a missing or blocked spelling path."
          : bucket === TRACE_BUCKETS.grapheme
            ? "Best traced competitors suggest the word shape exists but loses to a competing spelling."
            : bucket === TRACE_BUCKETS.morphology
              ? "Best traced competitors are affix-driven rather than base-form spellings."
              : "Trace evidence was too weak or too sparse to assign a cleaner cause.",
    }))
    .sort((left, right) => left.bucket.localeCompare(right.bucket));
}

export function buildCoverageReport({
  tracker,
  totalIterations,
  uniqueGeneratedCount,
  stopReason,
  config,
  targetSource,
  nearMisses = [],
  nearMissBuckets = [],
  traceMissDiagnostics,
}) {
  const words = tracker.rows.map((row) => ({
    ...row,
    found: row.firstSeenGeneration !== null,
  }));
  const foundCount = words.filter((row) => row.found).length;
  const missingWords = words.filter((row) => !row.found).map((row) => row.word);
  return {
    generatedAt: new Date().toISOString(),
    config,
    targetSource,
    summary: {
      totalIterations,
      uniqueGeneratedCount,
      targetCount: words.length,
      foundCount,
      missingCount: missingWords.length,
      stopReason,
    },
    words,
    missingWords,
    nearMisses,
    nearMissBuckets,
    traceMissDiagnostics,
  };
}

export function renderCoverageCsv(report) {
  const lines = [
    "word,hits,firstSeenGeneration,found,bucket,nearMiss",
  ];

  const byWord = new Map(report.nearMisses.map((analysis) => [analysis.target, analysis]));
  for (const row of report.words) {
    const analysis = byWord.get(row.word);
    const nearMiss = analysis?.candidates?.[0]?.word ?? "";
    lines.push([
      row.word,
      row.hits,
      row.firstSeenGeneration ?? "",
      row.found ? "true" : "false",
      analysis?.bucket ?? "",
      nearMiss,
    ].join(","));
  }

  return `${lines.join("\n")}\n`;
}

export function renderCoverageMarkdown(report) {
  const lines = [
    "# Common Word Coverage",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Run",
    "",
    `- Target source: \`${report.targetSource}\``,
    `- Mode: \`${report.config.mode}\``,
    `- Morphology: \`${String(report.config.morphology)}\``,
    `- Seed: \`${report.config.seed}\``,
    `- Minimum iterations: \`${report.config.minCount.toLocaleString()}\``,
    `- Maximum iterations: \`${report.config.maxCount.toLocaleString()}\``,
    "",
    "## Summary",
    "",
    `- Stop reason: \`${report.summary.stopReason}\``,
    `- Total iterations: \`${report.summary.totalIterations.toLocaleString()}\``,
    `- Unique generated words: \`${report.summary.uniqueGeneratedCount.toLocaleString()}\``,
    `- Found: \`${report.summary.foundCount} / ${report.summary.targetCount}\``,
    `- Missing: \`${report.summary.missingCount}\``,
  ];

  if (report.missingWords.length > 0) {
    lines.push("", "## Missing", "", report.missingWords.join(", "));
  }

  lines.push(
    "",
    "## Per-Word Counts",
    "",
    "| Word | Hits | First seen |",
    "|------|------|------------|",
    ...report.words.map((row) => `| ${row.word} | ${row.hits} | ${row.firstSeenGeneration ?? "-"} |`),
  );

  if (report.traceMissDiagnostics && report.nearMisses.length > 0) {
    lines.push(
      "",
      "## Trace-backed Missing-Word Notes",
      "",
      `- Traced iterations: \`${report.traceMissDiagnostics.sampledIterations.toLocaleString()}\``,
      `- Candidates per missing word: \`${report.traceMissDiagnostics.maxCandidatesPerWord}\``,
      "",
    );

    for (const bucket of report.nearMissBuckets) {
      lines.push(`### ${bucket.bucket}`, "", `- ${bucket.note}`, `- Words: ${bucket.words.join(", ")}`, "");
      for (const analysis of report.nearMisses.filter((entry) => entry.bucket === bucket.bucket)) {
        const best = analysis.candidates[0];
        if (!best) {
          lines.push(`- \`${analysis.target}\`: ${analysis.note}`);
          continue;
        }
        lines.push(`- \`${analysis.target}\`: ${analysis.note}`);
        lines.push(`  Best near miss: \`${best.word}\` (distance ${best.distance})`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}
