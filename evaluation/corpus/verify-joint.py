"""Independently reconstruct Q15b from pinned CMU bytes; never execute its builder."""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
PARSER_PATH = Path(__file__).with_name("verify-parser.py")
spec = importlib.util.spec_from_file_location("q15_independent_parser", PARSER_PATH)
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

REVISION = "74790861f652b15e4ac49015a90074ad62a27690"
ENTRY_DIGEST = "d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29"
DERIVED_DIGEST = "98d71552d9419d465977520c1101480a1f1ebfa968fb7e3b89eefea30e031878"
SOURCE_PATHS = [
    "evaluation/corpus/cmu.ts", "evaluation/corpus/identity.ts", "evaluation/corpus/joint.ts",
    "evaluation/corpus/joint-artifact.ts", "evaluation/corpus/joint-cli.ts", "evaluation/review/wordlikeness/model.ts",
]
LEGACY_HASHES = {
    "data/cmu/cmu-lexicon-letters.json": "70a5c793cebab577585a5e4414389b38342bf3f07c146d625870f4286469240c",
    "data/cmu/cmu-lexicon-bigrams.json": "c4696557ddb50390298030e8295fb0dba70b03e85c15c525ffab311a8d8f3167",
    "data/cmu/cmu-lexicon-trigrams.json": "acb458d762a95753bed516202812e79201ee6604adb4d94aab2ac256b5553d7b",
    "data/cmu/cmu-length-baseline.json": "f7bd916da8bb33102c28e70cc5a2e34bf58d17c165204d607bc73f60e8754a2e",
    "data/cmu/cmu-lexicon-phonemes.json": "3d7cb879c6ff7edc7599c8d0b57cba72df6ee1d86bf20f723d88b83ff6863aa9",
    "data/cmu/phoneme-normalization.json": "60ffe6783768e66abeaaca798f8da0c1c0d291505bd5798c0641f938e0d495ba",
}
LICENSE_PATH = "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt"
LICENSE_HASH = "bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a"
OLD_MODEL_PATH = "evaluation/review/wordlikeness/artifacts/reference-v1.json"
COMPATIBILITY = {
    "id": "cmu-ascii-first-v1",
    "exclusionOrder": ["alternate_pronunciation", "non_ascii_spelling", "unsupported_pronunciation", "no_vowel", "duplicate_spelling"],
    "spelling": "lowercase-ascii-letters", "pronunciation": "first-valid-unlabelled-entry-in-source-order",
    "weighting": "equal-selected-spelling-types", "phoneProjection": "original-arpabet-with-explicit-vowel-stress",
}
JOINT_DEFINITION = {
    "id": "cmu-joint-ascii-first-v1", "population": COMPATIBILITY, "units": "integer-occurrence-counts",
    "traversal": "one-traversal-per-selected-spelling; longer-entries-contribute-more-events",
    "writtenLength": "ascii-letter-count", "phoneLength": "validated-cmu-token-count",
    "syllableCount": "explicitly-stress-marked-vowel-token-count", "characterBoundaries": "word-internal; no-boundary-markers",
    "labels": "no-POS-familiarity-name-root-dialect-or-token-frequency-annotations",
}
PROJECTIONS = {
    "native": {"id": "cmu-original-stress-tokens-v1", "loss": "none"},
    "base": {"id": "cmu-arpabet-base-v1", "loss": "vowel-stress-0-1-2-merged"},
}


def fail(message):
    raise ValueError(message)


def same(actual, expected, path="artifact"):
    """Exact fields and categories, with booleans distinct from numeric counts."""
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or set(actual) != set(expected):
            fail(f"{path}: fields/categories differ")
        for key in expected:
            same(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            fail(f"{path}: list length/type differs")
        for index, (left, right) in enumerate(zip(actual, expected)):
            same(left, right, f"{path}[{index}]")
    elif isinstance(expected, (int, float)) and not isinstance(expected, bool):
        if isinstance(actual, bool) or not isinstance(actual, (int, float)) or actual != expected:
            fail(f"{path}: numeric value differs")
    elif type(actual) is not type(expected) or actual != expected:
        fail(f"{path}: value differs")


def strict_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                fail(f"Duplicate JSON key: {key}")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs, parse_constant=lambda value: fail(f"Nonfinite JSON value: {value}"))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    """Q15 JSON order, including JS's numeric object-key enumeration.

    Valid references contain safe integers, 0.5, and the recorded percentage
    sum. Finite fractional numbers are encoded by Python's shortest decimal;
    the complete expected-object comparison precedes artifact hash checking.
    """
    if isinstance(value, dict):
        integers = sorted((key for key in value if re.fullmatch(r"0|[1-9][0-9]*", key)
                           and int(key) < 2**32 - 1), key=int)
        others = sorted(set(value) - set(integers), key=lambda key: key.encode("utf-16-be"))
        return {key: canonical(value[key]) for key in integers + others}
    if isinstance(value, list):
        return [canonical(item) for item in value]
    if isinstance(value, float):
        if not math.isfinite(value):
            fail("Nonfinite identity value")
        return int(value) if value.is_integer() else value
    if value is None or isinstance(value, (str, bool, int)):
        return value
    fail("Non-JSON identity value")


