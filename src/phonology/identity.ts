/** Observational identities for existing segmented outputs; never used by generation. */
export const PHONEME_IDENTITY_CONTRACT = Object.freeze({
  version: "phoneme-identity-v1",
  inventory: "english-legacy-v1",
  reference: "rhotic-general-american-reference-v1",
  referenceStatus: "provisional; not a declaration that the legacy generator implements this dialect",
  quantity: "unspecified; legacy tense does not establish duration or mora count",
});

export interface IdentityEntry {
  readonly id: string;
  readonly sound: string;
  readonly kind: "vowel" | "consonant";
  readonly legacyArpabet: string;
  readonly interpretation: "resolved" | "ambiguous";
}

function entry(sound: string, legacyArpabet: string, kind: IdentityEntry["kind"]): IdentityEntry {
  const codepoints = Array.from(sound, letter => letter.codePointAt(0)!.toString(16)).join("-");
  return Object.freeze({ id: `english-legacy:${codepoints}`, sound, kind, legacyArpabet,
    interpretation: sound === "ɜ" ? "ambiguous" : "resolved" });
}

/** Source identities stay distinct even when a legacy scoring projection merges them. */
export const LEGACY_ENGLISH_IDENTITIES: readonly IdentityEntry[] = Object.freeze([
  entry("i:", "IY", "vowel"), entry("ɪ", "IH", "vowel"), entry("ɛ", "EH", "vowel"),
  entry("ə", "AH", "vowel"), entry("ɜ", "ER", "vowel"), entry("ɚ", "ER", "vowel"),
  entry("æ", "AE", "vowel"), entry("ɑ", "AA", "vowel"), entry("ɔ", "AO", "vowel"),
  entry("ʊ", "UH", "vowel"), entry("u", "UW", "vowel"), entry("ʌ", "AH", "vowel"),
  entry("eɪ", "EY", "vowel"), entry("aɪ", "AY", "vowel"), entry("əʊ", "OW", "vowel"),
  entry("ɔɪ", "OY", "vowel"), entry("aʊ", "AW", "vowel"),
  entry("j", "Y", "consonant"), entry("w", "W", "consonant"), entry("l", "L", "consonant"),
  entry("r", "R", "consonant"), entry("m", "M", "consonant"), entry("n", "N", "consonant"),
  entry("ŋ", "NG", "consonant"), entry("f", "F", "consonant"), entry("θ", "TH", "consonant"),
  entry("h", "HH", "consonant"), entry("v", "V", "consonant"), entry("ð", "DH", "consonant"),
  entry("z", "Z", "consonant"), entry("ʒ", "ZH", "consonant"), entry("s", "S", "consonant"),
  entry("ʃ", "SH", "consonant"), entry("tʃ", "CH", "consonant"), entry("dʒ", "JH", "consonant"),
  entry("p", "P", "consonant"), entry("t", "T", "consonant"), entry("k", "K", "consonant"),
  entry("b", "B", "consonant"), entry("d", "D", "consonant"), entry("g", "G", "consonant"),
]);

const bySound = new Map(LEGACY_ENGLISH_IDENTITIES.map(item => [item.sound, item]));
const byArpabet = new Map(LEGACY_ENGLISH_IDENTITIES.map(item => [item.legacyArpabet, item.kind]));
const notationAliases = new Map([["iː", "i:"], ["ɡ", "g"]]);
// These two extra keys already exist in the old helper, but are not inventory identities.
const coarseExtras = new Map([["e", "EH"], ["o", "OW"]]);
const mergedCodes = new Set(["AH", "ER", "EH", "OW"]);

export interface ObservedPhoneInput {
  readonly sound: string;
  readonly aspirated?: boolean;
  readonly reduced?: boolean;
  readonly tense?: boolean;
}
export interface ObservedWordInput {
  readonly syllables: readonly {
    readonly onset: readonly ObservedPhoneInput[];
    readonly nucleus: readonly ObservedPhoneInput[];
    readonly coda: readonly ObservedPhoneInput[];
    readonly stress?: string;
  }[];
}
export interface IdentityObservationOptions {
  /** Custom inventories must opt in to this interpretation; strings alone do not declare a dialect. */
  sourceProfile: "english-legacy-v1" | "unclassified";
  layer: "surface" | "lexical" | "unknown";
}
export type Recorded<T> = { status: "recorded"; value: T } | { status: "unknown" };
export interface StressObservation {
  mark: "primary" | "secondary" | "unmarked" | "invalid";
  raw: string | null;
}
export interface SegmentObservation {
  coordinates: { syllable: number; slot: "onset" | "nucleus" | "coda"; index: number };
  rawSound: string;
  baseSound: string;
  notationAlias: boolean;
  symbolAspiration: boolean;
  identity: { status: "resolved" | "ambiguous" | "unknown"; id: string | null; kind: IdentityEntry["kind"] | null };
  stress: StressObservation;
  slotCompatible: boolean;
  recorded: { aspiration: Recorded<boolean>; reduction: Recorded<boolean>; legacyTense: Recorded<boolean> };
  /** A surface reduced flag does not recover its lexical source. No lineage is inferred here. */
  underlyingIdentity: { status: "unknown" };
}
export interface WordIdentityObservation {
  contractVersion: string;
  sourceProfile: IdentityObservationOptions["sourceProfile"];
  layer: IdentityObservationOptions["layer"];
  syllables: { stress: StressObservation; nucleusSize: number }[];
  segments: SegmentObservation[];
}

function recorded<T>(value: T | undefined): Recorded<T> {
  return value === undefined ? { status: "unknown" } : { status: "recorded", value };
}

