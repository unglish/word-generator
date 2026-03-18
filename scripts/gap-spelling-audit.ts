#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { englishConfig } from "../src/config/english.js";
import { groupGapSpellingsByTargetLayer } from "../src/core/gap-spelling.js";

const TARGET_LAYER_ORDER = [
  "grapheme",
  "spellingRule",
  "phonotactics",
  "morphology",
  "unknown",
] as const;

function main() {
  const gapSpellings = englishConfig.gapSpellings ?? [];
  const grouped = groupGapSpellingsByTargetLayer(gapSpellings);
  const layers = TARGET_LAYER_ORDER.map((targetLayer) => ({
    targetLayer,
    count: grouped.get(targetLayer)?.length ?? 0,
    entries: [...(grouped.get(targetLayer) ?? [])]
      .sort((left, right) => left.replacement.localeCompare(right.replacement) || left.name.localeCompare(right.name))
      .map((entry) => ({
        name: entry.name,
        replacement: entry.replacement,
        hyphenated: entry.hyphenated ?? entry.replacement,
        phonemes: entry.phonemes,
      })),
  })).filter((layer) => layer.count > 0);

  const report = {
    summary: {
      totalGapSpellings: gapSpellings.length,
      layerCounts: Object.fromEntries(layers.map((layer) => [layer.targetLayer, layer.count])),
    },
    layers,
  };

  const outputDir = path.join(process.cwd(), "memory");
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "gap-spelling-audit.json");
  const markdownPath = path.join(outputDir, "gap-spelling-audit.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const markdown = [
    "# Gap Spelling Audit",
    "",
    `- Total gap spellings: \`${report.summary.totalGapSpellings}\``,
    ...layers.map((layer) => `- ${layer.targetLayer}: \`${layer.count}\``),
    "",
    ...layers.flatMap((layer) => [
      `## ${layer.targetLayer}`,
      "",
      "| Name | Replacement | Phonemes |",
      "|------|-------------|----------|",
      ...layer.entries.map((entry) => `| ${entry.name} | ${entry.replacement} | /${entry.phonemes.join(" ")}/ |`),
      "",
    ]),
  ].join("\n");
  fs.writeFileSync(markdownPath, `${markdown}\n`);

  console.log("gap-spelling-audit");
  console.log(`- Total gap spellings: ${report.summary.totalGapSpellings}`);
  for (const layer of layers) {
    console.log(`- ${layer.targetLayer}: ${layer.count}`);
  }
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

main();
