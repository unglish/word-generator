"""Recount original archived draws and independently verify Q15b sensitivity."""
import argparse
from collections import Counter
import gzip
import importlib.util
import io
import json
import math
from pathlib import Path
import re

spec = importlib.util.spec_from_file_location("joint_verifier", Path(__file__).with_name("verify-joint.py"))
joint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(joint)
ROOT = joint.ROOT
ORIGINAL_DIGEST = "a23414ae34d3611c4367d07ad677afb99e7d89a4be7886e6ed95018c2ff3f3da"
TOLERANCE = 1e-12
SOURCES = ["evaluation/corpus/archive.ts", "evaluation/corpus/sensitivity.ts", "evaluation/corpus/sensitivity-cli.ts",
           "evaluation/corpus/identity.ts", "evaluation/corpus/joint.ts", "evaluation/corpus/joint-artifact.ts",
           "evaluation/corpus/cmu.ts", "evaluation/review/wordlikeness/model.ts"]
PROJECTION = {
    "id": "legacy-generator-surface-sound-comparison-v1", "aspiration": "remove-literal-U+02B0-from-sound",
    "aliases": {"ɚ": "ɜ", "ʌ": "ə"},
    "loss": "aspiration-and-listed-identity-distinctions-merged; stress-not-compared; ambiguous-ɜ-retained",
}


class JsonFloat(float):
    """Keep the producer's finite numeric token for identity, not for arithmetic."""
    def __new__(cls, token):
        value = super().__new__(cls, token)
        if not math.isfinite(value):
            joint.fail("Nonfinite JSON number")
        value.token = token
        return value


def load_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                joint.fail(f"Duplicate JSON key: {key}")
            result[key] = value
        return result
    return json.loads(data, parse_float=JsonFloat, object_pairs_hook=pairs,
                      parse_constant=lambda value: joint.fail(f"Nonfinite JSON value: {value}"))


def identity_json(value):
    """Canonical key order with original JSON number lexemes.

    This verifies identities of the JSON emitted by the frozen JS producer
    without reprinting its floating values through Python. It is not a general
    implementation of JavaScript Number.toString for newly computed floats.
    All count/provenance values are independently checked and all distances are
    independently recomputed below; the producer's numbers are never trusted.
    """
    if isinstance(value, dict):
        keys = list(joint.canonical(dict.fromkeys(value)))
        return "{" + ",".join(json.dumps(key, ensure_ascii=False) + ":" + identity_json(value[key]) for key in keys) + "}"
    if isinstance(value, list):
        return "[" + ",".join(identity_json(item) for item in value) + "]"
    if isinstance(value, JsonFloat):
        return value.token
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def digest(value):
    return joint.sha(identity_json(value).encode())


def distance(generated, reference):
    """Direct probability/JSD calculation, independent of the frozen TS helper."""
    for table in [generated, reference]:
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0
               for value in table.values()):
            joint.fail("Invalid distribution weight")
    p_total, q_total = math.fsum(generated.values()), math.fsum(reference.values())
    names = ["jensenShannonBits", "missingReferenceMass", "unseenGeneratedMass"]
    if p_total == 0 or q_total == 0:
        return dict.fromkeys(names)
    terms, missing, unseen = [], [], []
    for category in sorted(set(generated) | set(reference)):
        p, q = generated.get(category, 0) / p_total, reference.get(category, 0) / q_total
        mean = (p + q) / 2
        if p:
            terms.append(p * math.log2(p / mean) / 2)
        if q:
            terms.append(q * math.log2(q / mean) / 2)
        if not p:
            missing.append(q)
        if not q:
            unseen.append(p)
    return dict(zip(names, [max(0, min(1, math.fsum(terms))), math.fsum(missing), math.fsum(unseen)]))


