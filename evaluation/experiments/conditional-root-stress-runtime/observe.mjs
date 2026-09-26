import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { analyzeStressPattern, createRootStressLaw, resolveStressRules } from "../../../src/index.ts";
import { canonical } from "../../quality/serialization.ts";
import { validateConfiguration, validatePattern } from "../../quality/probes/stress-pattern-observer/validate.ts";

export const ACTIVE_DOMAINS = ["root-before-primary", "root-after-primary", "root-after-pattern-application", "assembled-after-morphology", "final-lexical-before-realization", "surface-after-realization"];
const U = "unmarked", P = "primary", S = "secondary";
const mark = value => { assert(value === undefined || value === "ˈ" || value === "ˌ"); return value === "ˈ" ? P : value === "ˌ" ? S : U; };
const labels = snapshot => snapshot.syllables.map(syllable => syllable.mark);
const integer = (value, lower, upper) => { assert(Number.isSafeInteger(value) && value >= lower && value <= upper); return value; };
const uniform = value => { assert(Number.isFinite(value) && value >= 0 && value < 1); return value; };
const equal = (actual, expected, message) => assert.deepStrictEqual(canonical(actual), canonical(expected), message);
const segments = syllable => ({ onset: syllable.onset, nucleus: syllable.nucleus, coda: syllable.coda });
function phoneSnapshot(phone) {
  return { sound: phone.sound, ...(phone.nuclearQuantity ? { nuclearQuantity: { ...phone.nuclearQuantity } } : {}),
    ...(phone.reduced !== undefined ? { reduced: phone.reduced } : {}), ...(phone.aspirated !== undefined ? { aspirated: phone.aspirated } : {}) };
}
const projectedWord = syllables => syllables.map(syllable => ({ onset: syllable.onset.map(phoneSnapshot), nucleus: syllable.nucleus.map(phoneSnapshot), coda: syllable.coda.map(phoneSnapshot), mark: mark(syllable.stress) }));
const projectedSnapshot = snapshot => snapshot.syllables.map(syllable => ({ ...segments(syllable), mark: syllable.mark }));
const soundShape = snapshot => snapshot.syllables.map(syllable => ({ onset: syllable.onset.map(phone => phone.sound), nucleus: syllable.nucleus.map(phone => phone.sound), coda: syllable.coda.map(phone => phone.sound), mark: syllable.mark }));
function stage(word, name, side) {
  const matches = word.trace.stages.filter(value => value.name === name); assert.equal(matches.length, 1, name);
  return matches[0][side].map(syllable => ({ onset: syllable.onset, nucleus: syllable.nucleus, coda: syllable.coda, mark: mark(syllable.stress) }));
}

