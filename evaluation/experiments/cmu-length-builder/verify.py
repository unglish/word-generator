"""Independent raw length recount and immutable TS CLI acceptance; no generator calls."""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

BASE = "e8d81e341950c68876c4fa2df7272e95d8ec0093"
PARENT_PATH = "evaluation/experiments/cmu-matched-reference/reference.json.gz"
PARENT_SHA = "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118"
PARENT_DIGEST = "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862"
PREREG_SHA = "4132b4df3ffb0bbfcdf23d90e8cf57cac48b75a18c0f6fe331c0c642e929b9e5"
UNITS = "integer-selected-entry-counts"
AXES = {"written": "ascii-letter-count", "phones": "validated-cmu-token-count",
        "syllables": "explicitly-stress-marked-vowel-token-count", "conditional": "syllable-count"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load_joint(root):
    spec = importlib.util.spec_from_file_location("joint", root / "evaluation/corpus/verify-joint.py")
    joint = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(joint)
    return joint


def source_paths(joint):
    return [*joint.SOURCE_PATHS, "scripts/build-cmu-baseline.ts",
            "evaluation/corpus/length-builder.ts", "package-lock.json"]


def expected_artifact(joint, parent_artifact, implementation):
    """Expect independently recounted parent tables and externally reviewed source bytes."""
    reference = parent_artifact["reference"]
    joint.same([file["path"] for file in implementation], source_paths(joint), "expected source paths")
    lockfile = next(file["content"] for file in implementation if file["path"] == "package-lock.json")
    return copy.deepcopy({
        "version": "cmu-length-reference-artifact-v1", "source": reference["source"],
        "parser": reference["parser"], "population": reference["population"],
        "policy": "cmu-ascii-first-v1", "units": UNITS, "axes": AXES, "lengths": reference["lengths"],
        "parentReference": {"version": "cmu-joint-reference-artifact-v1", "artifactDigest": PARENT_DIGEST,
                            "referenceDigest": joint.digest(reference), "compressedFileSha256": PARENT_SHA},
        "license": parent_artifact["license"],
        "implementation": {"digest": joint.digest(implementation), "sources": implementation,
                           "packageLockSha256": sha(lockfile.encode())},
    })


def write_json(path, value):
    with path.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def verify(root, source, directory):
    directory.mkdir()  # Failure logs are evidence too; reruns require a new directory.
    script_bytes = Path(__file__).read_bytes()
    prereg = root / "evaluation/experiments/cmu-length-builder/README.md"
    assert sha(prereg.read_bytes()) == PREREG_SHA
    joint = load_joint(root)
    implementation = joint.read_sources(root, source_paths(joint))
    verifier_paths = ["evaluation/experiments/cmu-length-builder/verify.py",
                      "evaluation/experiments/cmu-length-builder/verify_test.py",
                      "evaluation/corpus/verify-joint.py", "evaluation/corpus/verify-parser.py"]
    verifier_sources = {path: sha((root / path).read_bytes()) for path in verifier_paths}
    tracked = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", BASE], cwd=root, text=True).splitlines()
    allowed_changes = {"scripts/build-cmu-baseline.ts", "TUNING.md"}
    changed = subprocess.check_output(["git", "diff", "--name-only", BASE], cwd=root, text=True).splitlines()
    assert set(changed) & set(tracked) <= allowed_changes, changed
    protected = {path: sha((root / path).read_bytes()) for path in tracked if path not in allowed_changes}
    raw = source.read_bytes()
    assert sha(raw) == joint.parser.SOURCE_SHA
    parent_bytes = (root / PARENT_PATH).read_bytes()
    assert sha(parent_bytes) == PARENT_SHA
    parent = joint.strict_json(gzip.decompress(parent_bytes))
    recounted_parent = joint.prepare(source, root)  # Independent parser and every joint/legacy/derived bin.
    joint.validate(parent, recounted_parent)
    assert parent["digest"] == PARENT_DIGEST
    expected = expected_artifact(joint, recounted_parent, implementation)

    def stable():
        assert {path: sha((root / path).read_bytes()) for path in protected} == protected
        assert joint.read_sources(root, source_paths(joint)) == implementation
        assert source.read_bytes() == raw
        assert Path(__file__).read_bytes() == script_bytes
        assert {path: sha((root / path).read_bytes()) for path in verifier_paths} == verifier_sources
        assert sha(prereg.read_bytes()) == PREREG_SHA

    commands = []

    def run(name, command, cwd, succeeds):
        completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)
        record = {"name": name, "command": command, "cwd": str(cwd), "returncode": completed.returncode,
                  "stdout": completed.stdout, "stderr": completed.stderr}
        write_json(directory / f"command-{name}.json", record)
        commands.append({"name": name, "returncode": completed.returncode})
        stable()
        assert (completed.returncode == 0) == succeeds, record
        return completed

    script = str(root / "scripts/build-cmu-baseline.ts")
    direct = ["node", "--import", "tsx", script]
    other_cwd = [str(root / "node_modules/.bin/tsx"), script]
    common = ["--policy", "cmu-ascii-first-v1", "--units", UNITS]
    spaced_source = directory / "raw source.dict"
    with spaced_source.open("xb") as handle:
        handle.write(raw)
    first, second = directory / "direct artifact.json", directory / "other cwd artifact.json"
    run("no-arguments", direct, root, False)
    run("help-other-cwd", [*other_cwd, "--help"], directory, True)
    direct_run = run("node-import-tsx", [*direct, "--source", str(spaced_source), *common, "--out", str(first)], root, True)
    other_run = run("tsx-other-cwd", [*other_cwd, "--source", str(spaced_source), *common, "--out", str(second)], directory, True)
    artifact_bytes = first.read_bytes()
    assert second.read_bytes() == artifact_bytes
    envelope = joint.strict_json(artifact_bytes)
    joint.validate(envelope, expected)
    for completed, out in [(direct_run, first), (other_run, second)]:
        assert json.loads(completed.stdout.strip()) == {
            "artifact": str(out), "digest": envelope["digest"], "entries": 117485, "units": UNITS,
        }
    run("existing-output", [*direct, "--source", str(source), *common, "--out", str(first)], root, False)
    assert first.read_bytes() == artifact_bytes
    for name, target in [("existing-symlink", first), ("dangling-symlink", directory / "never-created.json")]:
        link = directory / f"{name}.json"
        link.symlink_to(target)
        run(name, [*direct, "--source", str(source), *common, "--out", str(link)], root, False)
        assert link.is_symlink() and link.readlink() == target
    assert not (directory / "never-created.json").exists()
    for name, content in [("empty-source", b""), ("wrong-source", raw.upper()),
                          ("invalid-utf8", b"\xff"), ("truncated-source", raw[:500])]:
        bad = directory / f"{name}.dict"
        with bad.open("xb") as handle:
            handle.write(content)
        out = directory / f"{name}-output.json"
        run(name, [*direct, "--source", str(bad), *common, "--out", str(out)], root, False)
        assert not out.exists()
    missing = directory / "missing-source-output.json"
    run("missing-source", [*direct, "--source", str(directory / "absent.dict"), *common, "--out", str(missing)], root, False)
    assert not missing.exists()
    run("protected-output", [*direct, "--source", str(source), *common,
                             "--out", str(root / "data/cmu/cmu-length-baseline.json")], root, False)
    for name, extra in [("unsupported-units", ["--units", "percent"]), ("duplicate-source", ["--source", str(source)])]:
        out = directory / f"{name}-output.json"
        args = ["--source", str(source), "--policy", "cmu-ascii-first-v1", "--out", str(out)]
        args += extra if name == "unsupported-units" else [*common[2:], *extra]
        run(name, [*direct, *args], root, False)
        assert not out.exists()
    assert first.read_bytes() == second.read_bytes() == artifact_bytes
    stable()
    lengths = expected["lengths"]
    report = {
        "version": "cmu-length-builder-verification-v1", "preregistrationSha256": PREREG_SHA,
        "parentArtifactDigest": PARENT_DIGEST, "artifactDigest": envelope["digest"], "artifactSha256": sha(artifact_bytes),
        "implementationDigest": expected["implementation"]["digest"], "sourceSha256": sha(raw),
        "entries": expected["population"]["accepted"], "entryDigest": expected["population"]["entryDigest"],
        "axes": AXES,
        "marginals": {name: {"bins": len(lengths[name]["counts"]), "total": lengths[name]["total"],
                             "max": max(map(int, lengths[name]["counts"])),
                             "weightedTotal": sum(int(key) * count for key, count in lengths[name]["counts"].items())}
                      for name in ["written", "phones", "syllables"]},
        "conditionalRows": {key: row["written"]["total"] for key, row in lengths["bySyllables"].items()},
        "allMarginalConditionalBinsIndependent": True, "exactEnvelopeAndSourceIdentity": True,
        "directTsOtherCwdByteIdentity": True, "cliSummaryExact": True, "noLegacyOrFrozenMutation": True,
        "protectedFiles": protected, "commands": commands,
        "verifierSources": verifier_sources,
    }
    write_json(directory / "verification.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--new-directory", type=Path, required=True)
    args = parser.parse_args()
    report = verify(args.root.resolve(), args.source.resolve(), args.new_directory.resolve())
    print(json.dumps({key: report[key] for key in ["artifactDigest", "entries", "marginals", "allMarginalConditionalBinsIndependent"]}))
