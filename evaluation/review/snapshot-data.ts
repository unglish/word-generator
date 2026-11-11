import { createHash } from "node:crypto";
import { supportedRubric } from "./protocol.js";
import type { Json, Snapshot } from "./model.js";

export function canonical(value: unknown): Json {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof RegExp)
    return { $type: "RegExp", source: value.source, flags: value.flags };
  if (value instanceof Map) {
    const entries = [...value].map(([key, item]) => [
      canonical(key),
      canonical(item),
    ]);
    entries.sort((a, b) =>
      JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]), "en"),
    );
    return { $type: "Map", entries };
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  throw new Error(`Cannot snapshot value of type ${typeof value}`);
}

export function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function validateSnapshot(snapshot: Snapshot): void {
  const { manifest, samples } = snapshot;
  if (
    manifest.schema_version !== 1 ||
    !supportedRubric(manifest.rubric) ||
    !samples.length ||
    samples.length !== manifest.sample_count ||
    !Number.isInteger(manifest.session_length) ||
    manifest.session_length < 1 ||
    manifest.session_length > 20 ||
    digest(manifest.generator.source_files) !==
      manifest.generator.source_digest ||
    digest({ manifest, words: samples.map((sample) => sample.word) }) !==
      snapshot.digest
  ) {
    throw new Error("Invalid snapshot manifest or digest.");
  }
  samples.forEach((sample, index) => {
    if (
      sample.id !== digest([snapshot.digest, index]) ||
      sample.draw_index !== index ||
      sample.study_id !== manifest.study_id ||
      !sample.spelling ||
      sample.spelling !== sample.word.written.clean ||
      !sample.word.trace
    )
      throw new Error(`Invalid sample at draw ${index}.`);
  });
}
