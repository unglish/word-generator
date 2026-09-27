import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { installedDependencies } from "./dependency-closure.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "q12c-dependencies-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "package.json"), "{}");
  async function add(name, metadata = {}) {
    const directory = join(root, "node_modules", name);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "package.json"), JSON.stringify({ name, version: "1.0.0", ...metadata }));
    await writeFile(join(directory, "index.js"), "export default 1;\n");
    return directory;
  }
  return { root, add };
}

test("pins recursive dependencies, installed optional bytes and missing optional resolutions", async t => {
  const { root, add } = await fixture(t);
  await add("loader", { dependencies: { parser: "*" }, optionalDependencies: { native: "*", absent: "*" } });
  await add("parser", { exports: "./index.js", dependencies: { loader: "*" } });
  const native = await add("native");
  const before = await installedDependencies(root, ["loader"]);
  assert.equal(Object.keys(before.packages).length, 3);
  assert(before.resolutions.some(row => row.name === "absent" && row.manifest === null));
  await writeFile(join(native, "index.js"), "export default 2;\n");
  const after = await installedDependencies(root, ["loader"]);
  assert.notDeepEqual(after, before);
});

test("missing required dependency fails", async t => {
  const { root, add } = await fixture(t);
  await add("loader", { dependencies: { missing: "*" } });
  await assert.rejects(installedDependencies(root, ["loader"]), { code: "MODULE_NOT_FOUND" });
});

test("malformed installed optional package is not treated as absent", async t => {
  const { root, add } = await fixture(t);
  await add("loader", { optionalDependencies: { native: "*" } });
  const directory = await add("native");
  await writeFile(join(directory, "package.json"), "{");
  await assert.rejects(installedDependencies(root, ["loader"]));
});
