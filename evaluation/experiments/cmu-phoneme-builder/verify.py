"""Independent raw-source recount and immutable CLI acceptance; never calls the generator."""
import argparse
from collections import Counter
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

BASE = "7ce4bd370bf3f260d477887e7ed7f1095c0b788a"
PARENT_PATH = "evaluation/experiments/cmu-matched-reference/reference.json.gz"
PARENT_SHA = "d7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118"
PARENT_DIGEST = "f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862"
PREREG_SHA = "c2cdfe8412c90e7cf6ef84d3e0865e6410d58c917611c8f2ce62bc6c4532aa6b"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def verify(root, source, directory):
    directory.mkdir()  # A rerun requires a new directory, including failure logs.
    script_bytes = Path(__file__).read_bytes()
    prereg = root / "evaluation/experiments/cmu-phoneme-builder/README.md"
    assert sha(prereg.read_bytes()) == PREREG_SHA
    spec = importlib.util.spec_from_file_location("joint", root / "evaluation/corpus/verify-joint.py")
    joint = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(joint)
    sources_paths = [*joint.SOURCE_PATHS, "scripts/build-cmu-phoneme-baseline.mjs",
                     "evaluation/corpus/phoneme-builder.ts", "evaluation/corpus/phoneme-cli.ts", "package-lock.json"]
    implementation = joint.read_sources(root, sources_paths)
    tracked = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", BASE], cwd=root, text=True).splitlines()
    allowed_changes = {"scripts/build-cmu-phoneme-baseline.mjs", "TUNING.md"}
    changed = subprocess.check_output(["git", "diff", "--name-only", BASE], cwd=root, text=True).splitlines()
    changed_prior_files = set(changed) & set(tracked)
    assert changed_prior_files <= allowed_changes, sorted(changed_prior_files)
    protected = {path: sha((root / path).read_bytes()) for path in tracked if path not in allowed_changes}
    raw = source.read_bytes()
    assert sha(raw) == joint.parser.SOURCE_SHA
    parent_bytes = (root / PARENT_PATH).read_bytes()
    assert sha(parent_bytes) == PARENT_SHA
    parent = joint.strict_json(gzip.decompress(parent_bytes))
    expected_parent = joint.prepare(source, root)  # Independent Python parser and every joint/derived/legacy bin.
    joint.validate(parent, expected_parent)
    assert parent["digest"] == PARENT_DIGEST

    def stable():
        assert {path: sha((root / path).read_bytes()) for path in protected} == protected
        assert joint.read_sources(root, sources_paths) == implementation
        assert source.read_bytes() == raw
        assert Path(__file__).read_bytes() == script_bytes
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

    launcher = str(root / "scripts/build-cmu-phoneme-baseline.mjs")
    common = ["--policy", "cmu-ascii-first-v1", "--units", "integer-phone-occurrences"]
    spaced_source = directory / "raw source.dict"
    with spaced_source.open("xb") as handle:
        handle.write(raw)
    first, second = directory / "direct artifact.json", directory / "npm artifact.json"
    run("no-arguments", ["node", launcher], directory, False)
    run("help", ["node", launcher, "--help"], directory, True)
    direct_run = run("direct-other-cwd", ["node", launcher, "--source", str(spaced_source), *common, "--out", str(first)], directory, True)
    npm_run = run("npm-alias", ["npm", "run", "build:cmu-phonemes", "--", "--source", str(spaced_source), *common, "--out", str(second)], root, True)
    artifact_bytes = first.read_bytes()
    assert second.read_bytes() == artifact_bytes
    envelope = joint.strict_json(artifact_bytes)
    reference = expected_parent["reference"]
    normalization = next(file for file in expected_parent["legacy"]["artifacts"] if file["path"].endswith("/phoneme-normalization.json"))
    mapping = json.loads(normalization["content"])["arpabetToIpa"]
    mapped, unmapped = Counter(), Counter()
    for phone, amount in reference["phones"]["base"]["counts"].items():
        (mapped if phone in mapping else unmapped)[mapping.get(phone, phone)] += amount
    expected = {
        "version": "cmu-phoneme-reference-artifact-v1", "source": reference["source"],
        "parser": reference["parser"], "population": reference["population"], "policy": "cmu-ascii-first-v1",
        "parentReference": {"version": "cmu-joint-reference-artifact-v1", "artifactDigest": PARENT_DIGEST,
                            "referenceDigest": joint.digest(reference), "compressedFileSha256": PARENT_SHA},
        "units": "integer-phone-occurrences",
        "phones": {view: {"projection": reference["projections"][view], **reference["phones"][view]} for view in ["native", "base"]},
        "normalization": {**normalization, "sha256": sha(normalization["content"].encode())},
        "license": expected_parent["license"],
        "implementation": {"digest": joint.digest(implementation), "sources": implementation,
                           "packageLockSha256": sha((root / "package-lock.json").read_bytes())},
    }
    expected["phones"]["comparison"] = {
        "id": "cmu-base-to-legacy-ipa-v1", "mapping": mapping,
        "losses": "stress-already-removed; legacy-IPA-labels-do-not-establish-phonemic-or-dialect-equivalence",
        "inputEvents": reference["phones"]["base"]["total"], "mapped": joint.histogram(mapped), "unmapped": joint.histogram(unmapped),
    }
    joint.validate(envelope, expected)  # Exact envelope, not only matching denominators.
    for completed, out in [(direct_run, first), (npm_run, second)]:
        assert json.loads(completed.stdout.strip().splitlines()[-1]) == {
            "artifact": str(out), "digest": envelope["digest"], "entries": 117485, "phoneEvents": 742333,
        }
    run("existing-output", ["node", launcher, "--source", str(source), *common, "--out", str(first)], directory, False)
    assert first.read_bytes() == artifact_bytes
    for name, target in [("existing-symlink", first), ("dangling-symlink", directory / "never-created.json")]:
        link = directory / f"{name}.json"
        link.symlink_to(target)
        run(name, ["node", launcher, "--source", str(source), *common, "--out", str(link)], directory, False)
        assert link.is_symlink() and link.readlink() == target
    assert not (directory / "never-created.json").exists()
    for name, content in [("wrong-source", raw.upper()), ("invalid-utf8", b"\xff"), ("truncated-source", raw[:500])]:
        bad = directory / f"{name}.dict"
        with bad.open("xb") as handle:
            handle.write(content)
        out = directory / f"{name}-output.json"
        run(name, ["node", launcher, "--source", str(bad), *common, "--out", str(out)], directory, False)
        assert not out.exists()
    missing = directory / "missing-source-output.json"
    run("missing-source", ["node", launcher, "--source", str(directory / "absent.dict"), *common, "--out", str(missing)], directory, False)
    assert not missing.exists()
    run("protected-output", ["node", launcher, "--source", str(source), *common,
                             "--out", str(root / "data/cmu/cmu-lexicon-phonemes.json")], directory, False)
    assert first.read_bytes() == second.read_bytes() == artifact_bytes
    stable()
    report = {"version": "cmu-phoneme-builder-verification-v1", "preregistrationSha256": PREREG_SHA,
              "parentArtifactDigest": PARENT_DIGEST, "artifactDigest": envelope["digest"], "artifactSha256": sha(artifact_bytes),
              "implementationDigest": expected["implementation"]["digest"], "sourceSha256": sha(raw),
              "entries": reference["population"]["accepted"], "entryDigest": reference["population"]["entryDigest"],
              "phoneEvents": {view: expected["phones"][view]["total"] for view in ["native", "base"]},
              "allNativeBaseComparisonBinsIndependent": True, "exactEnvelopeAndSourceIdentity": True,
              "directNpmOtherCwdByteIdentity": True, "cliSummaryExact": True, "noLegacyOrFrozenMutation": True,
              "protectedFiles": protected, "commands": commands,
              "verifierSources": {str(Path(__file__).relative_to(root)): sha(script_bytes),
                                  **{path: sha((root / path).read_bytes()) for path in ["evaluation/corpus/verify-joint.py", "evaluation/corpus/verify-parser.py"]}}}
    write_json(directory / "verification.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--new-directory", type=Path, required=True)
    args = parser.parse_args()
    report = verify(args.root.resolve(), args.source.resolve(), args.new_directory.resolve())
    print(json.dumps({key: report[key] for key in ["artifactDigest", "entries", "phoneEvents", "allNativeBaseComparisonBinsIndependent"]}))
