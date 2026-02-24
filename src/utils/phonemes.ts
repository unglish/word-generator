import { Phoneme } from "../types.js";

const OBSTRUENT_MANNERS = new Set([
  "stop", "fricative", "affricate", "sibilant",
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
