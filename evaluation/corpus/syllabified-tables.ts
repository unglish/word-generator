import { contexts, contextKey, type ReferenceModel } from "../review/wordlikeness/model.js";
import { addCount, histogram, type Histogram } from "./joint.js";
import { nativePairs, type Syllabification } from "./syllabified-reference.js";
import type { MappedPhone } from "./variety-adapter.js";

type Tables = Record<string, Histogram>;

function addLiteralCount(table: Histogram, key: string, weight: number) {
  if (!Object.hasOwn(table.counts, key)) {
    Object.defineProperty(table.counts, key, { value: 0, enumerable: true, writable: true, configurable: true });
  }
  addCount(table, key, weight);
}

function add(tables: Tables, context: string, key: string, weight: number) {
  addLiteralCount(tables[context] ??= histogram(), key, weight);
}

function hasObservedStress(phone: MappedPhone) {
  return typeof phone.stress === "number";
}

function hasComparisonProjection(phones: readonly MappedPhone[]) {
  return phones.every(phone => phone.comparison !== null &&
    (phone.kind === "consonant" ? phone.stress === "not-applicable" : phone.kind === "vowel" && hasObservedStress(phone)));
}

export function compatibilityConstituents(tables: ReferenceModel["constituents"], phones: readonly MappedPhone[],
  analysis: Syllabification, weight: number) {
  if (analysis.status === "unavailable") return;
  if (analysis.syllables.some(syllable => syllable.nucleus.length !== 1)) {
    throw new Error("#304 constituents require exactly one nucleus phone per syllable.");
  }
  if (!hasComparisonProjection(phones)) {
    throw new Error("#304 constituents require a complete CMU comparison projection and explicit stress.");
  }
  analysis.syllables.forEach(({ onset, nucleus, coda }, index) => {
    const stress = phones[nucleus[0]].stress;
    const [onsetContext, rimeContext] = contexts(index, analysis.syllables.length, stress === 1 || stress === 2);
    add(tables, contextKey(onsetContext), onset.map(i => phones[i].comparison).join(" "), weight);
    add(tables, contextKey(rimeContext), [...nucleus, ...coda].map(i => phones[i].comparison).join(" "), weight);
  });
}

export function createConstituentTables() {
  return {
    rows: histogram(), unavailableReasons: histogram(), nativePhones: histogram(), nativeAdjacentPairs: histogram(), nativeBoundedPairs: histogram(),
    reconstructedNativePhones: histogram(), reconstructedNativeBoundedPairs: histogram(),
    mapping: histogram(), onset: { permitted: {} as Tables, withheld: {} as Tables },
    rime: { permitted: {} as Tables, withheld: {} as Tables }, completeCase: {
      rows: histogram(), phones: histogram(), adjacentPairs: histogram(),
    }, compatibility: {} as Tables,
  };
}

type ConstituentTables = ReturnType<typeof createConstituentTables>;

function addPairs(target: Histogram, phones: readonly MappedPhone[], weight: number, includeEdges: boolean) {
  for (const [left, right] of nativePairs(phones)) {
    if (includeEdges || (left !== "#" && right !== "#")) addLiteralCount(target, `${left} ${right}`, weight);
  }
}

/** E2 handoff. Keys retain source stress and fitted identities. Withheld cells retain native tokens. */
export function countConstituents(tables: ConstituentTables, phones: readonly MappedPhone[],
  analysis: Syllabification, weight: number) {
  if (!Number.isSafeInteger(weight) || weight <= 0) throw new Error("Constituent weights must be positive safe integers.");
  const reconstructed = analysis.status === "unavailable" ? [] : analysis.syllables.flatMap(({ onset, nucleus, coda }) =>
    [...onset, ...nucleus, ...coda].map(i => phones[i]));
  if (analysis.status !== "unavailable" && (reconstructed.length !== phones.length || reconstructed.some((phone, index) => phone?.index !== index))) {
    throw new Error("Syllables must preserve every input position in order.");
  }
  if (analysis.status === "inferred" && hasComparisonProjection(phones)) {
    compatibilityConstituents(tables.compatibility, phones, analysis, weight);
  }
  addCount(tables.rows, analysis.status, weight);
  if (analysis.status === "unavailable") addCount(tables.unavailableReasons, analysis.reason, weight);
  addPairs(tables.nativeBoundedPairs, phones, weight, true);
  addPairs(tables.nativeAdjacentPairs, phones, weight, false);
  for (const phone of phones) {
    addLiteralCount(tables.nativePhones, phone.raw, weight);
    addLiteralCount(tables.mapping, `${phone.raw}|${phone.fit.status}`, weight);
  }
  if (phones.every(phone => phone.fit.status === "permitted")) {
    addCount(tables.completeCase.rows, analysis.status, weight);
    for (const phone of phones) addLiteralCount(tables.completeCase.phones, phone.raw, weight);
    addPairs(tables.completeCase.adjacentPairs, phones, weight, false);
  }
  if (analysis.status === "unavailable") return;
  for (const phone of reconstructed) addLiteralCount(tables.reconstructedNativePhones, phone.raw, weight);
  addPairs(tables.reconstructedNativeBoundedPairs, reconstructed, weight, true);

  analysis.syllables.forEach(({ onset, nucleus, coda }, index) => {
    const stress = nucleus.map(i => phones[i].stress).join("+");
    const onsetContext = `${index === 0 ? "initial" : "medial"}:${stress}`;
    const rimeContext = `${index === analysis.syllables.length - 1 ? "final" : "medial"}:${stress}`;
    countSlot(tables.onset, onsetContext, phones, onset, nucleus, weight);
    countSlot(tables.rime, rimeContext, phones, [...nucleus, ...coda], nucleus, weight);
  });
}

function phonesAt(phones: readonly MappedPhone[], indices: readonly number[]) {
  return Array.from(indices, index => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= phones.length || !phones[index]) {
      throw new RangeError(`Invalid fitting phone index ${index} for a pronunciation of length ${phones.length}.`);
    }
    return phones[index];
  });
}

function fittedIdentities(phones: readonly MappedPhone[]) {
  const ids: string[] = [];
  for (const { fit } of phones) {
    if (fit.status !== "permitted") return null;
    ids.push(fit.identityId);
  }
  return ids;
}

/** Only the listed identities and stress observations are prerequisites for this fitting cell. */
export function fittingEvent(phones: readonly MappedPhone[], indices: readonly number[],
  conditioningIndices: readonly number[] = [], requiredStressIndices: readonly number[] = []) {
  const identities = fittedIdentities(phonesAt(phones, indices));
  const conditioning = fittedIdentities(phonesAt(phones, conditioningIndices));
  const stressKnown = phonesAt(phones, requiredStressIndices).every(hasObservedStress);
  return identities === null || conditioning === null || !stressKnown ? null : { identities, conditioning };
}

function countSlot(tables: ConstituentTables["onset"], context: string,
  phones: readonly MappedPhone[], indices: readonly number[], nucleus: readonly number[], weight: number) {
  const event = fittingEvent(phones, indices, [], nucleus);
  if (event) {
    add(tables.permitted, context, event.identities.join(" "), weight);
  } else {
    add(tables.withheld, context, indices.map(index => phones[index].raw).join(" "), weight);
  }
}