def check_sensitivity(actual, counts, references):
    generated = {
        **{name: table["counts"] for name, table in counts["characters"].items()},
        "writtenLength": counts["lengths"]["written"]["counts"],
        "syllables": counts["lengths"]["syllables"]["counts"], "phones": counts["phones"]["comparison"]["counts"],
    }
    joint.same(set(actual), set(references), "sensitivity categories")
    maximum_error = 0.0
    for name, views in references.items():
        result = actual[name]
        joint.same(set(result), {"generatedEvents", "legacy", "joint", "deltaJointMinusLegacy"}, "sensitivity result fields")
        joint.same(result["generatedEvents"], sum(generated[name].values()), "generated denominator")
        expected = {view: distance(generated[name], table) for view, table in views.items()}
        expected["deltaJointMinusLegacy"] = {
            key: None if value is None or expected["legacy"][key] is None else value - expected["legacy"][key]
            for key, value in expected["joint"].items()
        }
        for view, scores in expected.items():
            joint.same(set(result[view]), set(scores), "distance fields")
            for key, value in scores.items():
                observed = result[view][key]
                if value is None:
                    joint.same(observed, None, "missing distance")
                    continue
                if isinstance(observed, bool) or not isinstance(observed, (float, int)) or not math.isfinite(observed):
                    joint.fail("Distance is not finite numeric data")
                error = abs(observed - value)
                if error > TOLERANCE:
                    joint.fail(f"Independent {name}/{view}/{key} differs by {error}")
                maximum_error = max(maximum_error, error)
    return maximum_error


def new_counters():
    return {"words": 0, "characters": {name: Counter() for name in ["letters", "bigrams", "trigrams"]},
            "lengths": {name: Counter() for name in ["written", "phones", "syllables"]}, "raw": Counter()}


def count_word(counts, word):
    if not isinstance(word.get("trace"), dict) or not isinstance(word.get("syllables"), list):
        joint.fail("Archived word lacks trace/syllables")
    spelling = word["written"]["clean"]
    if not isinstance(spelling, str) or not re.fullmatch("[a-zA-Z]+", spelling):
        joint.fail("Written form needs an explicit missing-data policy")
    phones = [phone for syllable in word["syllables"] for part in ["onset", "nucleus", "coda"] for phone in syllable[part]]
    counts["words"] += 1
    for width, name in enumerate(["letters", "bigrams", "trigrams"], 1):
        lowered = spelling.lower()
        counts["characters"][name].update(lowered[index:index + width] for index in range(len(lowered) - width + 1))
    for name, value in [("written", len(spelling)), ("phones", len(phones)), ("syllables", len(word["syllables"]))]:
        counts["lengths"][name][str(value)] += 1
    for phone in phones:
        if not isinstance(phone.get("sound"), str):
            joint.fail("Phone lacks a sound")
        counts["raw"][phone["sound"]] += 1


def combine(target, stream):
    target["words"] += stream["words"]
    for group in ["characters", "lengths"]:
        for name, counts in stream[group].items():
            target[group][name].update(counts)
    target["raw"].update(stream["raw"])


def finish_counts(counters):
    comparison, paths, aspiration = Counter(), {}, 0
    for sound, count in counters["raw"].items():
        deaspirated = sound.replace("ʰ", "")
        projected = PROJECTION["aliases"].get(deaspirated, deaspirated)
        comparison[projected] += count
        paths[sound] = {"output": projected, "count": count}
        if deaspirated != sound:
            aspiration += count
    return {"words": counters["words"],
            **{group: {name: joint.histogram(counts) for name, counts in counters[group].items()} for group in ["characters", "lengths"]},
            "phones": {"raw": joint.histogram(counters["raw"]), "comparison": joint.histogram(comparison)},
            "aspirationEvents": aspiration, "projectionPaths": paths}


def pinned_bytes(directory, artifact):
    path = directory / artifact["file"]
    data = path.read_bytes()
    joint.same(len(data), artifact["bytes"], "archive byte count " + artifact["file"])
    joint.same(joint.sha(data), artifact["sha256"], "archive checksum " + artifact["file"])
    return data


