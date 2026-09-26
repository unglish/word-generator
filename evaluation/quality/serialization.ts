import { createHash } from "node:crypto";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface SourceFile { path: string; content: string }

// Keep the benchmark's serialization contract independent of evolving review studies.
export function canonical(value: unknown): Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof RegExp) return { $type: "RegExp", source: value.source, flags: value.flags };
  if (value instanceof Map) {
    const entries = [...value].map(([key, item]) => [canonical(key), canonical(item)]);
    entries.sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]), "en"));
    return { $type: "Map", entries };
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  }
  throw new Error(`Cannot snapshot value of type ${typeof value}`);
}

export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
