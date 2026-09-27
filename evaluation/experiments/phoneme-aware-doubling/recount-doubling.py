"""Independent integer/event/stratum recount; never imports or executes the JS observer."""
import argparse
import collections
import gzip
import hashlib
import json
import math
import sys
from pathlib import Path

COUNTS = ("words", "units", "sampledAttempts", "sampledSuccesses", "sampledFailures", "directlyCounted",
          "skipped", "quotaIncrements", "unsupportedOrdinaryExpansions", "sToCkExpansions",
          "wordsWithSampledSuccess", "wordsWithUnsupportedOrdinaryExpansion", "wordsWithSToCkExpansion")

def key(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

def sha(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def pinned(path, expected):
    assert sha(path) == expected, f"Authority mismatch: {path}"
    return json.loads(Path(path).read_text())

def event_observation(word, allowed):
    trace = word["trace"]
    base = trace["baseSpelling"]
    assert base["version"] == 3
    decisions = trace["graphemeSelections"]
    assert len(decisions) == len(base["units"]) == len(base["phones"])
    assert [u["id"] for u in base["units"]] == list(range(len(decisions)))
    assert [p["id"] for p in base["phones"]] == list(range(len(decisions)))
    units = {u["choiceId"]: u for u in base["units"]}
    assert len(units) == len(decisions)
    counts = dict.fromkeys(COUNTS, 0)
    counts.update(words=1, units=len(decisions))
    events = []
    for index, choice in enumerate(decisions):
        assert type(choice["index"]) is int and choice["index"] == index
        unit = units[index]
        assert unit["id"] == index and unit["phoneIds"] == [index]
        sound = base["phones"][index]["soundAtSpelling"]
        assert sound == choice["phoneme"] and unit["selected"] == choice["selected"]
        result = unit["afterDoubling"]
        assert isinstance(result, str)
        increment = unit["doublingIncrement"]
        assert type(increment) is int and increment in (0, 1)
        decision = choice["doubling"]
        assert type(decision["attempted"]) is bool
        attempted = decision["attempted"]
        success = "result" in decision
        if attempted:
            probability = decision["probability"]
            assert type(probability) in (int, float) and math.isfinite(probability)
            assert probability == int(probability) and 0 < probability <= 100
            counts["sampledAttempts"] += 1
        if success:
            assert attempted and isinstance(decision["result"], str)
            assert result == decision["result"] and increment == 1
            kind = "sampled-success"
            counts["sampledSuccesses"] += 1
            counts["wordsWithSampledSuccess"] = 1
        else:
            assert result == unit["selected"]
            if attempted:
                assert decision["reason"] == "roll-failed" and increment == 0
                kind = "sampled-failure"
                counts["sampledFailures"] += 1
            elif increment:
                assert decision["reason"] == "multi-char-grapheme" and len(unit["selected"]) > 1
                kind = "direct-counted"
                counts["directlyCounted"] += 1
            else:
                assert isinstance(decision["reason"], str)
                kind = "skipped"
                counts["skipped"] += 1
        relation = (sound, unit["selected"], result)
        unsupported = success and relation not in allowed
        mismatch = success and relation == ("s", "c", "ck")
        counts["unsupportedOrdinaryExpansions"] += int(unsupported)
        counts["sToCkExpansions"] += int(mismatch)
        counts["wordsWithUnsupportedOrdinaryExpansion"] |= int(unsupported)
        counts["wordsWithSToCkExpansion"] |= int(mismatch)
        counts["quotaIncrements"] += increment
        events.append((index, [*relation, kind, decision.get("reason")]))
    assert counts["sampledAttempts"] == counts["sampledSuccesses"] + counts["sampledFailures"]
    assert counts["units"] == counts["sampledAttempts"] + counts["directlyCounted"] + counts["skipped"]
    assert counts["quotaIncrements"] == counts["sampledSuccesses"] + counts["directlyCounted"]
    return counts, events

def dimensions(row):
    word = row["word"]
    assert isinstance(word["syllables"], list) and len(word["syllables"]) > 0
    trace = word["trace"]
    applied = trace["summary"]["morphologyApplied"]
    assert type(applied) is bool and applied == bool(trace.get("morphology"))
    morphology = trace.get("morphology")
    affixes = []
    for role in ("prefix", "suffix"):
        if morphology and morphology.get("template") == "bare":
            assert not any(key in morphology for key in ("prefix", "suffix", "realization"))
            affixes.append(None)
            continue
        if not morphology:
            affixes.append(None)
            continue
        assert "realization" in morphology and morphology["realization"] is not None
        realization = morphology["realization"]
        if role not in realization:
            affixes.append(None)
            continue
        affix = realization[role]
        assert isinstance(affix, dict)
        resolved = affix["resolved"]
        assert isinstance(resolved["written"], str)
        assert isinstance(resolved["phonemes"], list) and all(isinstance(p, str) for p in resolved["phonemes"])
        affixes.append([resolved["written"], resolved["phonemes"]])
    prefix, suffix = affixes
    shape = ("prefix" if prefix is not None else "none") + "/" + ("suffix" if suffix is not None else "none")
    profile, seed = row["profile"], row["seed"]
    length = len(word["syllables"])
    return [["all"], ["profile", profile], ["stream", profile, seed], ["syllables", profile, length],
            ["morphology", profile, shape], ["syllables-morphology", profile, length, shape],
            ["resolved-affixes", profile, prefix, suffix]]

def recount_rows(rows, allowed):
    groups, witnesses = {}, {}
    words = 0
    for row in rows:
        counts, events = event_observation(row["word"], allowed)
        frequencies = collections.Counter(key(event) for _, event in events)
        for group in dimensions(row):
            total = groups.setdefault(key(group), {"counts": collections.Counter(), "events": collections.Counter()})
            total["counts"].update(counts)
            total["events"].update(frequencies)
        for unit_id, event in events:
            if event[3] not in ("sampled-success", "direct-counted") and event[4] != "unsupported-realization":
                continue
            category = key([row["profile"], *event])
            witnesses.setdefault(category, {"category": category, "coordinate": {k: row[k] for k in ("profile", "seed", "drawIndex")},
                                            "unitId": unit_id, "word": row["word"]})
        words += 1
    return words, groups, witnesses

def compare_report(report, rows, allowed):
    words, groups, witnesses = recount_rows(rows, allowed)
    assert type(report["words"]) is int and report["words"] == words
    reported = {key(g["dimensions"]): g for g in report["groups"]}
    assert len(reported) == len(report["groups"]) and reported.keys() == groups.keys()
    checks = 0
    for name, group in groups.items():
        for field in ("counts", "events"):
            actual, expected = reported[name][field], dict(group[field])
            assert actual.keys() == expected.keys(), (name, field, "keys")
            for counter, value in expected.items():
                assert type(actual[counter]) is int and actual[counter] == value, (name, field, counter)
                checks += 1
        # Other productionReplay fields are explicitly outside this independent proof.
        denominator = reported[name]["productionReplay"]["words"]
        assert type(denominator) is int and denominator == group["counts"]["words"]
    expected_witnesses = [witnesses[k] for k in sorted(witnesses, key=lambda s: s.encode("utf-16-be", "surrogatepass"))]
    assert report["witnesses"] == expected_witnesses, "Complete first-witness mismatch"
    return {"words": words, "groups": len(groups), "integerComparisons": checks, "fullWitnesses": len(witnesses)}

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
    assert report["version"] == "q12c-doubling-corpus-v1" and report["variant"] == authority["variant"]
    source_root = Path(args.source_root).resolve()
    assert Path(authority["sourceRoot"]).resolve() == source_root
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
    assert report["streams"] == streams
    def rows():
        for stream in streams:
            count = 0
            with gzip.open(artifact_path(stream["file"]), "rt", encoding="utf-8") as source:
                for line in source:
                    assert line.endswith("\n") and count < stream["words"]
                    row = json.loads(line)
                    assert row["profile"] == stream["profile"] and row["seed"] == stream["seed"]
                    assert type(row["drawIndex"]) is int and row["drawIndex"] == count
                    yield row
                    count += 1
            assert count == stream["words"]
    check_sources(); check_archive()
    counts = compare_report(report, rows(), {tuple(rule) for rule in registration["ordinaryRelations"]})
    check_sources(); check_archive()
    assert sha(args.report) == args.report_sha256
    assert sha(args.protocol) == args.protocol_sha256 and sha(args.registration) == args.registration_sha256
    return {"version": "q12c-independent-doubling-recount-v1", "passed": True, **counts,
            "pythonVersion": sys.version, "pythonExecutable": str(Path(sys.executable).resolve()),
            "pythonExecutableSha256": sha(sys.executable),
            "reportSha256": args.report_sha256, "manifestSha256": args.manifest_sha256,
            "scope": "Independent source-unit/decision consistency, doubling integers, strata, event histograms and full first witnesses. No JS observer imports or generation.",
            "excluded": "Production replay counters except their word denominator, sampler law, final-word pronunciation, and human judgments are not independently proved here."}

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
