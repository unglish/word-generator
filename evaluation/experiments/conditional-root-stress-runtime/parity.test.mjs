import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { absent, assertPinnedFiles, assertSameLive, files, validateSchedule, withoutTrace } from "./parity.mjs";

test("live parity rejects a missing undefined key even when JSON is equal", () => {
  assert.equal(JSON.stringify({ x: undefined }), JSON.stringify({}));
  assert.throws(() => assertSameLive({ x: undefined }, {}));
});
test("live parity includes nested nonenumerable own keys", () => {
  const first = { nested: {} }; const second = { nested: {} };
  Object.defineProperty(first.nested, "hidden", { value: undefined });
  assert.throws(() => assertSameLive(first, second));
});
test("live parity includes descriptor and own-key order changes", () => {
  const first = { x: 1 }; const second = { x: 1 };
  Object.defineProperty(second, "x", { writable: false });
  assert.throws(() => assertSameLive(first, second));
  assert.throws(() => assertSameLive({ x: 1, y: 2 }, { y: 2, x: 1 }));
});
test("only trace-on/off projection removes the trace key, without mutating words", () => {
  const traced = { syllables: [{ stress: undefined }], trace: { stressPattern: { version: 1 } } };
  const original = structuredClone(traced);
  assertSameLive(withoutTrace(traced), { syllables: [{ stress: undefined }] });
  assertSameLive(traced, original);
  assert.throws(() => assertSameLive(withoutTrace(traced), { syllables: [{}] }));
});
test("complete legacy trace differences are not projected away", () => {
  const word = { trace: { stressWeight: { secondary: { applied: false } } } };
  const forged = structuredClone(word); forged.trace.stressWeight.secondary.applied = true;
  assert.throws(() => assertSameLive(forged, word));
});

test("the schedule pin rejects changed options, seed, count, order and serialization", async () => {
  const bytes = await readFile(new URL("../../quality/protocol.json", import.meta.url));
  const protocol = JSON.parse(await readFile(new URL("./protocol-v1.json", import.meta.url)));
  const schedule = validateSchedule(bytes, protocol.delegation);
  for (const mutate of [
    value => { value.profiles[0].options.morphology = false; },
    value => { value.profiles[0].seeds.development[0]++; },
    value => { value.profiles[0].seeds.development.pop(); },
    value => { value.profiles.reverse(); },
    value => { value.wordsPerReplicate = 1000; },
  ]) {
    const changed = structuredClone(schedule); mutate(changed);
    assert.throws(() => validateSchedule(Buffer.from(JSON.stringify(changed)), protocol.delegation), /schedule bytes differ/);
  }
  assert.throws(() => validateSchedule(Buffer.from(JSON.stringify(schedule)), protocol.delegation), /schedule bytes differ/);
});
test("pinned source verification rejects changed, absent and aliased files", async () => {
  const root = await mkdtemp(join(tmpdir(), "q09-parity-pin-"));
  try {
    const path = join(root, "fixture"); const content = "original";
    const records = [{ path: "fixture", sha256: createHash("sha256").update(content).digest("hex") }];
    await writeFile(path, content); await assertPinnedFiles(root, records);
    await writeFile(path, "changed"); await assert.rejects(assertPinnedFiles(root, records));
    await rm(path); await assert.rejects(assertPinnedFiles(root, records), /ENOENT/);
    await writeFile(join(root, "target"), content); await symlink("target", path);
    await assert.rejects(assertPinnedFiles(root, records));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("fresh-output preflight refuses an existing file, directory or broken alias", async () => {
  const root = await mkdtemp(join(tmpdir(), "q09-parity-fresh-"));
  try {
    await absent(join(root, "fresh"));
    await assert.rejects(absent(root), /already exists/);
    await writeFile(join(root, "existing"), "retained");
    await assert.rejects(absent(join(root, "existing")), /already exists/);
    await symlink("missing", join(root, "alias"));
    await assert.rejects(absent(join(root, "alias")), /already exists/);
    assert.equal(await readFile(join(root, "existing"), "utf8"), "retained");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("source pins and discovery reject symlink ancestors through the declared checkout root", async () => {
  const root = await mkdtemp(join(tmpdir(), "q09-parity-ancestor-"));
  try {
    await mkdir(join(root, "actual")); await writeFile(join(root, "actual", "fixture.ts"), "original");
    await symlink("actual", join(root, "src"));
    const sha256 = createHash("sha256").update("original").digest("hex");
    await assert.rejects(assertPinnedFiles(root, [{ path: "src/fixture.ts", sha256 }]));
    await assert.rejects(files(root, "src"));
    await symlink("actual", join(root, "checkout"));
    await assert.rejects(assertPinnedFiles(join(root, "checkout"), [{ path: "fixture.ts", sha256 }]));
    await assertPinnedFiles(root, [{ path: "actual/fixture.ts", sha256 }]);
    assert.deepStrictEqual(await files(root, "actual"), ["actual/fixture.ts"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
