"""Independent JSON-only structural replay. Does not certify configured rule eligibility."""
from collections import Counter

PARTS = ("prefix", "root", "suffix")
SEGMENTS = ("onset", "nucleus", "coda")


def units(text):
    encoded = text.encode("utf-16-le", "surrogatepass")
    return [encoded[i:i + 2].decode("utf-16-le", "surrogatepass") for i in range(0, len(encoded), 2)]


def natural(value):
    return type(value) is int and 0 <= value <= 9007199254740991


def replay_cells(record):
    assert record["version"] == 1 and record["scope"] == "operational-cell-lineage"
    parts = {part: [] for part in PARTS}
    allocated = set()

    def allocate(identity):
        assert natural(identity) and identity not in allocated
        allocated.add(identity)

    for cell in record["initial"]:
        allocate(cell["id"])
        part, source = cell["part"], cell["source"]
        assert part in parts and len(units(cell["text"])) == 1
        if part == "root":
            assert source["kind"] in ("base-cell", "unresolved-root")
        else:
            assert source["kind"] == "affix"
        if source["kind"] == "base-cell":
            assert natural(source["cellId"])
        else:
            assert source["offset"] == len(parts[part])
        parts[part].append(cell)
    for number, event in enumerate(record["events"]):
        assert event["id"] == number and event["part"] in parts
        cells = parts[event["part"]]
        start = event["start"]
        before, after = units(event["before"]), units(event["after"])
        assert natural(start) and start + len(before) <= len(cells)
        removed = cells[start:start + len(before)]
        assert [cell["text"] for cell in removed] == before
        assert [cell["id"] for cell in removed] == event["inputIds"]
        assert len(after) == len(event["outputIds"])
        inserted = []
        for offset, (text, identity) in enumerate(zip(after, event["outputIds"])):
            allocate(identity)
            inserted.append(dict(id=identity, text=text, part=event["part"],
                                 source=dict(kind="edit", eventId=number, offset=offset)))
        cells[start:start + len(before)] = inserted
    final = [cell for part in PARTS for cell in parts[part]]
    assert final == record["cells"]
    assert [cell["text"] for cell in final] == units(record["surface"])
    return final


def replay_phones(record, syllables):
    assert record["version"] == 1
    sounds = {}
    for index, phone in enumerate(record["initial"]):
        assert natural(phone["id"]) and phone["id"] == index and isinstance(phone["initialSound"], str)
        sounds[index] = phone["initialSound"]
    for change in record["changes"]:
        assert natural(change["id"]) and sounds[change["id"]] == change["before"]
        sounds[change["id"]] = change["after"]
    previous = -1
    for realization in record["realization"]:
        index = realization["changeIndex"]
        assert natural(index) and previous < index < len(record["changes"])
        previous = index
        change = record["changes"][index]
        assert change == dict(id=realization["id"], before=realization["before"]["sound"],
                              after=realization["after"]["sound"], rule=realization["rule"])
    expected = [(s, segment, i, phone["sound"]) for s, syllable in enumerate(syllables)
                for segment in SEGMENTS for i, phone in enumerate(syllable[segment])]
    assert len(expected) == len(record["final"])
    seen = set()
    for phone, coordinate in zip(record["final"], expected):
        identity = phone["id"]
        assert natural(identity) and identity in sounds and identity not in seen
        seen.add(identity)
        assert natural(phone["syllable"]) and natural(phone["index"])
        assert (phone["syllable"], phone["segment"], phone["index"], phone["sound"]) == coordinate
        assert sounds[identity] == phone["sound"]
    assert seen == set(sounds)


def recount_word(word):
    counts = Counter(words=1)
    trace = word.get("trace", {})
    morphology = trace.get("morphology")
    template = morphology["template"] if morphology else "no-morphology-plan"
    counts["words/" + ("planned-bare" if template == "bare" else template)] += 1
    base = trace.get("baseSpelling")
    if base is None:
        counts["missingBaseEvidence"] += 1
    else:
        if any(edit["phase"] == "gap" for edit in base["edits"]):
            counts["words/gap-overridden"] += 1
        for kind in ("shared", "split"):
            ledger = base.get(kind)
            counts[f"root/{kind}/unavailable"] += int(ledger is None)
            if ledger is not None:
                counts[f"root/{kind}/constructions"] += len(ledger["constructions"])
                counts[f"root/{kind}/liveConstructions"] += len(ledger["liveConstructionIds"])
    if trace.get("finalNucleus", {}).get("repairs"):
        counts["words/final-nucleus-repaired"] += 1
    for name, required in (("finalNucleus", True), ("pronunciationPasses", True),
                           ("morphologyPreparation", morphology is not None),
                           ("morphologyWriting", template in ("prefixed", "suffixed", "both")),
                           ("gapSpellingPass", template in ("bare", "no-morphology-plan"))):
        if required and name not in trace:
            counts["missingOperationPackets/" + name] += 1
    final = trace.get("finalWord")
    if final is None:
        counts["missingFinalEvidence"] += 1
        return counts
    cells = replay_cells(final["spelling"])
    assert [cell["text"] for cell in cells] == units(word["written"]["clean"])
    replay_phones(final["phones"], word["syllables"])
    for phase in ("initial", "cells"):
        for cell in final["spelling"][phase]:
            counts[f"cells/{phase}/{cell['part']}/{cell['source']['kind']}"] += 1
    live = {cell["id"] for cell in cells}
    by_id = {cell["id"]: cell["part"] for cell in final["spelling"]["initial"]}
    for event in final["spelling"]["events"]:
        by_id.update({identity: event["part"] for identity in event["outputIds"]})
    for identity, part in by_id.items():
        if identity not in live:
            counts[f"cells/deleted/{part}"] += 1
    counts["cells/finalPhonemicLicenseUnavailable"] += len(cells)
    if any(event["rule"] == "repairConsonantLetters" for event in final["spelling"]["events"]):
        counts["words/final-cleanup-edited"] += 1
    for event in final["spelling"]["events"]:
        key = f"edits/{event['part']}/{event['rule']}"
        counts[key] += 1
        counts[key + "/removedUnits"] += len(units(event["before"]))
        counts[key + "/insertedUnits"] += len(units(event["after"]))
    for phone in final["phones"]["initial"]:
        source = phone["source"]
        counts[f"phones/initial/{source.get('part', 'bridge')}/{source['kind']}"] += 1
    origins = {phone["id"]: phone["source"] for phone in final["phones"]["initial"]}
    root_start = word.get("lexical", {}).get("rootSyllableStart", 0)
    root_length = len(word.get("lexical", {}).get("root", []))
    for phone in final["phones"]["final"]:
        origin = origins[phone["id"]]
        part = origin.get("part", "bridge")
        counts[f"phones/final/{part}/{origin['kind']}"] += 1
        if part in ("prefix", "suffix") and root_start <= phone["syllable"] < root_start + root_length:
            counts[f"phones/affixInRoot/{part}"] += 1
    for origin in origins.values():
        if origin["kind"] == "bridge":
            counts["phones/bridges/" + origin["boundary"]] += 1
    for change in final["phones"]["changes"]:
        counts["phones/changes/" + change["rule"]] += 1
    for change in final["phones"]["realization"]:
        counts["phones/realizations/" + change["rule"]] += 1
    return counts


