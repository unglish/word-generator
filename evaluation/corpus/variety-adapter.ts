import {
  LEGACY_ENGLISH_IDENTITIES, PHONEME_IDENTITY_CONTRACT, observeWordIdentity,
  projectLegacyArpabet, type ObservedWordInput,
} from "../../src/phonology/identity.js";
import { CMU_REVISION, CMU_SHA256 } from "../review/wordlikeness/model.js";
import { parseCmuPhone, type CmuPhone } from "./cmu.js";

export const CMU_LEGACY_ENGLISH_V1 = {
  version: "cmu-legacy-english-v1",
  variety: "rhotic-general-american-reference-v1",
  source: { name: "CMU Pronouncing Dictionary", revision: CMU_REVISION, sha256: CMU_SHA256,
    transcription: "CMU ARPAbet with explicit vowel stress", layer: "dictionary-lexical" },
  target: PHONEME_IDENTITY_CONTRACT,
  fittingConvention: { AH0: "ə", AH1: "ʌ", AH2: "ʌ", OW: "əʊ" },
  ambiguous: { ER: ["ɜ", "ɚ"], disposition: "retain native event and withhold target identity" },
  comparisonOnly: ["e", "o"],
  narrowExport: "unsupported as a source of inventory identity",
  comparison: "#304 legacy ARPAbet projection",
  stress: "CMU 0/1/2 are observed; generated unmarked stress remains unmarked",
} as const;

type Stress = 0 | 1 | 2 | "unmarked" | "invalid" | "not-applicable" | "unavailable";

type Fit =
  | { status: "permitted"; sound: string; identityId: string; basis: "identity" | "convention" }
  | { status: "ambiguous"; alternatives: readonly { sound: string; identityId: string }[] }
  | { status: "unavailable"; reason: "unsupported-token" | "slot-mismatch" | "comparison-only" | "unavailable-stress" };

export interface MappedPhone {
  index: number;
  raw: string;
  kind: CmuPhone["kind"] | null;
  stress: Stress;
  sourceIdentityId: string | null;
  rawStress: string | null;
  fit: Fit;
  comparison: string | null;
  notationAlias: boolean;
}

const bySound = new Map(LEGACY_ENGLISH_IDENTITIES.map(identity => [identity.sound, identity]));
const byCode = new Map(LEGACY_ENGLISH_IDENTITIES.map(identity => [identity.legacyArpabet, identity]));
const rhoticAlternatives = Object.freeze(LEGACY_ENGLISH_IDENTITIES.filter(identity => identity.legacyArpabet === "ER")
  .map(({ sound, id }) => Object.freeze({ sound, identityId: id })));

function fitCmu(phone: CmuPhone): Fit {
  if (phone.base === "ER") return { status: "ambiguous", alternatives: rhoticAlternatives };
  const convention = CMU_LEGACY_ENGLISH_V1.fittingConvention;
  const sound = phone.base === "AH" && phone.kind === "vowel"
    ? convention[`AH${phone.stress}`]
    : phone.base === "OW" ? convention.OW : undefined;
  const identity = sound ? bySound.get(sound) : byCode.get(phone.base);
  if (!identity) return { status: "unavailable", reason: "unsupported-token" };
  return { status: "permitted", sound: identity.sound, identityId: identity.id,
    basis: sound ? "convention" : "identity" };
}

export function mapCmuTokens(tokens: readonly string[]): MappedPhone[] {
  return tokens.map((raw, index) => {
    const phone = parseCmuPhone(raw);
    return {
      index, raw, kind: phone?.kind ?? null,
      stress: phone?.kind === "vowel" ? phone.stress : phone ? "not-applicable" : "unavailable",
      sourceIdentityId: null,
      rawStress: phone?.kind === "vowel" ? raw.slice(-1) : null,
      fit: phone ? fitCmu(phone) : { status: "unavailable", reason: "unsupported-token" },
      comparison: phone?.base ?? null,
      notationAlias: false,
    };
  });
}

function generatedStress(mark: "primary" | "secondary" | "unmarked" | "invalid"): Stress {
  if (mark === "primary") return 1;
  if (mark === "secondary") return 2;
  return mark;
}

export function mapLegacyRoot(root: ObservedWordInput): MappedPhone[] {
  const observation = observeWordIdentity(root, { sourceProfile: "english-legacy-v1", layer: "lexical" });
  const coarse = projectLegacyArpabet(observation);
  return observation.segments.map((segment, index) => {
    const identity = bySound.get(segment.baseSound);
    const nucleus = segment.coordinates.slot === "nucleus";
    const stress = nucleus ? generatedStress(segment.stress.mark) : "not-applicable";
    const comparison = coarse.items[index].token;
    let fit: Fit;
    if (!identity) fit = { status: "unavailable", reason: comparison ? "comparison-only" : "unsupported-token" };
    else if (!segment.slotCompatible) fit = { status: "unavailable", reason: "slot-mismatch" };
    else if (identity.interpretation === "ambiguous") fit = { status: "ambiguous", alternatives: rhoticAlternatives };
    else if (stress === "unmarked" || stress === "invalid") fit = { status: "unavailable", reason: "unavailable-stress" };
    else fit = { status: "permitted", sound: identity.sound, identityId: identity.id, basis: "identity" };
    return { index, raw: segment.rawSound, kind: segment.identity.kind, stress, sourceIdentityId: segment.identity.id,
      rawStress: nucleus ? segment.stress.raw : null, fit, comparison, notationAlias: segment.notationAlias };
  });
}

export interface VarietyAdapter {
  descriptor: { version: string; variety: string };
  mapReference(tokens: readonly string[]): MappedPhone[];
  mapGenerated(root: ObservedWordInput): MappedPhone[];
}

export const cmuLegacyEnglishAdapter = {
  descriptor: CMU_LEGACY_ENGLISH_V1,
  mapReference: mapCmuTokens,
  mapGenerated: mapLegacyRoot,
} satisfies VarietyAdapter;
