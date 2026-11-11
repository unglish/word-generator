import { canonical, digest } from "./snapshot-data.js";
export { canonical, digest, validateSnapshot } from "./snapshot-data.js";
import { execFileSync } from "node:child_process";
import { readdir, readFile, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { englishConfig, generateWords } from "../../src/index.js";
import { RUBRIC } from "./protocol.js";
import type { Manifest, Snapshot, SourceFile } from "./model.js";

async function sourceFiles(
  root: string,
  directory = "src",
): Promise<SourceFile[]> {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const files: SourceFile[] = [];
  for (const entry of entries.sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  )) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await sourceFiles(root, path)));
    else if (/\.(ts|js)$/.test(path) && !/\.(test|bench)\./.test(path)) {
      files.push({ path, content: await readFile(join(root, path), "utf8") });
    }
  }
  return files;
}

export async function freezeStudy(
  root: string,
  studyId: string,
  seed = 20260904,
  count = 200,
  sessionLength = 20,
): Promise<Snapshot> {
  root = await realpath(root);
  const moduleRoot = await realpath(
    resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
  );
  if (root !== moduleRoot)
    throw new Error(
      "Freeze the study with the generator module from its measured checkout.",
    );
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(studyId))
    throw new Error(
      "Study ID must contain lowercase letters, digits, or hyphens (max 80).",
    );
  if (
    !Number.isSafeInteger(seed) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 10000
  )
    throw new Error("Invalid seed or sample count.");
  if (
    !Number.isInteger(sessionLength) ||
    sessionLength < 1 ||
    sessionLength > 20
  )
    throw new Error("Session length must be 1–20.");
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  const sources = await sourceFiles(root);
  const packageJson = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  );
  const manifest: Manifest = {
    schema_version: 1,
    study_id: studyId,
    rubric: RUBRIC,
    session_length: sessionLength,
    sample_count: count,
    options: { seed, mode: "lexicon", morphology: true, trace: true },
    effective_config: canonical(englishConfig),
    generator: {
      package_version: packageJson.version,
      commit: git("rev-parse", "HEAD").trim(),
      dirty: git("status", "--porcelain", "--", "src").trim().length > 0,
      source_digest: digest(sources),
      source_files: sources,
      patch: git("diff", "HEAD", "--", "src"),
    },
  };
  const words = generateWords(count, manifest.options);
  if (
    digest(await sourceFiles(root)) !== manifest.generator.source_digest ||
    git("rev-parse", "HEAD").trim() !== manifest.generator.commit
  ) {
    throw new Error("Generator source changed during study capture.");
  }
  const snapshotDigest = digest({ manifest, words });
  return {
    manifest,
    digest: snapshotDigest,
    samples: words.map((word, draw_index) => ({
      id: digest([snapshotDigest, draw_index]),
      study_id: studyId,
      draw_index,
      spelling: word.written.clean,
      word,
    })),
  };
}
