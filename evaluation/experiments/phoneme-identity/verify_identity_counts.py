"""Independent raw-archive cross-check; no generator or TypeScript observer imports."""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import re


def sha(data):
    return hashlib.sha256(data).hexdigest()


def key(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def counter():
    return {"words": 0, "syllables": 0, "segments": 0, "raw": Counter(),
            "stress": defaultdict(Counter), "coarse": defaultdict(Counter),
            "missing": 0, "aspiration": 0, "reduction": Counter()}


def observe(counts, word, mapping):
    counts["words"] += 1
    counts["syllables"] += len(word["syllables"])
    for syllable in word["syllables"]:
        mark = {None: "unmarked", "ˈ": "primary", "ˌ": "secondary"}.get(syllable.get("stress"), "invalid")
        for slot in ("onset", "nucleus", "coda"):
            for phone in syllable[slot]:
                sound = phone["sound"]
                counts["segments"] += 1
                counts["raw"][key(sound)] += 1
                token = mapping.get(sound.replace("ʰ", ""))
                if token is None:
                    counts["missing"] += 1
                else:
                    counts["coarse"][token][key(sound)] += 1
                counts["aspiration"] += int("ʰ" in sound or phone.get("aspirated") is True)
                if slot == "nucleus":
                    counts["stress"][key(sound)][key(mark)] += 1
                    reduced = "unknown" if "reduced" not in phone else "true" if phone["reduced"] else "false"
                    counts["reduction"][reduced] += 1


def check(counts, expected, label, inventory):
    for field in ("words", "syllables", "segments"):
        assert counts[field] == expected[field], (label, field)
    assert dict(counts["raw"]) == expected["sourceCounts"], (label, "sourceCounts")
    assert dict(counts["stress"]) == expected["stressByNucleus"], (label, "stressByNucleus")
    assert dict(counts["coarse"]) == expected["coarsePreimages"], (label, "coarsePreimages")
    assert counts["missing"] == expected["coarse"]["missing"], (label, "missing")
    assert counts["aspiration"] == expected["coarse"]["aspirationLoss"], (label, "aspiration")
    for status in ("true", "false", "unknown"):
        assert counts["reduction"][status] == expected["reductionFlags"][status], (label, "reduction", status)
    ambiguous = counts["raw"][key("ɜ")]
    unknown = sum(n for sound, n in counts["raw"].items() if json.loads(sound).removesuffix("ʰ") not in inventory)
    assert expected["identities"] == {"resolved": counts["segments"] - ambiguous - unknown, "ambiguous": ambiguous, "unknown": unknown}, (label, "identityStatus")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    manifest_bytes = (args.run / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)["manifest"]
    report_bytes = args.report.read_bytes()
    report = json.loads(report_bytes)
    source_bytes = (args.run / "sources.json.gz").read_bytes()
    source_record = next(item for item in manifest["artifacts"] if item["file"] == "sources.json.gz")
    assert sha(source_bytes) == source_record["sha256"]
    sources = json.loads(gzip.decompress(source_bytes))["generator"]
    inventory_source = next(item["content"] for item in sources if item["path"] == "src/elements/phonemes.ts")
    inventory_block = inventory_source.split("export const phonemes: Phoneme[] = [", 1)[1].split("];", 1)[0]
    inventory = set(re.findall(r'\bsound:\s*"([^"]+)"', inventory_block))
    assert len(inventory) == 41
    mapping_source = next(item["content"] for item in sources if item["path"] == "src/phonotactic/ipa-to-arpabet.ts")
    mapping = dict(re.findall(r'"([^"]+)"\s*:\s*"([A-Z]+)"', mapping_source))
    assert len(mapping) == 43
    checked = []
    totals = []
    for profile, expected_profile in zip(manifest["protocol"]["profiles"], report["profiles"], strict=True):
        assert profile["id"] == expected_profile["id"]
        total = counter()
        for seed, expected_replicate in zip(profile["seeds"]["development"], expected_profile["replicates"], strict=True):
            assert seed == expected_replicate["seed"]
            relative = f"words/{profile['id']}-{seed}.jsonl.gz"
            archive = (args.run / relative).read_bytes()
            artifact = next(item for item in manifest["artifacts"] if item["file"] == relative)
            assert sha(archive) == artifact["sha256"] and len(archive) == artifact["bytes"]
            counts = counter()
            for index, line in enumerate(gzip.decompress(archive).splitlines()):
                draw = json.loads(line)
                assert (draw["profile"], draw["seed"], draw["drawIndex"]) == (profile["id"], seed, index)
                observe(counts, draw["word"], mapping)
                observe(total, draw["word"], mapping)
            assert counts["words"] == manifest["protocol"]["wordsPerReplicate"]
            check(counts, expected_replicate["counts"], relative, inventory)
            checked.append(relative)
        check(total, expected_profile["totals"], profile["id"], inventory)
        totals.append({"profile": profile["id"], "words": total["words"], "syllables": total["syllables"], "segments": total["segments"]})
    result = {"scriptSha256": sha(Path(__file__).read_bytes()), "reportSha256": sha(report_bytes),
              "manifestFileSha256": sha(manifest_bytes), "observerDigest": report["observer"]["digest"],
              "checkedArchives": checked, "profiles": totals,
              "verified": ["archive checksums", "draw identities and counts", "all raw-symbol counts", "all nucleus stress counts", "all coarse preimage counts", "missing/aspiration mass", "reduction flags", "resolved/ambiguous/unknown counts"]}
    with args.out.open("x") as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
