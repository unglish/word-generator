import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { englishConfig, generateWords } from "../../src/index.js";
import { RUBRIC, supportedRubric } from "./protocol.js";
import type { Json, Manifest, Snapshot, SourceFile } from "./model.js";

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

async function sourceFiles(root: string, directory = "src"): Promise<SourceFile[]> {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const files: SourceFile[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await sourceFiles(root, path));
    else if (/\.(ts|js)$/.test(path) && !/\.(test|bench)\./.test(path)) {
      files.push({ path, content: await readFile(join(root, path), "utf8") });
    }
  }
  return files;
}

export async function freezeStudy(root: string, studyId: string, seed = 20260904, count = 200, sessionLength = 20): Promise<Snapshot> {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(studyId)) throw new Error("Study ID must contain lowercase letters, digits, or hyphens (max 80).");
  if (!Number.isSafeInteger(seed) || !Number.isInteger(count) || count < 1 || count > 10000) throw new Error("Invalid seed or sample count.");
  if (!Number.isInteger(sessionLength) || sessionLength < 1 || sessionLength > 20) throw new Error("Session length must be 1–20.");
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const sources = await sourceFiles(root);
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const manifest: Manifest = {
    schema_version: 1, study_id: studyId, rubric: RUBRIC, session_length: sessionLength, sample_count: count,
    options: { seed, mode: "lexicon", morphology: true, trace: true }, effective_config: canonical(englishConfig),
    generator: {
      package_version: packageJson.version, commit: git("rev-parse", "HEAD").trim(),
      dirty: git("status", "--porcelain", "--", "src").trim().length > 0,
      source_digest: digest(sources), source_files: sources, patch: git("diff", "HEAD", "--", "src"),
    },
  };
  const words = generateWords(count, manifest.options);
  if (new Set(words.map(word => word.written.clean)).size < sessionLength) throw new Error("Not enough distinct spellings for a session.");
  const snapshotDigest = digest({ manifest, words });
  return {
    manifest, digest: snapshotDigest,
    samples: words.map((word, draw_index) => ({ id: digest([snapshotDigest, draw_index]), study_id: studyId, draw_index, spelling: word.written.clean, word })),
  };
}

export function validateSnapshot(snapshot: Snapshot): void {
  const { manifest, samples } = snapshot;
  if (manifest.schema_version !== 1 || !supportedRubric(manifest.rubric) || samples.length !== manifest.sample_count ||
      !Number.isInteger(manifest.session_length) || manifest.session_length < 1 || manifest.session_length > 20 ||
      digest(manifest.generator.source_files) !== manifest.generator.source_digest ||
      digest({ manifest, words: samples.map(sample => sample.word) }) !== snapshot.digest) {
    throw new Error("Invalid snapshot manifest or digest.");
  }
  samples.forEach((sample, index) => {
    if (sample.id !== digest([snapshot.digest, index]) || sample.draw_index !== index || sample.study_id !== manifest.study_id ||
        !sample.spelling || sample.spelling !== sample.word.written.clean || !sample.word.trace) throw new Error(`Invalid sample at draw ${index}.`);
  });
  if (new Set(samples.map(sample => sample.spelling)).size < manifest.session_length) throw new Error("Insufficient distinct spellings.");
}
