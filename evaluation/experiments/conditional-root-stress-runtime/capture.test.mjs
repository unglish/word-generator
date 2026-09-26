import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { captureConfigured, validateOutputLocation } from "./capture.mjs";

test("capture publication refuses source/proof trees through lexical and aliased paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "q09-capture-path-"));
  try {
    const root = join(directory, "root"); const original = join(directory, "original");
    await mkdir(join(root, "src"), { recursive: true }); await mkdir(original);
    for (const path of ["src/new", "data/new", "evaluation/quality/new", "evaluation/experiments/conditional-root-stress/new",
      "evaluation/experiments/conditional-root-stress-runtime/new"]) {
      await assert.rejects(validateOutputLocation(root, original, join(root, path)), /overlaps/);
    }
    await symlink(join(root, "src"), join(directory, "alias"));
    await assert.rejects(validateOutputLocation(root, original, join(directory, "alias/fresh")), /overlaps/);
    await validateOutputLocation(root, original, join(directory, "fresh"));
    await validateOutputLocation(root, original, join(root, "evaluation/experiments/conditional-root-stress-runtime/outcomes/fresh"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("capture refuses a self-consistent but unreviewed freeze digest before publication", async () => {
  const directory = await mkdtemp(join(tmpdir(), "q09-capture-trust-"));
  try {
    const root = join(directory, "root"); const original = join(directory, "original");
    await mkdir(root); await mkdir(original);
    const freeze = join(directory, "freeze.json"); await writeFile(freeze, "{}");
    const expectedFreeze = createHash("sha256").update("reviewed bytes").digest("hex");
    const out = join(directory, "fresh");
    await assert.rejects(captureConfigured({ root, original, freeze, expectedFreeze, variant: "active", out, id: "fixture" }), /externally reviewed digest/);
    await assert.rejects(readFile(join(out, "manifest.json")), /ENOENT/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
