import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";

async function packageFiles(root) {
  const files = {};
  async function walk(directory, prefix = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      // Dependencies have their own resolution records and package roots.
      if (entry.name === "node_modules") continue;
      const name = prefix + entry.name;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path, name + "/");
      else {
        const target = await realpath(path);
        assert((await lstat(target)).isFile(), `Nonregular dependency: ${path}`);
        const bytes = await readFile(target);
        files[name] = { path: target, bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex") };
      }
    }
  }
  await walk(root);
  return files;
}

export async function resolveManifest(require, name) {
  try { return require.resolve(name + "/package.json"); }
  catch (error) {
    if (!["ERR_PACKAGE_PATH_NOT_EXPORTED", "MODULE_NOT_FOUND"].includes(error.code)) throw error;
  }
  // A runtime export can identify the root when metadata is private.
  try { return await manifestFromEntry(require.resolve(name), name); }
  catch (error) {
    if (!["ERR_PACKAGE_PATH_NOT_EXPORTED", "MODULE_NOT_FOUND"].includes(error.code)) throw error;
  }
  // Type-only packages have no runtime entry. Follow the requiring package's
  // Node lookup order, and verify metadata rather than dropping their bytes.
  for (const directory of require.resolve.paths(name) ?? []) {
    const manifest = join(directory, name, "package.json");
    try {
      const metadata = JSON.parse(await readFile(manifest, "utf8"));
      assert.equal(metadata.name, name, `Dependency metadata mismatch: ${manifest}`);
      return await realpath(manifest);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const error = new Error(`Cannot locate installed dependency metadata for ${name}`);
  error.code = "MODULE_NOT_FOUND";
  throw error;
}

async function manifestFromEntry(entry, name) {
  let directory = dirname(await realpath(entry));
  while (true) {
    const manifest = join(directory, "package.json");
    try {
      const metadata = JSON.parse(await readFile(manifest, "utf8"));
      if (metadata.name === name) return manifest;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    assert.notEqual(parent, directory, `Cannot locate package metadata for ${name}`);
    directory = parent;
  }
}

// Pin the installed loader graph, including available optional native packages.
// This records local identity, not registry authenticity or a hermetic environment.
export async function installedDependencies(sourceRoot, entryNames = ["tsx"]) {
  const packages = {};
  const resolutions = [];
  async function visit(parent, name, optional) {
    const require = createRequire(join(parent, "package.json"));
    let manifest;
    try { manifest = await resolveManifest(require, name); }
    catch (error) {
      if (!optional || error.code !== "MODULE_NOT_FOUND") throw error;
      resolutions.push({ parent, name, optional, manifest: null });
      return;
    }
    manifest = await realpath(manifest);
    resolutions.push({ parent, name, optional, manifest });
    if (packages[manifest]) return;
    const metadata = JSON.parse(await readFile(manifest, "utf8"));
    assert.equal(metadata.name, name);
    const directory = dirname(manifest);
    packages[manifest] = { name, version: metadata.version, files: await packageFiles(directory) };
    const optionalNames = metadata.optionalDependencies ?? {};
    const dependencies = { ...metadata.dependencies, ...optionalNames };
    for (const child of Object.keys(dependencies).sort()) {
      await visit(directory, child, Object.hasOwn(optionalNames, child));
    }
  }
  for (const name of entryNames) await visit(await realpath(sourceRoot), name, false);
  return { packages, resolutions };
}
