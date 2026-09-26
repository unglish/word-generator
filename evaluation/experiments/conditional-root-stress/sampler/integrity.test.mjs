import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ROOT, engineIdentity, freshOutput, parseArgs, sha, writeExclusive } from "./integrity.mjs";

test("publication is exclusive and rejects checkout aliases/dangling paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "q09-synthetic-integrity-"));
  try {
    const path = join(directory, "synthetic.json");
    await writeExclusive(path, Buffer.from("original"));
    await assert.rejects(writeExclusive(path, Buffer.from("replacement")), /already exists/);
    assert.equal((await readFile(path)).toString(), "original");
    await symlink(ROOT, join(directory, "checkout"));
    await assert.rejects(freshOutput(join(directory, "checkout", "new-proof.json")), /outside/);
    await symlink(join(directory, "missing"), join(directory, "dangling"));
    await assert.rejects(freshOutput(join(directory, "dangling")), /already exists/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("engine includes exact executable bytes and explicit options cannot be omitted or repeated", async () => {
  const engine = await engineIdentity();
  assert.equal(engine.executableSha256, sha(await readFile(process.execPath)));
  assert.deepEqual(engine.versions, process.versions);
  assert.deepEqual(parseArgs(["--first", "a", "--second", "b"], ["first", "second"]), { first: "a", second: "b" });
  for (const args of [[], ["--first", "a"], ["--first", "a", "--first", "b"], ["first", "a", "--second", "b"],
    ["--first", "a", "--second"], ["--first", "a", "--other", "b"]]) assert.throws(() => parseArgs(args, ["first", "second"]));
});
