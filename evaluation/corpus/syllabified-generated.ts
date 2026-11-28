import { createHash } from "node:crypto";
import { createSeededRng, generateWord } from "../../src/index.js";
import { addCount, histogram, type Histogram } from "./joint.js";
import { BASELINE_POLICY, inferSyllables, POLICIES, suppliedSyllables, type OnsetInventories, type Policy } from "./syllabified-reference.js";
import { cmuLegacyEnglishAdapter } from "./variety-adapter.js";

const uniqueSorted = (values: string[]) => [...new Set(values)].sort();

interface BoundaryDecision {
  policy: Policy;
  outcome: "match" | "disagree" | "unavailable";
}

export function countBoundaryChanges(totals: Histogram, decisions: readonly BoundaryDecision[]) {
  const baseline = decisions.find(decision => decision.policy === BASELINE_POLICY);
  if (!baseline) throw new Error(`Missing boundary decision for baseline policy ${BASELINE_POLICY}.`);
  for (const { policy, outcome } of decisions) {
    if (policy !== BASELINE_POLICY) addCount(totals, `${policy}/boundary-change:${baseline.outcome}>${outcome}`);
  }
}

export function compareGenerated(seed: number, words: number, inventories: OnsetInventories, morphology: boolean) {
  const rand = createSeededRng(seed);
  const fingerprint = createHash("sha256");
  const actualCoverage = histogram();
  const suppliedShape = histogram();
  const matchedCoverage = histogram();
  const totals = histogram();
  const strata = histogram();
  const witnesses: Partial<Record<Policy, unknown[]>> = {};
  const policyStats = (policy: Policy, outcome: string, dimensions: string[]) => {
    addCount(totals, `${policy}/${outcome}`);
    for (const dimension of dimensions) addCount(strata, `${policy}/${dimension}/${outcome}`);
  };

  for (let draw = 0; draw < words; draw++) {
    const word = generateWord({ mode: "lexicon", morphology, rand, trace: true });
    if (!word.lexical || !word.trace) throw new Error("Public generator did not return a lexical root and trace.");
    const root = { syllables: word.lexical.root };
    const phones = cmuLegacyEnglishAdapter.mapGenerated(root);
    for (const phone of phones) addCount(actualCoverage, `${phone.raw}|${phone.stress}|${phone.fit.status}`);
    const supplied = suppliedSyllables(root);
    const repairRules = uniqueSorted(word.trace.repairs.map(repair => repair.rule));
    const structuralEvents = uniqueSorted(word.trace.structural.map(decision => decision.event));
    const shape = supplied.syllables.every(syllable => syllable.nucleus.length === 1) ? "single" : "complex-or-empty";
    addCount(suppliedShape, shape);
    const length = [
      `root-kind:${supplied.syllables.length === 1 ? "monosyllabic" : "polysyllabic"}`,
      `nucleus-shape:${shape}`, `syllables:${supplied.syllables.length}`, `phones:${phones.length}`,
    ];
    const repairs = [
      `repair:${repairRules.length > 0 ? "present" : "absent"}`,
      ...repairRules.map(rule => `repair-rule:${rule}`),
      ...structuralEvents.map(event => `structural:${event}`),
    ];
    const entry = { draw, spelling: word.written.clean, phones, supplied, repairRules, structuralEvents };
    fingerprint.update(JSON.stringify(entry) + "\n");

    const trials = POLICIES.map(policy => ({
      policy, analysis: inferSyllables(phones, policy, inventories), outcomes: [] as string[],
    }));
    for (let index = 1; index < supplied.syllables.length; index++) {
      const left = supplied.syllables[index - 1];
      const right = supplied.syllables[index];
      const cluster = [...left.coda, ...right.onset];
      const dimensions = [...length, ...repairs,
        `stress:${phones[left.nucleus.at(-1) ?? -1]?.stress ?? "unavailable"}>${phones[right.nucleus[0]]?.stress ?? "unavailable"}`,
        `cluster-size:${cluster.length}`, `cluster:${cluster.map(i => phones[i].raw).join(" ")}`,
        `supplied-split:${left.coda.length}+${right.onset.length}`,
      ];
      const decisions = trials.map<BoundaryDecision>(({ policy, analysis, outcomes }) => {
        const inferred = analysis.boundaries.find(boundary => boundary.leftNucleus === left.nucleus.at(-1) && boundary.rightNucleus === right.nucleus[0]);
        const outcome = inferred?.chosenCodaSize == null ? "unavailable"
          : inferred.chosenCodaSize === left.coda.length ? "match" : "disagree";
        outcomes.push(outcome);
        policyStats(policy, `boundary:${outcome}`, dimensions);
        return { policy, outcome };
      });
      if (decisions.every(decision => decision.outcome !== "unavailable")) {
        for (const { policy, outcome } of decisions) addCount(matchedCoverage, `${policy}/boundary:${outcome}`);
      }
      countBoundaryChanges(totals, decisions);
    }
    for (const { policy, analysis: analyses, outcomes } of trials) {
      const matches = analyses.status === "inferred" && analyses.syllables.length === supplied.syllables.length
        && outcomes.every(outcome => outcome === "match");
      const outcome = matches ? "match" : analyses.status === "unavailable" ? "unavailable" : "disagree";
      policyStats(policy, `root:${outcome}`, [...length, ...repairs]);
      if (matches) continue;
      const examples = witnesses[policy] ??= [];
      if (examples.length < 8) examples.push({ ...entry, analyses, seed,
        trace: { selection: word.trace.selection, structural: word.trace.structural, repairs: word.trace.repairs,
          stages: word.trace.stages, morphology: word.trace.morphology } });
    }
  }
  return { seed, words, morphology, inputFingerprint: fingerprint.digest("hex"), actualCoverage, suppliedShape,
    totals, matchedCoverage, strata, witnesses };
}