function observeStress(raw: string | undefined): StressObservation {
  if (raw === undefined) return { mark: "unmarked", raw: null };
  if (raw === "ˈ") return { mark: "primary", raw };
  if (raw === "ˌ") return { mark: "secondary", raw };
  return { mark: "invalid", raw };
}

/** Does not infer stress zero from an absent mark, or parse an entire IPA string. */
export function observeWordIdentity(word: ObservedWordInput, options: IdentityObservationOptions): WordIdentityObservation {
  const segments: SegmentObservation[] = [];
  const syllables = word.syllables.map((syllable, si) => {
    const stress = observeStress(syllable.stress);
    for (const slot of ["onset", "nucleus", "coda"] as const) {
      syllable[slot].forEach((phone, index) => {
        // Only a single final aspiration mark is recognized. Other modifiers remain unsupported.
        const symbolAspiration = phone.sound.endsWith("ʰ");
        const withoutAspiration = symbolAspiration ? phone.sound.slice(0, -1) : phone.sound;
        const alias = options.sourceProfile === "english-legacy-v1" ? notationAliases.get(withoutAspiration) : undefined;
        const baseSound = alias ?? withoutAspiration;
        const identity = options.sourceProfile === "english-legacy-v1" ? bySound.get(baseSound) : undefined;
        segments.push({
          coordinates: { syllable: si, slot, index }, rawSound: phone.sound, baseSound,
          notationAlias: alias !== undefined, symbolAspiration,
          identity: { status: identity?.interpretation ?? "unknown", id: identity?.id ?? null, kind: identity?.kind ?? null },
          stress: { ...stress }, slotCompatible: identity !== undefined && (slot === "nucleus") === (identity.kind === "vowel"),
          recorded: { aspiration: recorded(phone.aspirated), reduction: recorded(phone.reduced), legacyTense: recorded(phone.tense) },
          underlyingIdentity: { status: "unknown" },
        });
      });
    }
    return { stress, nucleusSize: syllable.nucleus.length };
  });
  return { contractVersion: PHONEME_IDENTITY_CONTRACT.version, sourceProfile: options.sourceProfile, layer: options.layer, syllables, segments };
}

export interface CoarseProjectionItem {
  sourceIndex: number;
  token: string | null;
  losses: {
    aspiration: boolean;
    stress: boolean;
    mergedIdentity: boolean;
    unresolvedIdentity: boolean;
  };
}

/** Reproduces the old symbol mapping, with aligned nulls instead of deleting unknown segments. */
export function projectLegacyArpabet(observation: WordIdentityObservation): {
  projection: "legacy-arpabet-v1"; complete: boolean; boundaries: "erased"; items: CoarseProjectionItem[];
} {
  const items = observation.segments.map((segment, sourceIndex) => {
    const key = segment.rawSound.replace(/ʰ/g, "");
    const token = bySound.get(key)?.legacyArpabet ?? coarseExtras.get(key) ?? null;
    return { sourceIndex, token, losses: {
      aspiration: segment.rawSound.includes("ʰ") || (segment.recorded.aspiration.status === "recorded" && segment.recorded.aspiration.value),
      stress: segment.coordinates.slot === "nucleus",
      mergedIdentity: token !== null && mergedCodes.has(token),
      unresolvedIdentity: segment.identity.status !== "resolved",
    } };
  });
  return { projection: "legacy-arpabet-v1", complete: items.every(item => item.token !== null), boundaries: "erased", items };
}

/** Identity/stress representation, not a score and not a claim of CMU equivalence. */
export function projectIdentityStress(observation: WordIdentityObservation): {
  projection: "identity-stress-v1"; identityComplete: boolean; stressComplete: boolean; structureSupported: boolean;
  items: { sourceIndex: number; identityId: string | null; stress: StressObservation["mark"] | "not-applicable" }[];
} {
  return {
    projection: "identity-stress-v1",
    identityComplete: observation.segments.every(segment => segment.identity.status === "resolved"),
    stressComplete: observation.syllables.every(syllable => syllable.stress.mark === "primary" || syllable.stress.mark === "secondary"),
    structureSupported: observation.syllables.length > 0 && observation.syllables.every(syllable => syllable.nucleusSize > 0) && observation.segments.every(segment => segment.slotCompatible),
    items: observation.segments.map((segment, sourceIndex) => ({ sourceIndex, identityId: segment.identity.id,
      stress: segment.coordinates.slot === "nucleus" ? segment.stress.mark : "not-applicable" })),
  };
}

export type CmuTokenObservation =
  | { status: "parsed"; raw: string; base: string; kind: "vowel"; stress: "unstressed" | "primary" | "secondary" }
  | { status: "parsed"; raw: string; base: string; kind: "consonant"; stress: "not-applicable" }
  | { status: "unsupported"; raw: string };

/** Retains CMU's own categories. AH0/ER0 are not asserted to identify unique lexical IPA vowels. */
export function observeCmuToken(raw: string): CmuTokenObservation {
  const match = /^([A-Z]+)([012])?$/.exec(raw);
  if (!match) return { status: "unsupported", raw };
  const [, base, digit] = match;
  const kind = byArpabet.get(base);
  if (kind === "consonant" && digit === undefined) return { status: "parsed", raw, base, kind, stress: "not-applicable" };
  if (kind === "vowel" && digit !== undefined) {
    const stress = digit === "0" ? "unstressed" : digit === "1" ? "primary" : "secondary";
    return { status: "parsed", raw, base, kind, stress };
  }
  return { status: "unsupported", raw };
}
