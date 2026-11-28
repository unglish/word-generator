import { isDeepStrictEqual } from "node:util";
import { englishConfig } from "../../src/config/english.js";
import type { ReferenceModel } from "../review/wordlikeness/model.js";
import { jsonDigest } from "./identity.js";
import { addCount, histogram, type Histogram } from "./joint.js";
import { verifyMappedRootPairs, type loadAuditedPopulation } from "./syllabified-population.js";
import {
  BASELINE_POLICY, CMU_ROOT_SYLLABIFICATION_V1, configClusterLicense, inferSyllables, onsetInventories, POLICIES,
  type Policy, type Syllabification,
} from "./syllabified-reference.js";
import { compatibilityConstituents, countConstituents, createConstituentTables } from "./syllabified-tables.js";
import type { countRetainedRootPairs } from "./uci-root-counts.js";
import { mapReferenceTokens, type MappedPhone, type VarietyAdapter } from "./variety-adapter.js";

interface BuildInputs {
  population: Awaited<ReturnType<typeof loadAuditedPopulation>>;
  census: ReturnType<typeof countRetainedRootPairs>;
  frozen: { digest: string; model: Pick<ReferenceModel, "initial_onsets" | "constituents"> };
  adapter: VarietyAdapter;
}

function policyTables(policy: Policy) {
  return { policy, distinct: createConstituentTables(), surfaceWeighted: createConstituentTables(),
    changesFrom304: histogram(), boundaryChangesFrom304: histogram(), unavailableBoundariesFrom304: histogram() };
}

function compareToBaseline(tables: ReturnType<typeof policyTables>, phones: readonly MappedPhone[],
  baseline: Extract<Syllabification, { status: "inferred" }>, analysis: ReturnType<typeof inferSyllables>, weight: number) {
  let moved = false;
  for (const [i, boundary] of baseline.boundaries.entries()) {
    const from = baseline.syllables[i].coda.length;
    const to = analysis.boundaries[i]?.chosenCodaSize;
    if (to === from) continue;
    const cluster = boundary.cluster.map(index => phones[index].raw).join(" ");
    const stress = `${phones[boundary.leftNucleus].stress}>${phones[boundary.rightNucleus].stress}`;
    const key = `${boundary.cluster.length}|${stress}|${cluster}|${from}>${to ?? "unavailable"}`;
    if (to == null) {
      addCount(tables.unavailableBoundariesFrom304, key, weight);
    } else {
      addCount(tables.boundaryChangesFrom304, key, weight);
      moved = true;
    }
  }
  addCount(tables.changesFrom304, analysis.status === "unavailable" ? "unavailable" : moved ? "different" : "equal", weight);
}

function totalsFromCensus(rows: number, pairs: number) {
  return { rows, phones: rows + pairs, pairs };
}

function sumCounts(group: Record<string, Histogram>) {
  return Object.values(group).reduce((sum, cell) => sum + cell.total, 0);
}

function verifyTables(policy: Policy, tables: ReturnType<typeof createConstituentTables>, expected: ReturnType<typeof totalsFromCensus>) {
  if (tables.rows.total !== expected.rows || tables.nativePhones.total !== expected.phones ||
    tables.nativeAdjacentPairs.total !== expected.pairs || tables.nativeBoundedPairs.total !== expected.phones + expected.rows) {
    throw new Error(`Native phones and adjacent pair totals disagree for ${policy}.`);
  }
  if ((tables.rows.counts.unavailable ?? 0) === 0 && (!isDeepStrictEqual(tables.reconstructedNativePhones, tables.nativePhones) ||
    !isDeepStrictEqual(tables.reconstructedNativeBoundedPairs, tables.nativeBoundedPairs))) {
    throw new Error(`Syllable reconstruction lost source tokens or adjacency for ${policy}.`);
  }
  const onsetCount = sumCounts(tables.onset.permitted) + sumCounts(tables.onset.withheld);
  const rimeCount = sumCounts(tables.rime.permitted) + sumCounts(tables.rime.withheld);
  if (onsetCount !== rimeCount || onsetCount * 2 !== sumCounts(tables.compatibility)) {
    throw new Error(`Syllable constituent totals disagree for ${policy}.`);
  }
}

/** Reconcile the audited roots and full #304 population before emitting any mapped rows. */
export async function buildSyllabifiedReference({ population, census, frozen, adapter }: BuildInputs,
  writeRow: (jsonLine: string) => void | Promise<void>) {
  const roots = population.roots.map(({ source, surfaces }) => ({ source, surfaces, phones: mapReferenceTokens(source.tokens, adapter) }));
  verifyMappedRootPairs(roots, census);
  const inventories = onsetInventories(frozen.model.initial_onsets, roots.map(row => row.phones), configClusterLicense(englishConfig));
  const compatibility: ReferenceModel["constituents"] = {};
  for (const { tokens } of population.entries) {
    const phones = mapReferenceTokens(tokens, adapter);
    compatibilityConstituents(compatibility, phones, inferSyllables(phones, BASELINE_POLICY, inventories), 1);
  }
  if (!isDeepStrictEqual(compatibility, frozen.model.constituents)) throw new Error("Recount differs from frozen #304 constituents.");

  const policies = POLICIES.map(policyTables);
  for (const { source: { line, label, spelling }, surfaces, phones } of roots) {
    const splits = Object.fromEntries(POLICIES.map(policy => [policy, inferSyllables(phones, policy, inventories)] as const));
    const baseline = splits[BASELINE_POLICY];
    if (baseline?.status !== "inferred") throw new Error(`Missing #304 syllables for CMU row ${line} (${label}).`);
    for (const tables of policies) {
      const analysis = splits[tables.policy];
      countConstituents(tables.distinct, phones, analysis, 1);
      countConstituents(tables.surfaceWeighted, phones, analysis, surfaces.length);
      compareToBaseline(tables, phones, baseline, analysis, surfaces.length);
    }
    await writeRow(JSON.stringify({ source: { line, label, spelling }, surfaces, phones,
      adapter: adapter.descriptor.version, policy: CMU_ROOT_SYLLABIFICATION_V1.policy, splits }) + "\n");
  }

  const expectedTotals = {
    distinct: totalsFromCensus(census.retained.distinctStems, census.pairTotals.stemWeightedOccurrences),
    surfaceWeighted: totalsFromCensus(census.retained.surfaceObservations, census.pairTotals.surfaceWeightedOccurrences),
  };
  for (const { policy, distinct, surfaceWeighted } of policies) {
    verifyTables(policy, distinct, expectedTotals.distinct);
    verifyTables(policy, surfaceWeighted, expectedTotals.surfaceWeighted);
  }
  const onsets = { frozen: [...inventories.frozen].sort(), audited: [...inventories.audited].sort(),
    minimumThree: [...inventories.minimumThree].sort() };
  const parity304 = { digest: frozen.digest, entries: population.entries.length,
    constituentCells: Object.values(compatibility).reduce((sum, context) => sum + Object.keys(context.counts).length, 0),
    countsDigest: jsonDigest(compatibility) };
  return { inventories, onsets, parity304, expectedTotals, policies };
}
