"""Independent rime counters over every archived draw; no generator/TypeScript imports."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def empty_rimes():
    return dict.fromkeys(["syllables", "aeNuclei", "multiSegmentNuclei", "closedAe", "ngCodas", "pairs", "exactPairs", "extendedPairs"], 0)


def empty_counts():
    return {"words": 0, "layers": {key: {**empty_rimes(), "observedWords": 0, "unavailableWords": 0, "pairedWords": 0, "strata": {}}
            for key in ["generatedBase", "preparedBase", "output"]}, "transitions": {
            key: dict.fromkeys(["observedWords", "unavailableWords", "retained", "introduced", "removed"], 0)
            for key in ["generationToPrepared", "stressRepair"]}}


def paired(syllable):
    return "æ" in syllable["nucleus"] and "ŋ" in syllable["coda"]


def observe_rime(counts, syllable):
    ae = "æ" in syllable["nucleus"]
    counts["syllables"] += 1
    counts["aeNuclei"] += ae
    counts["multiSegmentNuclei"] += len(syllable["nucleus"]) > 1
    counts["closedAe"] += ae and bool(syllable["coda"])
    counts["ngCodas"] += "ŋ" in syllable["coda"]
    if paired(syllable):
        counts["pairs"] += 1
        counts["exactPairs"] += len(syllable["nucleus"]) == len(syllable["coda"]) == 1
        counts["extendedPairs"] += len(syllable["coda"]) > 1


def unique_stage(word, name):
    found = [stage for stage in word.get("trace", {}).get("stages", []) if stage["name"] == name]
    assert len(found) <= 1, name
    return found[0] if found else {}


def observe(counts, word):
    counts["words"] += 1
    generated = unique_stage(word, "generateSyllables").get("after")
    prepared = unique_stage(word, "generateWrittenForm").get("before")
    repair = unique_stage(word, "repairStressedNuclei")
    output = [{**{part: [phone["sound"] for phone in syllable[part]] for part in ["onset", "nucleus", "coda"]},
               **({"stress": syllable["stress"]} if "stress" in syllable else {})} for syllable in word["syllables"]]
    for name, syllables in [("generatedBase", generated), ("preparedBase", prepared), ("output", output)]:
        layer = counts["layers"][name]
        if not syllables:
            layer["unavailableWords"] += 1
            continue
        layer["observedWords"] += 1
        layer["pairedWords"] += any(map(paired, syllables))
        for index, syllable in enumerate(syllables):
            position = "only" if len(syllables) == 1 else "initial" if index == 0 else "final" if index == len(syllables) - 1 else "medial"
            stress = "unavailable"
            if name == "output":
                stress = {"ˈ": "primary", "ˌ": "secondary"}.get(syllable.get("stress"), "other" if "stress" in syllable else "unmarked")
            observe_rime(layer, syllable)
            observe_rime(layer["strata"].setdefault(f"{position}/{stress}", empty_rimes()), syllable)
    for name, before, after in [("generationToPrepared", generated, prepared), ("stressRepair", repair.get("before"), repair.get("after"))]:
        transition = counts["transitions"][name]
        if not before or after is None or len(before) != len(after):
            transition["unavailableWords"] += 1
            continue
        transition["observedWords"] += 1
        for left, right in zip(before, after):
            was, now = paired(left), paired(right)
            transition["retained"] += was and now
            transition["introduced"] += not was and now
            transition["removed"] += was and not now


def verify(directory, report_path):
    report_bytes = report_path.read_bytes()
    report = json.loads(gzip.decompress(report_bytes) if report_path.suffix == ".gz" else report_bytes)
    manifest_bytes = (directory / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)["manifest"]
    assert manifest["cohort"] == "development"
    assert report["run"]["id"] == manifest["id"]
    assert report["run"]["generatorSourceDigest"] == manifest["generator"]["sourceDigest"]
    artifacts = manifest["artifacts"]
    assert len({item["file"] for item in artifacts}) == len(artifacts)
    for item in artifacts:
        data = (directory / item["file"]).read_bytes()
        assert len(data) == item["bytes"] and sha(data) == item["sha256"], item["file"]
    assert any(item["file"] == "sources.json.gz" for item in artifacts)
    sources = json.loads(gzip.decompress((directory / "sources.json.gz").read_bytes()))
    source_digest = sha(json.dumps(sources["generator"], ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())
    assert source_digest == manifest["generator"]["sourceDigest"]
    protocol = manifest["protocol"]
    expected = {f"words/{profile['id']}-{seed}.jsonl.gz" for profile in protocol["profiles"] for seed in profile["seeds"]["development"]}
    assert expected == {item["file"] for item in artifacts if item["file"].startswith("words/")}
    assert expected == {f"words/{path.name}" for path in (directory / "words").iterdir()}
    measured = []
    for profile in protocol["profiles"]:
        totals, strata, replicates = empty_counts(), {}, []
        for seed in profile["seeds"]["development"]:
            counts = empty_counts()
            with gzip.open(directory / f"words/{profile['id']}-{seed}.jsonl.gz", "rt") as stream:
                for index, line in enumerate(stream):
                    draw = json.loads(line)
                    assert draw["profile"] == profile["id"] and draw["seed"] == seed and draw["drawIndex"] == index
                    assert index < protocol["wordsPerReplicate"]
                    word = draw["word"]
                    morphology = word.get("trace", {}).get("morphology", {})
                    actual = morphology.get("template", "bare") if morphology.get("prefix") or morphology.get("suffix") else "bare"
                    key = f"{actual}/syllables:{len(word['syllables'])}"
                    for target in [counts, totals, strata.setdefault(key, empty_counts())]:
                        observe(target, word)
            assert counts["words"] == protocol["wordsPerReplicate"]
            replicates.append({"seed": seed, "counts": counts})
        measured.append({"id": profile["id"], "totals": totals, "replicates": replicates, "strata": strata})
    assert measured == report["profiles"], "Independent counts differ"
    assert (directory / "manifest.json").read_bytes() == manifest_bytes
    assert report_path.read_bytes() == report_bytes
    return {"reportSha256": sha(report_bytes), "manifestFileSha256": sha(manifest_bytes),
            "verifierSha256": sha(Path(__file__).read_bytes()), "words": sum(profile["totals"]["words"] for profile in measured),
            "exactAgreement": True, "checks": ["all pinned artifact bytes/hashes", "generator source digest", "exact shard set",
            "every draw identity/order", "every profile/replicate/morphology/stress-position count", "stage-specific pair transitions"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    result = verify(args.run, args.report)
    with args.out.open("x") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