def recount_archive(directory, manifest_sha256, registered_protocol=None):
    import gzip
    import hashlib
    import json
    from pathlib import Path
    directory = Path(directory)
    manifest_bytes = (directory / "manifest.json").read_bytes()
    assert hashlib.sha256(manifest_bytes).hexdigest() == manifest_sha256
    manifest = json.loads(manifest_bytes)["manifest"]
    assert manifest["cohort"] == "development"
    protocol = manifest["protocol"]
    if registered_protocol is not None:
        assert protocol == registered_protocol, "Archive protocol differs from prospective registration"
    artifacts = {item["file"]: item for item in manifest["artifacts"]}
    assert len(artifacts) == len(manifest["artifacts"])
    assert natural(protocol["wordsPerReplicate"]) and protocol["wordsPerReplicate"] > 0
    expected_files = set()
    profile_ids = set()
    for profile in protocol["profiles"]:
        identity = profile["id"]
        assert isinstance(identity, str) and identity and all(c.isascii() and (c.isalnum() or c in "-_") for c in identity)
        assert identity not in profile_ids
        profile_ids.add(identity)
        seeds = profile["seeds"]["development"]
        assert seeds and all(natural(seed) for seed in seeds) and len(set(seeds)) == len(seeds)
        expected_files.update(f"words/{identity}-{seed}.jsonl.gz" for seed in seeds)
    assert profile_ids
    assert {name for name in artifacts if name.startswith("words/")} == expected_files
    assert {path.relative_to(directory).as_posix() for path in (directory / "words").rglob("*") if path.is_file()} == expected_files
    total, groups = Counter(), {}
    for profile in protocol["profiles"]:
        for seed in profile["seeds"]["development"]:
            name = f"words/{profile['id']}-{seed}.jsonl.gz"
            assert name in artifacts and "/../" not in name and not name.startswith("/")
            path = directory / name
            digest = hashlib.sha256()
            size = 0
            with path.open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)
                    size += len(chunk)
            assert digest.hexdigest() == artifacts[name]["sha256"] and size == artifacts[name]["bytes"]
            counts, rows = Counter(), 0
            with gzip.open(path, "rt", encoding="utf-8") as stream:
                for index, line in enumerate(stream):
                    row = json.loads(line)
                    assert natural(row["seed"]) and natural(row["drawIndex"])
                    assert row["profile"] == profile["id"] and row["seed"] == seed and row["drawIndex"] == index
                    counts.update(recount_word(row["word"]))
                    rows += 1
            assert rows == protocol["wordsPerReplicate"]
            total.update(counts)
            groups[f"{profile['id']}/{seed}"] = dict(sorted(counts.items()))
    return dict(manifestSha256=manifest_sha256, counts=dict(sorted(total.items())), replicates=groups,
                scope="Independent structural/count replay; configured rule eligibility is checked separately")


if __name__ == "__main__":
    import argparse
    import json
    if not __debug__:
        raise RuntimeError("Recount requires Python assertion checks; do not use -O")
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("manifest_sha256")
    parser.add_argument("output")
    parser.add_argument("registration", help="Prospective measurement JSON")
    parser.add_argument("protocol", help="Protocol file pinned by the registration")
    args = parser.parse_args()
    import hashlib
    from pathlib import Path
    registration = json.loads(Path(args.registration).read_bytes())
    assert registration["version"] == "q02-final-word-provenance-measurement-v1"
    protocol_bytes = Path(args.protocol).read_bytes()
    assert hashlib.sha256(protocol_bytes).hexdigest() == registration["protocolSha256"]
    protocol = json.loads(protocol_bytes)
    result = recount_archive(args.archive, args.manifest_sha256, protocol)
    assert result["counts"]["words"] == registration["wordsPerArm"]
    result["registrationSha256"] = hashlib.sha256(Path(args.registration).read_bytes()).hexdigest()
    result["protocolSha256"] = registration["protocolSha256"]
    with open(args.output, "x", encoding="utf-8") as output:
        json.dump(result, output, indent=2, ensure_ascii=True)
        output.write("\n")