def recount_shard(data, profile, seed, expected_count):
    counts = new_counters()
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
        for index, line in enumerate(stream):
            draw = json.loads(line)
            joint.same(set(draw), {"profile", "seed", "drawIndex", "word"}, "draw fields")
            joint.same({key: draw[key] for key in ["profile", "seed", "drawIndex"]},
                       {"profile": profile, "seed": seed, "drawIndex": index}, "draw coordinate")
            if index >= expected_count:
                joint.fail("Extra archived draw")
            count_word(counts, draw["word"])
    joint.same(counts["words"], expected_count, "complete draw stream")
    return counts


def open_archive(directory):
    raw_manifest = (directory / "manifest.json").read_bytes()
    envelope = load_json(raw_manifest)
    joint.same(set(envelope), {"manifest", "digest"}, "manifest envelope fields")
    manifest = envelope["manifest"]
    joint.same(envelope["digest"], ORIGINAL_DIGEST, "original manifest pin")
    joint.same(digest(manifest), ORIGINAL_DIGEST, "manifest content digest")
    joint.same(digest(manifest["protocol"]), manifest["protocolDigest"], "protocol digest")
    scheduled = [f"words/{profile['id']}-{seed}.jsonl.gz" for profile in manifest["protocol"]["profiles"] for seed in profile["seeds"]["development"]]
    artifacts = {item["file"]: item for item in manifest["artifacts"]}
    joint.same(len(artifacts), len(manifest["artifacts"]), "unique archive files")
    joint.same(sorted(scheduled), sorted(path for path in artifacts if path.startswith("words/")), "scheduled shard set")
    words = directory / "words"
    actual = list(words.iterdir())
    if any(path.is_symlink() or not path.is_file() for path in actual):
        joint.fail("Archive word directory contains a symlink or nonfile")
    joint.same(sorted("words/" + path.name for path in actual), sorted(scheduled), "filesystem shard set")
    contents = {}
    for name, metadata in artifacts.items():
        if name.startswith("words/"):
            continue
        data = pinned_bytes(directory, metadata)
        contents[name] = load_json(gzip.decompress(data) if name.endswith(".gz") else data)
    sources, summary = contents["sources.json.gz"], contents["summary.json"]
    joint.same(digest(sources["generator"]), manifest["generator"]["sourceDigest"], "generator source digest")
    joint.same(digest(sources["references"]), manifest["referenceDigest"], "old reference digest")
    joint.same(digest({"files": sources["evaluator"], "definitions": summary["definitions"]}), manifest["evaluatorDigest"], "frozen evaluator digest")
    lock = next(file for file in sources["packageFiles"] if file["path"] == "package-lock.json")
    joint.same(digest(lock["content"]), manifest["environment"]["packageLockDigest"], "dependency lock digest")
    for key in ["id", "cohort", "protocolDigest", "evaluatorDigest", "referenceDigest"]:
        joint.same(summary[key], manifest[key], "summary identity " + key)
    return manifest, sources, contents, raw_manifest


def reference_tables(artifact):
    reference = artifact["reference"]
    legacy = {file["path"].split("/")[-1]: load_json(file["content"]) for file in artifact["legacy"]["artifacts"]}
    return {
        **{name: {"legacy": legacy[f"cmu-lexicon-{name}.json"], "joint": reference["characters"][name]["counts"]}
           for name in ["letters", "bigrams", "trigrams"]},
        "writtenLength": {"legacy": legacy["cmu-length-baseline.json"]["byLen"], "joint": reference["lengths"]["written"]["counts"]},
        "syllables": {"legacy": legacy["cmu-length-baseline.json"]["bySyl"], "joint": reference["lengths"]["syllables"]["counts"]},
        "phones": {"legacy": legacy["cmu-lexicon-phonemes.json"], "joint": artifact["comparisonProjection"]["mapped"]["counts"]},
    }


