import { sha256 } from "../review/wordlikeness/model.js";

/** JSON-only canonical identity; rejects values silently lost by JSON.stringify. */
export function canonicalJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (typeof value === "object" && value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => [key, canonicalJson(entry)]));
  }
  throw new Error("Corpus identities require finite JSON values.");
}
export const jsonDigest = (value: unknown): string => sha256(JSON.stringify(canonicalJson(value)));