/** Literal quantity/weight reconstruction; no production weight helper is used. */
export function weightInput(syllables, policy) {
  assert(["legacy-segment-count", "moraic"].includes(policy.type));
  return syllables.map((syllable, syllableIndex) => {
    const nucleus = syllable.nucleus.map((phone, segmentIndex) => {
      const declared = phone.nuclearQuantity;
      if (declared) { assert(typeof declared.analysis === "string" && declared.analysis.length); assert([1, 2].includes(declared.moras)); }
      const reason = !declared ? "unspecified" : policy.type === "legacy-segment-count" ? "legacy-policy" : declared.analysis !== policy.analysis ? "model-mismatch" : null;
      return { segmentIndex, sound: phone.sound, ...(declared ? { declared } : {}),
        quantity: reason ? { status: "unknown", reason } : { status: "known", moras: declared.moras } };
    });
    const known = nucleus.reduce((sum, phone) => sum + (phone.quantity.status === "known" ? phone.quantity.moras : 0), 0);
    const complete = nucleus.length > 0 && nucleus.every(phone => phone.quantity.status === "known");
    let analytical;
    if (policy.type === "legacy-segment-count") analytical = { weight: "unknown", basis: "legacy-policy" };
    else if (!nucleus.length) analytical = { weight: "unknown", basis: "empty-nucleus" };
    else if (syllable.coda.length && policy.coda === "weight-by-position") analytical = { weight: "heavy", basis: "weight-by-position" };
    else if (known >= 2) analytical = { weight: "heavy", basis: "nuclear-quantity" };
    else if (complete) analytical = { weight: "light", basis: "nuclear-quantity" };
    else analytical = { weight: "unknown", basis: "unspecified-quantity" };
    const legacy = syllable.coda.length || nucleus.length > 1 ? "heavy" : "light";
    let operational;
    if (policy.type === "legacy-segment-count") operational = { weight: legacy, basis: "legacy-rule" };
    else if (analytical.weight !== "unknown") operational = { weight: analytical.weight, basis: "moraic-analysis" };
    else { assert.equal(policy.unknown, "legacy-segment-count"); operational = { weight: legacy, basis: "legacy-fallback" }; }
    return { syllableIndex, nucleus, nucleusMoras: complete ? known : null, coda: syllable.coda.map(phone => phone.sound), analytical, operational };
  });
}
function primaryCheck(trace, rules) {
  assert.equal(trace.primary.strategy, rules.primary.type);
  const n = trace.rootSyllableCount; integer(trace.primary.selectedIndex, 0, n - 1);
  let draws = 0;
  if (n > 1 && rules.primary.type === "weight-sensitive") draws = 1;
  if (n > 1 && rules.primary.type === "ot" && rules.primary.otConfig.noise) {
    const names = new Set(["WSP", "ALIGN-LEFT", "ALIGN-RIGHT", "NONFINALITY", "NONINITIAL"]);
    draws = 2 * rules.primary.otConfig.constraints.filter(constraint => names.has(constraint.name)).length;
  }
  assert.equal(trace.primary.draws.length, draws); trace.primary.draws.forEach(uniform);
  if (n === 1 || rules.primary.type === "initial") assert.equal(trace.primary.selectedIndex, 0);
  if (n > 1 && rules.primary.type === "fixed") assert.equal(trace.primary.selectedIndex, Math.max(0, Math.min(n - 1, rules.primary.fixedPosition)));
  if (n > 1 && rules.primary.type === "penultimate") assert.equal(trace.primary.selectedIndex, Math.max(0, n - 2));
}
function proposalCheck(trace, rules, analysis) {
  const proposal = trace.rootPattern.proposal; const marks = labels(trace.snapshots[1]); const assignments = [];
  const assign = (index, cause) => { assert.equal(marks[index], U); marks[index] = S;
    assignments.push({ proposalEventId: assignments.length, syllableIndex: index, before: U, after: S, cause }); };
  const observed = proposal.explicitSecondary;
  const indices = marks.map((_, index) => index).filter(index => index !== trace.primary.selectedIndex && (rules.secondary.candidateWindow === "all-nonprimary" || index < 3));
  const skipped = marks.length <= 1 ? "monosyllabic" : !rules.secondary.enabled ? "disabled" : indices.length === 0 ? "no-candidates" : null;
  const candidates = skipped ? [] : indices.map(syllableIndex => ({ syllableIndex,
    weight: analysis[syllableIndex].operational.weight === "heavy" ? rules.secondary.heavyWeight : rules.secondary.lightWeight }));
  let selectedIndex = null, assigned = false;
  if (!skipped) {
    const draw = uniform(observed.selectionDraw); const total = candidates.reduce((sum, item) => sum + item.weight, 0); let cumulative = 0;
    selectedIndex = (candidates.find(candidate => { cumulative += candidate.weight; return draw * total < cumulative; }) ?? candidates.at(-1)).syllableIndex;
    assigned = uniform(observed.gateDraw) * 100 < rules.secondary.probability;
    if (assigned) assign(selectedIndex, { kind: "explicit-secondary" });
  }
  equal(observed, { enabled: rules.secondary.enabled, candidateWindow: rules.secondary.candidateWindow, probability: rules.secondary.probability,
    candidates, selectedIndex, assignedInProposal: assigned, selectionDraw: skipped ? null : observed.selectionDraw, gateDraw: skipped ? null : observed.gateDraw, skipped });
  const snapshots = [{ phase: "after-explicit-secondary", proposalEventCount: assignments.length, marks: [...marks] }];
  const iterations = [];
  if (rules.rhythmic.enabled) for (let index = 1; index < marks.length - 1; index++) {
    const iteration = proposal.rhythmic.iterations[iterations.length]; assert(iteration, "Missing proposal iteration");
    const already = marks[index] !== U;
    const neighbor = marks[index - 1] !== U || marks[index + 1] !== U;
    const skipped = already ? "already-marked" : rules.rhythmic.requireUnstressedNeighbors && neighbor ? "marked-neighbor" : null;
    const assigned = skipped ? false : uniform(iteration.draw) * 100 < rules.rhythmic.probability;
    iterations.push({ syllableIndex: index, before: marks[index], left: marks[index - 1], right: marks[index + 1], neighborCheckPerformed: !already,
      skipped, draw: skipped ? null : iteration.draw, assignedInProposal: assigned });
    if (assigned) assign(index, { kind: "rhythmic", iteration: iterations.length - 1 });
  }
  equal(proposal.rhythmic, { ...rules.rhythmic, iterations });
  snapshots.push({ phase: "after-rhythm", proposalEventCount: assignments.length, marks });
  equal(proposal, { target: "detached-proposal", sourceAppliedSnapshot: "root-after-primary", explicitSecondary: observed,
    rhythmic: { ...rules.rhythmic, iterations }, assignments, snapshots, secondaryCount: assignments.length });
  return { marks, count: assignments.length };
}
function sampleCheck(trace, rules, analysis, proposal) {
  const lambda = rules.rootPattern.lambda;
  const input = { beforePrimary: labels(trace.snapshots[0]), afterPrimary: labels(trace.snapshots[1]),
    operationalHeavy: analysis.map(item => item.operational.weight === "heavy"), secondary: { ...rules.secondary }, rhythmic: { ...rules.rhythmic }, lambda };
  equal(trace.rootPattern.policy, { model: "legacy-continuous-uniform-v1", score: "adjacent-marked-pairs", lambda,
    numericalContract: "binary64-log-chain-v1", countSource: "actual-legacy-proposal" });
  const observed = trace.rootPattern.sampling;
  const draws = [...observed.componentDraws, ...observed.backward.filter(step => step.kind === "drawn")];
  draws.forEach((draw, index) => { assert.equal(draw.drawOrdinal, index); uniform(draw.uniform); });
  let cursor = 0;
  const sample = createRootStressLaw(input).sample(proposal.count, () => {
    assert(cursor < draws.length, "Missing recorded sample draw"); return draws[cursor++].uniform;
  });
  assert.equal(cursor, draws.length, "Extra recorded sample draw");
  equal(observed, { algorithm: "component-mixture-backward-chain-v1", targetSecondaryCount: proposal.count,
    components: sample.count.components, logPartitionAtK: sample.count.logPartition.value,
    componentDraws: sample.componentDraws, selectedComponentIndex: sample.selectedComponentIndex, componentTermination: sample.componentTermination,
    backward: sample.backward, selectedPatternPriorLogMass: sample.selectedPatternPriorLogMass, selectedPatternConditionalLogMass: sample.selectedPatternConditionalLogMass });
  return { input, sample };
}
function formSnapshot(form) {
  return canonical({ written: form.written, phonemes: form.phonemes, syllableCount: form.syllableCount, syllables: form.syllables });
}
function morphologyCheck(word, trace, config, state) {
  const realization = word.trace.morphology?.realization;
  const realized = role => { const form = realization?.[role]?.resolved; return form && form.syllableCount !== 0 ? form.syllables?.length ?? 0 : 0; };
  const offset = realized("prefix"), suffix = realized("suffix");
  equal(trace.assembly, { rootSyllableStart: offset, prefixSyllables: offset, suffixSyllables: suffix });
  assert.equal(word.lexical.rootSyllableStart, offset);
  state.assemble(offset, suffix);
  const roles = ["prefix", "suffix"].filter(role => realization?.[role]);
  equal(trace.morphology.map(effect => effect.role), roles);
  for (const [id, effect] of trace.morphology.entries()) {
    const selection = realization[effect.role];
    const pool = config.morphology[effect.role === "prefix" ? "prefixes" : "suffixes"];
    const matches = pool.filter(affix => isDeepStrictEqual(formSnapshot(affix), canonical(selection.planned)));
    assert(matches.length > 0, "Unbound planned affix form");
    const effects = new Set(matches.map(affix => affix.stressEffect)); assert.equal(effects.size, 1); assert(effects.has(effect.effect));
    if (selection.allomorphIndex !== null) integer(selection.allomorphIndex, 0, Number.MAX_SAFE_INTEGER);
    assert(matches.some(affix => {
      if (selection.allomorphIndex === null) return isDeepStrictEqual(formSnapshot(affix), canonical(selection.resolved));
      const variant = affix.allomorphs?.[selection.allomorphIndex];
      if (!variant) return false;
      return isDeepStrictEqual(formSnapshot({ ...variant, written: variant.written ?? affix.written }), canonical(selection.resolved));
    }), "Resolved affix differs from its configured form");
    const indices = Array.from({ length: realized(effect.role) }, (_, index) => effect.role === "prefix" ? index : offset + trace.rootSyllableCount + index);
    const status = !indices.length ? "no-realized-syllables" : effect.effect === "none" ? "none" : effect.effect === "attract-preceding" && effect.role === "prefix" ? "prefix-attraction-not-applied" : effect.effect === "attract-preceding" && indices[0] === 0 ? "no-preceding-syllable" : "applied";
    const start = state.cursor();
    if (status === "applied") {
      if (effect.effect === "secondary") state.assign(indices[0], S, { kind: "morphology", effectId: id, action: "affix-secondary" });
      else {
        assert(["primary", "attract-preceding"].includes(effect.effect));
        for (const [index, mark] of state.marks().entries()) if (mark === P) state.assign(index, S, { kind: "morphology", effectId: id, action: "demote-primary" });
        state.assign(effect.effect === "primary" ? indices[0] : indices[0] - 1, P,
          { kind: "morphology", effectId: id, action: effect.effect === "primary" ? "affix-primary" : "preceding-primary" });
      }
    }
    equal(effect, { id, role: effect.role, effect: effect.effect, syllableIndices: indices, status,
      eventIds: Array.from({ length: state.cursor() - start }, (_, index) => start + index) });
  }
}
export function validateActive(word, config) {
  const trace = word.trace?.stressPattern; assert(trace && word.lexical);
  assert.equal(trace.version, 2); assert.equal(trace.execution, "count-conditioned-root-pattern"); assert.equal(trace.scope, "returned-attempt");
  assert.equal(Object.hasOwn(word.trace, "stressWeight"), false);
  const rules = resolveStressRules(config.pronunciation.stress);
  assert.equal(rules.rootPattern.type, "count-conditioned"); assert(rules.rootPattern.lambda > 0);
  integer(trace.rootSyllableCount, 1, 9);
  equal(trace.snapshots.map(snapshot => snapshot.domain), ACTIVE_DOMAINS);
  const [initial, primary, applied, assembled, lexical, surface] = trace.snapshots;
  assert.equal(initial.syllables.length, trace.rootSyllableCount); assert.equal(word.lexical.root.length, trace.rootSyllableCount);
  equal(soundShape(initial), stage(word, "applyStress", "before")); equal(soundShape(applied), stage(word, "applyStress", "after"));
  equal(soundShape(assembled), stage(word, "assembleMorphology", "after"));
  equal(soundShape(lexical), stage(word, "generatePronunciation", "before")); equal(soundShape(surface), stage(word, "generatePronunciation", "after"));
  equal(projectedSnapshot(lexical), projectedWord(word.lexical.syllables)); equal(projectedSnapshot(surface), projectedWord(word.syllables));
  for (const snapshot of [primary, applied]) equal(snapshot.syllables.map(segments), initial.syllables.map(segments));
  const analysis = weightInput(initial.syllables, rules.syllableWeight);
  equal(trace.weightInput, { domain: "root-before-primary", policy: rules.syllableWeight, syllables: analysis });
  let marks = Array(trace.rootSyllableCount).fill(U), origins = marks.map(() => ({ kind: U })), coordinates = "root", cursor = 0;
  const state = {
    marks: () => marks, cursor: () => cursor,
    assign(index, after, cause) {
      integer(index, 0, marks.length - 1);
      equal(trace.events[cursor], { id: cursor, coordinates, syllableIndex: index, before: marks[index], previousOrigin: origins[index], after, cause });
      marks[index] = after; origins[index] = { kind: "event", eventId: cursor++ };
    },
    snapshot(snapshot) { equal({ coordinates: snapshot.coordinates, eventCount: snapshot.eventCount, marks: labels(snapshot), origins: snapshot.syllables.map(syllable => syllable.origin) }, { coordinates, eventCount: cursor, marks, origins }); },
    assemble(prefix, suffix) { marks = [...Array(prefix).fill(U), ...marks, ...Array(suffix).fill(U)];
      origins = [...Array.from({ length: prefix }, () => ({ kind: U })), ...origins, ...Array.from({ length: suffix }, () => ({ kind: U }))]; coordinates = "word"; },
  };
  state.snapshot(initial); primaryCheck(trace, rules); state.assign(trace.primary.selectedIndex, P, { kind: "root-primary" }); state.snapshot(primary);
  const proposal = proposalCheck(trace, rules, analysis); const { input, sample } = sampleCheck(trace, rules, analysis, proposal);
  assert.equal(trace.rootPattern.decisionId, 0);
  const indices = sample.marks.flatMap((mark, index) => mark === S ? [index] : []); const eventIds = [];
  for (const index of indices) { eventIds.push(cursor); state.assign(index, S, { kind: "root-pattern-sampler", decisionId: 0 }); }
  state.snapshot(applied); equal(sample.marks, marks);
  const adjacency = marks.slice(1).filter((mark, index) => mark !== U && marks[index] !== U).length;
  equal(trace.rootPattern.application, { secondaryIndices: indices, appliedEventIds: eventIds, adjacentMarkedPairs: adjacency });
  morphologyCheck(word, trace, config, state);
  for (const snapshot of [assembled, lexical, surface]) state.snapshot(snapshot);
  assert.equal(trace.events.length, cursor);
  return { input, secondaryCount: proposal.count, proposalMarks: [...proposal.marks], appliedMarks: [...sample.marks] };
}
export function validateControl(word, config) {
  assert.equal(word.trace?.stressPattern?.version, 1); validatePattern(word); validateConfiguration(word, config);
  const trace = word.trace.stressPattern; const rules = resolveStressRules(config.pronunciation.stress);
  integer(trace.rootSyllableCount, 1, 9);
  equal(word.trace.stressWeight.syllables, weightInput(trace.snapshots[0].syllables, rules.syllableWeight));
}

export function domainObservation(word) {
  const trace = word.trace.stressPattern;
  const domains = [...new Set([...ACTIVE_DOMAINS, "root-after-explicit-secondary", "root-after-rhythmic"])];
  return Object.fromEntries(domains.map(domain => {
    const snapshot = trace.snapshots.find(value => value.domain === domain);
    if (!snapshot) return [domain, { availability: "unavailable" }];
    return [domain, analyzeStressPattern({ availability: "observed", marks: labels(snapshot) })];
  }));
}