def check_report_metadata(report, artifact, artifact_bytes, manifest, archived_sources, root):
    sources = joint.read_sources(root, SOURCES)
    distance_source = next(file for file in archived_sources["evaluator"] if file["path"] == "evaluation/quality/distribution.ts")
    joint.same(archived_sources["references"], sorted(artifact["legacy"]["artifacts"], key=lambda file: file["path"]), "shared legacy reference bytes")
    normalization = load_json(next(file["content"] for file in artifact["legacy"]["artifacts"] if file["path"].endswith("/phoneme-normalization.json")))
    joint.same(normalization["generatedAliases"], PROJECTION["aliases"], "declared aliases")
    expected = {
        "version": "cmu-reference-sensitivity-v1", "interpretation": "reference-sensitivity-only; identical-generated-draws; no-output-quality-claim",
        "baseline": {"manifestDigest": ORIGINAL_DIGEST, "manifest": manifest},
        "reference": {"artifactDigest": joint.digest(artifact), "fileSha256": joint.sha(artifact_bytes),
                      "population": artifact["reference"]["population"], "legacyReferenceDigest": manifest["referenceDigest"]},
        "evaluator": {"implementationDigest": joint.digest(sources), "sources": sources,
                      "frozenDistance": {**distance_source, "sha256": joint.sha(distance_source["content"].encode())}},
        "generatedProjection": {**PROJECTION, "digest": joint.digest(PROJECTION)},
        "referenceTables": reference_tables(artifact),
        "referenceUnits": {"characters": "integer-character-occurrences", "jointLengths": "integer-selected-entry-counts",
                           "legacyLengths": "integer-pronunciation-line-counts", "jointPhones": "integer-phone-occurrences",
                           "legacyPhones": "rounded-percentage; corpus-event-denominator-unknown",
                           "legacyPhoneWeightSum": artifact["legacy"]["phones"]["displayedSum"]},
        "limitations": ["No source token frequency or root/familiarity/POS labels", "CMU includes names, loans and inflected forms",
                        "Bare generator roots are not matched dictionary stems", "Phone comparison uses a lossy legacy projection, not a dialect or identity judgment",
                        "Five stream results are descriptive, not confidence intervals"],
    }
    joint.same(set(report), {*expected, "profiles"}, "report fields")
    for key, value in expected.items():
        joint.same(report[key], value, "report " + key)
    return expected["referenceTables"]


