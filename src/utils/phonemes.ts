import { Phoneme } from "../types.js";

const OBSTRUENT_MANNERS = new Set([
  "stop",
  "fricative",
  "affricate",
  "sibilant",
]);

export function isObstruent(p: Phoneme): boolean {
  return OBSTRUENT_MANNERS.has(p.mannerOfArticulation);
}

export function isNasal(p: Phoneme): boolean {
  return p.mannerOfArticulation === "nasal";
}

export function isStop(p: Phoneme): boolean {
  return p.mannerOfArticulation === "stop";
}

export interface PhonemeSelector {
  sounds?: readonly string[];
  manner?: readonly string[];
  place?: readonly string[];
  voiced?: boolean;
}

export function matchesPhoneme(
  phoneme: Phoneme,
  selector: PhonemeSelector,
): boolean {
  if (selector.sounds && !selector.sounds.includes(phoneme.sound)) return false;
  if (
    selector.manner &&
    !selector.manner.includes(phoneme.mannerOfArticulation)
  )
    return false;
  if (selector.place && !selector.place.includes(phoneme.placeOfArticulation))
    return false;
  if (selector.voiced !== undefined && selector.voiced !== phoneme.voiced)
    return false;
  return true;
}
