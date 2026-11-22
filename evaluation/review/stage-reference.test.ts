import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { jsonDigest } from "../corpus/identity.js";

const root = resolve(import.meta.dirname, "../..");
const pins: Record<string, string> = JSON.parse(readFileSync(resolve(root, "evaluation/corpus/stage-reference-pins.json"), "utf8"));

it("pins the builder, its transition and coda inputs, and both generated stage references", () => {
  expect(Object.keys(pins)).toEqual([
    "evaluation/corpus/stage-reference.py",
    "evaluation/corpus/root-coda-exclusions.json",
    "evaluation/corpus/stage-transitions.json",
    "evaluation/corpus/stage-references.json",
    "src/config/lexicon-reference.ts",
  ]);
  for (const [file, sha256] of Object.entries(pins)) {
    expect(createHash("sha256").update(readFileSync(resolve(root, file))).digest("hex"), file).toBe(sha256);
  }
  const transitions = JSON.parse(readFileSync(resolve(root, "evaluation/corpus/stage-transitions.json"), "utf8"));
  expect(jsonDigest(transitions.counts)).toBe(transitions.countsDigest);
  expect(Object.keys(transitions.counts)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
});