def encoded(value, sorted_keys=False):
    return json.dumps(canonical(value) if sorted_keys else value, ensure_ascii=False,
                      separators=(",", ":"), allow_nan=False).encode("utf-8")


def digest(value):
    return sha(encoded(value, sorted_keys=True))


def histogram(counts):
    return {"total": sum(counts.values()), "counts": dict(counts)}


def character_tables(spellings):
    result = {}
    for width, name in enumerate(["letters", "bigrams", "trigrams"], 1):
        counts = Counter()
        for spelling in spellings:
            counts.update(spelling[index:index + width] for index in range(len(spelling) - width + 1))
        result[name] = histogram(counts)
    return result


def reconstruct_joint(entries):
    written, phones, syllables = Counter(), Counter(), Counter()
    conditional = defaultdict(lambda: {"written": Counter(), "phones": Counter()})
    native, base, stress, patterns = Counter(), Counter(), Counter(), Counter()
    for entry in entries:
        tokens, spelling = entry["tokens"], entry["spelling"]
        marks = [token[-1] for token in tokens if token[-1] in "012"]
        key = str(len(marks))
        written[str(len(spelling))] += 1
        phones[str(len(tokens))] += 1
        syllables[key] += 1
        conditional[key]["written"][str(len(spelling))] += 1
        conditional[key]["phones"][str(len(tokens))] += 1
        native.update(tokens)
        base.update(token[:-1] if token[-1] in "012" else token for token in tokens)
        stress.update(marks)
        patterns[" ".join(marks)] += 1
    lengths = {
        "written": histogram(written), "phones": histogram(phones), "syllables": histogram(syllables),
        "bySyllables": {key: {name: histogram(counts) for name, counts in tables.items()} for key, tables in conditional.items()},
    }
    phone_tables = {"native": histogram(native), "base": histogram(base), "vowelStress": histogram(stress), "stressPatterns": histogram(patterns)}
    return character_tables([entry["spelling"] for entry in entries]), lengths, phone_tables


def reconstruct_derived(entries, excluded):
    """Reimplement #304's documented maximal observed initial-onset analysis."""
    onsets = {""}
    for entry in entries:
        tokens = entry["tokens"]
        first_vowel = next(index for index, token in enumerate(tokens) if token[-1] in "012")
        onsets.add(" ".join(tokens[:first_vowel]))
    constituents, characters = defaultdict(Counter), defaultdict(Counter)
    for entry in entries:
        tokens = entry["tokens"]
        vowels = [index for index, token in enumerate(tokens) if token[-1] in "012"]
        start = 0
        for index, vowel in enumerate(vowels):
            final = index == len(vowels) - 1
            boundary = len(tokens)
            if not final:
                following = vowels[index + 1]
                boundary = next(candidate for candidate in range(vowel + 1, following + 1)
                                if " ".join(tokens[candidate:following]) in onsets)
            stress = "unstressed" if tokens[vowel].endswith("0") else "stressed"
            onset_position, rime_position = ("initial" if index == 0 else "medial"), ("final" if final else "medial")
            constituents[f"onset:{onset_position}:{stress}"][" ".join(tokens[start:vowel])] += 1
            rime = [tokens[vowel][:-1], *tokens[vowel + 1:boundary]]
            constituents[f"rime:{rime_position}:{stress}"][" ".join(rime)] += 1
            start = boundary
        spelling = "^^" + entry["spelling"] + "$"
        for index in range(2, len(spelling)):
            characters[spelling[index - 2:index]][spelling[index]] += 1
    return {
        "version": "wordlikeness-v1",
        "corpus": {"name": "CMU Pronouncing Dictionary", "revision": REVISION, "sha256": parser.SOURCE_SHA,
                   "accepted": len(entries), "excluded": excluded},
        "method": {"syllabification": "maximal-observed-initial-onset-v1", "stress": "primary-and-secondary-stressed",
                   "pronunciation": "first-unlabelled-entry-per-ascii-spelling", "onset_rime": "MLE-no-backoff-null-for-zero",
                   "spelling_alpha": 0.5, "spelling_vocabulary": 27, "log_base": "e"},
        "initial_onsets": sorted(onsets),
        "constituents": {key: histogram(counts) for key, counts in constituents.items()},
        "characters": {key: histogram(counts) for key, counts in characters.items()},
    }


