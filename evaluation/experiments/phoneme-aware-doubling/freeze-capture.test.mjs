import assert from "node:assert/strict";
import { mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { treePins, executionEnvironment } from "./freeze-capture.mjs";

test("freeze detects changed bytes and added source paths", async t => {
  const directory = await mkdtemp(join(tmpdir(), "q12c-freeze-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "source.ts"), "original");
  const before = await treePins(directory);
  await writeFile(join(directory, "source.ts"), "modified");
  assert.notDeepEqual(await treePins(directory), before);
  await writeFile(join(directory, "source.ts"), "original");
  assert.deepEqual(await treePins(directory), before);
  await writeFile(join(directory, "additional.ts"), "extra");
  assert.notDeepEqual(await treePins(directory), before);
  await symlink(join(directory, "source.ts"), join(directory, "alias.ts"));
  await assert.rejects(treePins(directory), /Aliased source/);
});
test("rejects active loader or binary overrides without exposing their values", () => {
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"]) {
    assert.throws(() => executionEnvironment({ [key]: "private-value" }), error => error.message.includes(key) && !error.message.includes("private-value"));
  }
  assert.equal(executionEnvironment({}).NODE_OPTIONS, null);
});