def verify(source_path, artifact_path, baseline, report_path, root=ROOT):
    watched = [*set(SOURCES + joint.SOURCE_PATHS + list(joint.LEGACY_HASHES)), joint.LICENSE_PATH, joint.OLD_MODEL_PATH,
               "evaluation/corpus/verify-parser.py", "evaluation/corpus/verify-joint.py", "evaluation/corpus/verify-sensitivity.py"]
    before = {path: joint.sha((root / path).read_bytes()) for path in sorted(watched)}
    expected_artifact = joint.prepare(source_path, root)
    artifact_bytes, report_bytes = Path(artifact_path).read_bytes(), Path(report_path).read_bytes()
    joint.validate(joint.strict_json(artifact_bytes), expected_artifact)
    envelope = load_json(report_bytes)
    joint.same(set(envelope), {"digest", "report"}, "report envelope fields")
    report = envelope["report"]
    joint.same(digest(report), envelope["digest"], "report identity with original numeric lexemes")
    directory = Path(baseline)
    manifest, archived_sources, archived_json, manifest_bytes = open_archive(directory)
    references = check_report_metadata(report, expected_artifact, artifact_bytes, manifest, archived_sources, root)
    schedule = manifest["protocol"]["profiles"]
    joint.same([profile["id"] for profile in report["profiles"]], [profile["id"] for profile in schedule], "profile set/order")
    maximum_error, words, streams, counts_digest = 0.0, 0, 0, []
    metadata = {item["file"]: item for item in manifest["artifacts"]}
    for scheduled, observed in zip(schedule, report["profiles"]):
        profile = scheduled["id"]
        joint.same(set(observed), {"id", "counts", "streams", "sensitivity"}, "profile fields")
        joint.same([stream["seed"] for stream in observed["streams"]], scheduled["seeds"]["development"], "seed set/order")
        accumulated = new_counters()
        for stream in observed["streams"]:
            joint.same(set(stream), {"seed", "counts", "sensitivity"}, "stream fields")
            seed = stream["seed"]
            data = pinned_bytes(directory, metadata[f"words/{profile}-{seed}.jsonl.gz"])
            counters = recount_shard(data, profile, seed, manifest["protocol"]["wordsPerReplicate"])
            counts = finish_counts(counters)
            joint.same(stream["counts"], counts, f"independent stream counts {profile}/{seed}")
            maximum_error = max(maximum_error, check_sensitivity(stream["sensitivity"], counts, references))
            combine(accumulated, counters)
            streams += 1
        counts = finish_counts(accumulated)
        joint.same(observed["counts"], counts, "independent profile counts " + profile)
        maximum_error = max(maximum_error, check_sensitivity(observed["sensitivity"], counts, references))
        summary = next(item for item in archived_json["summary.json"]["profiles"] if item["id"] == profile)
        joint.same(counts["words"], summary["words"], "original word count")
        joint.same(counts["lengths"]["phones"]["counts"], summary["phonemeLengths"], "original phone lengths")
        joint.same(counts["lengths"]["syllables"]["counts"], summary["syllableCounts"], "original syllable counts")
        for name, actual in [("phonemes", counts["phones"]["comparison"]["counts"]), ("trigrams", counts["characters"]["trigrams"]["counts"])]:
            joint.same(actual, archived_json["distributions.json.gz"][profile][name], "original distributions " + name)
        words += counts["words"]
        counts_digest.append({"profile": profile, "digest": joint.digest(counts)})
        print(f"{profile}: independently recounted {counts['words']} draws", flush=True)
    joint.same(Path(artifact_path).read_bytes(), artifact_bytes, "joint artifact stayed unchanged")
    joint.same(Path(report_path).read_bytes(), report_bytes, "sensitivity report stayed unchanged")
    joint.same((directory / "manifest.json").read_bytes(), manifest_bytes, "archive manifest stayed unchanged")
    joint.same(joint.sha(Path(source_path).read_bytes()), joint.parser.SOURCE_SHA, "raw corpus stayed unchanged")
    joint.same({path: joint.sha((root / path).read_bytes()) for path in before}, before, "verifier/implementation inputs stayed unchanged")
    return {
        "version": "cmu-sensitivity-independent-verification-v1", "words": words, "streams": streams,
        "originalManifestDigest": ORIGINAL_DIGEST, "jointArtifactDigest": joint.digest(expected_artifact),
        "jointReferenceDigest": joint.digest(expected_artifact["reference"]),
        "sensitivityDigest": envelope["digest"], "sensitivityFileSha256": joint.sha(report_bytes),
        "allRawProfileStreamCountsAndProjectionPathsExact": True, "allOriginalSummaryDistributionsExact": True,
        "allSixLegacyJointDistancesAndDeltasRecomputed": True, "absoluteFloatTolerance": TOLERANCE,
        "maximumAbsoluteFloatError": maximum_error, "profileCountDigests": counts_digest,
        "identityMethod": "canonical keys with original JSON numeric lexemes; metrics independently recomputed",
        "interpretation": "reference sensitivity on unchanged outputs, not generator improvement",
        "verificationSourceSha256": before,
    }


if __name__ == "__main__":
    arguments = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "artifact", "baseline", "report", "out"]:
        arguments.add_argument(f"--{name}", required=True)
    args = arguments.parse_args()
    result = verify(args.source, args.artifact, args.baseline, args.report)
    with open(args.out, "x") as output:
        json.dump(result, output, indent=2, ensure_ascii=False)
        output.write("\n")
    print(json.dumps({key: result[key] for key in ["words", "streams", "maximumAbsoluteFloatError"]}))
