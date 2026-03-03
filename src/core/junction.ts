import type { LanguageConfig } from "../config/language.js";
import { sonorityClass } from "../config/language.js";
import type { Phoneme } from "../types.js";

export type SspViolation = "rule1" | "rule2" | "rule3" | "multi";

function mannerGroup(p: Phoneme): string {
  const m = p.mannerOfArticulation;
  if (m === "sibilant") return "fricative";
  if (m === "lateralApproximant") return "liquid";
  return m;
}

function isCoronal(p: Phoneme): boolean {
  const place = p.placeOfArticulation;
  return place === "alveolar" || place === "postalveolar" || place === "dental";
}

function placeGroup(p: Phoneme): string {
  const place = p.placeOfArticulation;
  if (place === "bilabial" || place === "labiodental" || place === "labial-velar") return "labial";
  if (place === "dental" || place === "alveolar" || place === "postalveolar") return "coronal";
  if (place === "palatal" || place === "velar") return "dorsal";
  return place;
}

function isSspExceptionSound(sound: string): boolean {
  return sound === "s";
}

export function hasRisingCodaTowardBoundary(coda: Phoneme[], config: LanguageConfig): boolean {
  if (coda.length < 2) return false;
  for (let i = 0; i < coda.length - 1; i++) {
    if (sonorityClass(coda[i], config) < sonorityClass(coda[i + 1], config)) {
      return true;
    }
  }
  return false;
}

function getSspViolations(
  coda: Phoneme[],
  onset: Phoneme[],
  config: LanguageConfig,
): { rule1: boolean; rule2: boolean; rule3: boolean } {
  if (coda.length === 0 || onset.length === 0) {
    return { rule1: false, rule2: false, rule3: false };
  }

  const totalLen = coda.length + onset.length;
  if (totalLen <= 2) {
    return { rule1: false, rule2: false, rule3: false };
  }

  const codaEnd = sonorityClass(coda[coda.length - 1], config);
  const onsetStart = sonorityClass(onset[0], config);

  const rule1 = hasRisingCodaTowardBoundary(coda, config);
  const rule2 = codaEnd === onsetStart &&
    !isSspExceptionSound(coda[coda.length - 1].sound) &&
    !isSspExceptionSound(onset[0].sound);
  const rule3 = onsetStart > codaEnd && !isSspExceptionSound(onset[0].sound);

  return { rule1, rule2, rule3 };
}

export function classifySspViolation(
  coda: Phoneme[],
  onset: Phoneme[],
  config: LanguageConfig,
): SspViolation | null {
  const { rule1, rule2, rule3 } = getSspViolations(coda, onset, config);
  const count = (rule1 ? 1 : 0) + (rule2 ? 1 : 0) + (rule3 ? 1 : 0);
  if (count === 0) return null;
  if (count > 1) return "multi";
  if (rule1) return "rule1";
  if (rule2) return "rule2";
  return "rule3";
}

function isJunctionSonorityValid(
  coda: Phoneme[],
  onset: Phoneme[],
  config: LanguageConfig,
): boolean {
  if (coda.length === 0 || onset.length === 0) return true;

  const totalLen = coda.length + onset.length;
  if (totalLen <= 2) return true;

  // Onset must rise (not fall) internally, with the /s/ exception.
  for (let i = 0; i < onset.length - 1; i++) {
    const left = sonorityClass(onset[i], config);
    const right = sonorityClass(onset[i + 1], config);
    if (left > right && !isSspExceptionSound(onset[i].sound) && !isSspExceptionSound(onset[i + 1].sound)) {
      return false;
    }
  }

  const { rule1, rule2, rule3 } = getSspViolations(coda, onset, config);
  return !(rule1 || rule2 || rule3);
}

function isJunctionValid(C1: Phoneme, C2: Phoneme, onsetCluster: Phoneme[]): boolean {
  // F1: identical phonemes
  if (C1.sound === C2.sound) return false;

  // F2: same mannerGroup AND same exact place of articulation
  if (mannerGroup(C1) === mannerGroup(C2) && C1.placeOfArticulation === C2.placeOfArticulation) return false;

  // F3: stop+stop where neither is coronal
  if (mannerGroup(C1) === "stop" && mannerGroup(C2) === "stop" && !isCoronal(C1) && !isCoronal(C2)) return false;

  // F4: stop+stop voicing disagreement
  if (mannerGroup(C1) === "stop" && mannerGroup(C2) === "stop" && C1.voiced !== C2.voiced) return false;

  // P1: s-exception
  if (C1.sound === "s") return true;
  if (C2.sound === "s" && onsetCluster.length >= 2 && ["t", "p", "k"].includes(onsetCluster[1]?.sound)) return true;
  if (onsetCluster.length >= 2 && onsetCluster[0].sound === "s" && ["t", "p", "k"].includes(onsetCluster[1].sound)) return true;

  // P2: coronal onset
  if (isCoronal(C2)) return true;

  // P3: homorganic nasal+stop
  if (mannerGroup(C1) === "nasal" && mannerGroup(C2) === "stop" && placeGroup(C1) === placeGroup(C2)) return true;

  // P4: manner change
  if (mannerGroup(C1) !== mannerGroup(C2)) return true;

  // P5: place change
  if (placeGroup(C1) !== placeGroup(C2)) return true;

  return false;
}

export function validateJunction(
  coda: Phoneme[],
  onset: Phoneme[],
  config: LanguageConfig,
): boolean {
  if (coda.length === 0 || onset.length === 0) return true;

  const C1 = coda[coda.length - 1];
  const C2 = onset[0];
  if (!isJunctionValid(C1, C2, onset)) return false;
  if (!isJunctionSonorityValid(coda, onset, config)) return false;
  return true;
}