def length_stats(counts):
    total = sum(counts.values())
    def quantile(fraction):
        target, consumed = math.floor(total * fraction), 0
        for value in sorted(counts, key=int):
            consumed += counts[value]
            if consumed > target:
                return int(value)
        fail("Empty length distribution")
    mean = math.floor(sum(int(key) * count for key, count in counts.items()) / total * 100 + 0.5) / 100
    return {"mean": mean, "median": quantile(0.5), "p10": quantile(0.1), "p90": quantile(0.9)}


def reconstruct_legacy(text):
    spellings = set()
    written, syllables, conditional = Counter(), Counter(), defaultdict(Counter)
    for raw in text.split("\n"):
        line = raw.strip()
        if line and not line.startswith(";;;"):
            label = re.split(r"\s+#", line)[0].split()[0]
            if re.fullmatch("[a-zA-Z]+", label):
                spellings.add(label.lower())
        if not raw or raw.startswith(";;;") or " " not in raw:
            continue
        label, pronunciation = raw.split(" ", 1)
        label = re.sub(r"\([0-9]+\)$", "", label)
        count = len(re.findall("[0-9]", pronunciation.strip()))
        if not label or not count:
            continue
        length = str(len(label.encode("utf-16-le")) // 2)
        written[length] += 1
        syllables[str(count)] += 1
        conditional[str(count)][length] += 1
    return len(spellings), character_tables(spellings), {
        "total": sum(written.values()), "byLen": dict(written), "bySyl": dict(syllables),
        "bySylLen": {key: {"count": sum(counts.values()), "byLen": dict(counts), "stats": length_stats(counts)}
                     for key, counts in conditional.items()},
        "overallStats": length_stats(written),
    }


def read_sources(root, paths):
    return [{"path": path, "content": (root / path).read_bytes().decode("utf-8")} for path in paths]


def prepare(source_path, root=ROOT):
    """Pin inputs and independently derive the entire expected artifact."""
    source = Path(source_path).read_bytes()
    same(sha(source), parser.SOURCE_SHA, "raw source SHA-256")
    text = source.decode("utf-8")
    entries, _, excluded, records = parser.count_source(text)
    same(records, {"entry": 135166, "comment": 0, "blank": 0}, "source accounting")
    same(len(entries), 117485, "selected entries")
    same(excluded, {"non_ascii_spelling": 8559, "alternate_pronunciation": 9114, "no_vowel": 8}, "exclusions")
    same(sha(encoded(entries)), ENTRY_DIGEST, "source-derived entry digest")
    characters, lengths, phones = reconstruct_joint(entries)
    derived = reconstruct_derived(entries, excluded)
    old_bytes = (root / OLD_MODEL_PATH).read_bytes()
    same(sha(old_bytes), parser.OLD_REFERENCE_SHA, "unchanged #304 artifact bytes")
    old_model = strict_json(old_bytes)
    same(derived, old_model["model"], "independent #304 reconstruction")
    same(digest(derived), DERIVED_DIGEST, "#304 model digest")
    reference = {
        "version": "cmu-joint-ascii-first-v1", "source": {"revision": REVISION, "sha256": sha(source), "bytes": len(source)},
        "parser": "cmu-lossless-records-v1",
        "population": {"definition": JOINT_DEFINITION, "entryDigest": ENTRY_DIGEST, "accepted": len(entries), "excluded": excluded},
        "projections": PROJECTIONS, "characters": characters, "lengths": lengths, "phones": phones, "derived": derived,
    }
    implementation = read_sources(root, SOURCE_PATHS)
    legacy_files = read_sources(root, LEGACY_HASHES)
    for file in legacy_files:
        same(sha(file["content"].encode()), LEGACY_HASHES[file["path"]], "legacy bytes: " + file["path"])
    legacy_data = {file["path"]: strict_json(file["content"]) for file in legacy_files}
    legacy_accepted, legacy_characters, legacy_lengths = reconstruct_legacy(text)
    for name in characters:
        same(legacy_characters[name]["counts"], legacy_data[f"data/cmu/cmu-lexicon-{name}.json"], f"independent legacy {name}")
    # The historic file has descriptive fields too; each numeric table and summary
    # is independently reconstructed, and its complete bytes are pinned above.
    length_data = legacy_data["data/cmu/cmu-length-baseline.json"]
    for field, value in legacy_lengths.items():
        same(value, length_data[field], "independent legacy length " + field)
    mapping = legacy_data["data/cmu/phoneme-normalization.json"]["arpabetToIpa"]
    mapped, unmapped = Counter(), Counter()
    for token, count in phones["base"]["counts"].items():
        if token in mapping:
            mapped[mapping[token]] += count
        else:
            unmapped[token] += count
    projection = {
        "id": "cmu-base-to-legacy-ipa-v1", "mapping": mapping,
        "losses": "stress-already-removed; legacy-IPA-labels-do-not-establish-phonemic-or-dialect-equivalence",
        "inputEvents": phones["base"]["total"], "mapped": histogram(mapped), "unmapped": histogram(unmapped),
    }
    displayed_sum = 0.0
    for value in legacy_data["data/cmu/cmu-lexicon-phonemes.json"].values():
        displayed_sum += value
    license_file = read_sources(root, [LICENSE_PATH])[0]
    same(sha(license_file["content"].encode()), LICENSE_HASH, "license bytes")
    result = {
        "version": "cmu-joint-reference-artifact-v1", "reference": reference, "comparisonProjection": projection,
        "legacy": {
            "artifacts": legacy_files,
            "characters": {"id": "legacy-ascii-spelling-types-including-vowelless-v1", "accepted": legacy_accepted,
                           "units": "integer-character-occurrences", "reconstruction": "all-bins-exact-from-pinned-source; historical-build-provenance-unverified",
                           "counts": legacy_characters},
            "lengths": {"id": "legacy-all-pronunciation-lines-digit-count-v1", "accepted": legacy_lengths["total"],
                        "units": "integer-pronunciation-line-counts", "reconstruction": "all-bins-and-summary-stats-exact-from-pinned-source; historical-build-provenance-unverified"},
            "phones": {"id": "legacy-phone-rounded-percentages-unresolved-population-v1", "units": "rounded-percentage",
                       "denominator": None, "sourcePopulation": "unresolved", "displayedSum": displayed_sum},
        },
        "implementation": {"digest": digest(implementation), "sources": implementation},
        "license": {**license_file, "sha256": LICENSE_HASH},
    }
    return result


def validate(envelope, expected):
    if not isinstance(envelope, dict):
        fail("Envelope must be an object")
    same(set(envelope), {"digest", "artifact"}, "envelope fields")
    same(envelope["artifact"], expected)
    same(envelope["digest"], digest(expected), "envelope digest")


def verify(source_path, artifact_path, root=ROOT):
    watched = [*SOURCE_PATHS, *LEGACY_HASHES, LICENSE_PATH, OLD_MODEL_PATH, "evaluation/corpus/verify-parser.py", "evaluation/corpus/verify-joint.py"]
    before = {path: sha((root / path).read_bytes()) for path in watched}
    raw_artifact = Path(artifact_path).read_bytes()
    expected = prepare(source_path, root)
    validate(strict_json(raw_artifact), expected)
    same(sha(Path(source_path).read_bytes()), parser.SOURCE_SHA, "raw source stable during verification")
    same(Path(artifact_path).read_bytes(), raw_artifact, "artifact stable during verification")
    same({path: sha((root / path).read_bytes()) for path in watched}, before, "verification sources stable")
    reference = expected["reference"]
    return {
        "version": "cmu-joint-independent-verification-v1", "rawSourceSha256": parser.SOURCE_SHA,
        "artifactSha256": sha(raw_artifact), "artifactDigest": digest(expected),
        "referenceDigest": digest(reference),
        "entryDigest": ENTRY_DIGEST, "accepted": reference["population"]["accepted"],
        "characterEvents": {name: value["total"] for name, value in reference["characters"].items()},
        "nativePhoneEvents": reference["phones"]["native"]["total"],
        "vowelStressEvents": reference["phones"]["vowelStress"],
        "legacyCharacterEntries": expected["legacy"]["characters"]["accepted"],
        "legacyLengthEntries": expected["legacy"]["lengths"]["accepted"],
        "completeJointTableReconstruction": True, "completeDerivedModelReconstruction": True,
        "completeLegacyCharacterAndLengthReconstruction": True, "completeEnvelopeAndSourceIdentity": True,
        "legacyPhonePopulationAndDenominator": "unresolved; no integer counts inferred from rounded percentages",
        "priorReferenceSha256": parser.OLD_REFERENCE_SHA, "derivedModelDigest": DERIVED_DIGEST,
        "implementationDigest": expected["implementation"]["digest"], "verificationSourceSha256": before,
    }


def main():
    arguments = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "artifact", "out"]:
        arguments.add_argument(f"--{name}", required=True)
    args = arguments.parse_args()
    report = verify(args.source, args.artifact)
    with open(args.out, "x") as output:
        json.dump(report, output, indent=2, ensure_ascii=False)
        output.write("\n")
    print(json.dumps({key: report[key] for key in ["accepted", "nativePhoneEvents", "completeJointTableReconstruction"]}))


if __name__ == "__main__":
    main()
