"""Pinned archive entry point for Q13b independent recount.

Authority and archive handling adapted from the retained Q12c verifier. All Q13b
report counters and complete witnesses are compared, including repair fields.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import runpy
import sys

if sys.flags.optimize:
    raise RuntimeError('Assertions must be enabled')
aggregate = runpy.run_path(str(Path(__file__).resolve().with_name('recount-aggregate.py')))

def sha(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def pinned(path, expected):
    assert sha(path) == expected, f"Authority mismatch: {path}"
    return json.loads(Path(path).read_text())

def verify(args):
    archive = Path(args.archive).resolve()
    report = pinned(args.report, args.report_sha256)
    authority_path = Path(args.report).parent / "authority.json"
    authority = pinned(authority_path, report["authoritySha256"])
    assert Path(authority["archive"]).resolve() == archive
    assert authority["manifestSha256"] == args.manifest_sha256
    manifest = pinned(archive / "manifest.json", args.manifest_sha256)["manifest"]
    protocol = pinned(args.protocol, args.protocol_sha256)
    registration = pinned(args.registration, args.registration_sha256)
    assert manifest["protocol"] == protocol and manifest["cohort"] == "development"
    assert authority["protocolSha256"] == args.protocol_sha256
    assert authority["registrationSha256"] == args.registration_sha256
    assert authority["sourceDigest"] == manifest["generator"]["sourceDigest"]
    assert report["version"] == "q13b-shared-corpus-v1" and report["variant"] == authority["variant"]
    source_root = Path(args.source_root).resolve()
    assert Path(authority["sourceRoot"]).resolve() == source_root
    tool_root = Path(__file__).resolve().parent
    assert tool_root == source_root / "evaluation/experiments/aligned-shared-graphemes"
    for name in ("recount-corpus.py", "recount-aggregate.py", "recount-shared.py", "recount-repairs.py", "recount-doubling.py"):
        relative = str((tool_root / name).relative_to(source_root))
        assert relative in authority["before"]["files"], ("Unpinned verifier", name)
    def check_sources():
        for name, pin in authority["before"]["files"].items():
            path = source_root / name
            assert path.is_file() and not path.is_symlink()
            assert path.stat().st_size == pin["bytes"] and sha(path) == pin["sha256"], name
        for manifest_path, package in authority["before"]["dependencies"]["packages"].items():
            package_root = Path(manifest_path).parent
            for name, pin in package["files"].items():
                path = package_root / name
                assert str(path.resolve()) == pin["path"]
                assert path.is_file() and path.stat().st_size == pin["bytes"]
                assert sha(path) == pin["sha256"], str(path)
        executable = authority["before"]["executable"]
        assert sha(executable["path"]) == executable["sha256"]
    def artifact_path(name):
        parts = name.split("/")
        assert all(p and p not in (".", "..") for p in parts)
        path = archive
        for p in parts:
            path = path / p
            assert not path.is_symlink()
        return path
    artifacts = {a["file"]: a for a in manifest["artifacts"]}
    assert len(artifacts) == len(manifest["artifacts"])
    def check_archive():
        assert sha(archive / "manifest.json") == args.manifest_sha256
        for name, pin in artifacts.items():
            path = artifact_path(name)
            assert path.is_file() and path.stat().st_size == pin["bytes"] and sha(path) == pin["sha256"], name
    streams = []
    seen = set()
    for profile in protocol["profiles"]:
        for seed in profile["seeds"]["development"]:
            assert type(seed) is int and 0 <= seed <= 0xffffffff and seed not in seen
            seen.add(seed)
            streams.append({"profile": profile["id"], "seed": seed, "words": protocol["wordsPerReplicate"],
                            "file": f"words/{profile['id']}-{seed}.jsonl.gz"})
    assert {s["file"] for s in streams} == {p for p in artifacts if p.startswith("words/")}
    aggregate["exact"](report["streams"], streams)
    def rows():
        for stream in streams:
            count = 0
            with gzip.open(artifact_path(stream["file"]), "rt", encoding="utf-8") as source:
                for line in source:
                    assert line.endswith("\n") and count < stream["words"]
                    row = json.loads(line)
                    assert row["profile"] == stream["profile"] and type(row["seed"]) is int and row["seed"] == stream["seed"]
                    assert type(row["drawIndex"]) is int and row["drawIndex"] == count
                    yield row
                    count += 1
            assert count == stream["words"]
    check_sources(); check_archive()
    assert registration["version"] == "q13b-aligned-shared-graphemes-registration-v1"
    relation_path = source_root / "evaluation/experiments/phoneme-aware-doubling/protocol.json"
    relation_key = str(relation_path.relative_to(source_root))
    assert relation_key in authority["before"]["files"], "Unpinned doubling policy"
    relations = pinned(relation_path, authority["before"]["files"][relation_key]["sha256"])["ordinaryRelations"]
    payload = dict(report)
    for field in ("variant", "authoritySha256", "streams"):
        del payload[field]
    payload["version"] = 1
    counts = aggregate["compare"](payload, rows(), registration["constructions"], relations)
    check_sources(); check_archive()
    assert sha(authority_path) == report["authoritySha256"]
    assert sha(args.report) == args.report_sha256
    assert sha(args.protocol) == args.protocol_sha256 and sha(args.registration) == args.registration_sha256
    return {"version": "q13b-independent-shared-recount-v1", "passed": True, **counts,
            "pythonVersion": sys.version, "pythonExecutable": str(Path(sys.executable).resolve()),
            "pythonExecutableSha256": sha(sys.executable),
            "reportSha256": args.report_sha256, "manifestSha256": args.manifest_sha256,
            "scope": "Independent shared ownership, repair and doubling arithmetic, every grouped counter, event/form histograms and full first witnesses. No JS observer imports or generation.",
            "excluded": "Certificate counts are reconstructed, but reading-license semantics and complete writer-slot timing still require production verification. Sampler law, final-word pronunciation and human judgments are not independently proved here."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for name in ("archive", "manifest-sha256", "report", "report-sha256", "protocol", "protocol-sha256",
                 "registration", "registration-sha256", "source-root", "out"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    # Reserve the destination before expensive work; failures never masquerade as a completed proof.
    with Path(args.out).open("x") as destination:
        result = verify(args)
        json.dump(result, destination, ensure_ascii=False, indent=2)
        destination.write("\n")
