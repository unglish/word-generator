"""Reconstruct the CMU root ledger by stripping each candidate surface spelling."""
import argparse
from collections import Counter, defaultdict
from functools import lru_cache
import importlib.util
import io
from pathlib import Path
import re
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("verify_joint", HERE / "verify-joint.py")
joint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(joint)
ROOT = joint.ROOT

SCOWL = {
    "version": "2020.12.07",
    "url": "https://deb.debian.org/debian/pool/main/s/scowl/scowl_2020.12.07.orig.tar.gz",
    "sha256": "5587667caa20c4891390c2d42dbb4d5c4c3f41bee77af1457ece3ba23fb859cc",
    "license": "scowl-2020.12.07/Copyright",
    "size": 60,
}
WORDNET = {
    "version": "3.0",
    "url": "https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz",
    "sha256": "640db279c949a88f61f851dd54ebbb22d003f8b90b85267042ef85a3781d3a52",
    "license": "WordNet-3.0/LICENSE",
}
CMU = {
    "revision": joint.REVISION,
    "url": f"https://raw.githubusercontent.com/cmusphinx/cmudict/{joint.REVISION}/cmudict.dict",
    "sha256": joint.parser.SOURCE_SHA,
    "license": joint.LICENSE_PATH,
}
PROJECTION = "data/cmu/phoneme-normalization.json"
SOURCES = [
    "evaluation/corpus/cmu.ts", "evaluation/corpus/identity.ts", "evaluation/corpus/joint.ts",
    "evaluation/corpus/root-cli.ts", "evaluation/corpus/root-reference.ts", "evaluation/corpus/root-stripping.ts",
    "evaluation/corpus/root-config.ts", "evaluation/review/wordlikeness/model.ts",
    "src/config/english.ts", "src/config/weights.ts", "src/elements/phonemes.ts",
    PROJECTION, CMU["license"],
]
ASCII = re.compile(r"[a-z]+")
REDUCED = {"AH0", "IH0"}
LOW_BACK = {"AA", "AO"}


def pinned(path, definition):
    raw = path.read_bytes()
    joint.same(joint.sha(raw), definition["sha256"], path.name + " SHA-256")
    return raw


def unpack_scowl(raw):
    common, names = set(), set()
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
        for member in archive:
            suffix = re.fullmatch(
                r"scowl-2020\.12\.07/final/(?:american|english)-(words|proper-names|upper)\.(\d+)", member.name)
            if not suffix or int(suffix[2]) > SCOWL["size"]:
                continue
            words = archive.extractfile(member).read().decode("latin1").split("\n")
            if suffix[1] == "words":
                common.update(word for word in words if ASCII.fullmatch(word))
            else:
                names.update(word.lower() for word in words if ASCII.fullmatch(word.lower()))
    return common, names


def unpack_exceptions(raw):
    index = defaultdict(set)
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
        for part in ("adj", "adv", "noun", "verb"):
            text = archive.extractfile(f"WordNet-3.0/dict/{part}.exc").read().decode("latin1")
            for row in text.splitlines():
                word, *lemmas = row.split()
                bases = {lemma for lemma in lemmas if lemma != word and ASCII.fullmatch(lemma)}
                if ASCII.fullmatch(word) and bases:
                    index[word].update(bases)
    return {word: sorted(lemmas) for word, lemmas in index.items()}


def config_from_checkout(root):
    # Only import config data. The verifier never invokes the root builder.
    data = subprocess.check_output([
        "node", "--import", "tsx", "--input-type=module", "-e",
        "import { rootConfig } from './evaluation/corpus/root-config.ts'; console.log(JSON.stringify(rootConfig));",
    ], cwd=root)
    return joint.strict_json(data)


def condition_matches(test, stem, ipa, features):
    edge = stem[0 if test["position"] == "following" else -1].rstrip("012")
    sound = ipa[edge]
    traits = features.get("ɚ" if edge == "ER" else sound, {})
    return (("sounds" not in test or sound in test["sounds"])
            and ("voiced" not in test or traits.get("voiced") == test["voiced"])
            and all(key not in test or traits.get(key) in test[key] for key in ("manner", "place")))


def variant_forms(affix, stem, ipa, features):
    matches = [v for v in affix["allomorphs"] if condition_matches(v["phonologicalCondition"], stem, ipa, features)]
    specific = [v for v in matches if v["phonologicalCondition"].keys() & {"place", "manner", "sounds"}]
    return [(v.get("written", affix["written"]), v["phonemes"]) for v in (specific or matches or [affix])]


def spelling_hypotheses(word, affix, forms):
    """Invert the surface string before looking up any stem or checking phones."""
    base = affix["written"]
    for written in forms:
        if affix["type"] == "prefix":
            if word.startswith(written):
                yield word[len(written):], written, "direct", written
            continue
        if word.endswith(written):
            remaining = word[:-len(written)]
            if not (base == "s" and written == "es" and remaining.endswith("e")):
                yield remaining, written, "direct", written
        if base == "s" and word.endswith("es"):
            if written == "es":
                yield word[:-1], written, "shared-e", "s"
            elif written == "s" and re.search(r"[^aeiou]oes$", word):
                yield word[:-2], written, "o-es", "es"
        for transform in affix["transforms"]:
            join = transform["name"]
            ending = transform["affixWritten"] or written
            if not word.endswith(ending):
                continue
            remaining = word[:-len(ending)]
            if join == "y-to-i" and re.search(r"[^aeiou]i$", remaining):
                yield remaining[:-1] + "y", written, join, ending
            elif join == "drop-silent-e":
                yield remaining + "e", written, join, written
            elif join == "double-consonant" and re.search(r"[^aeiou][aeiou]([bcdfghlmnprst])\1$", remaining):
                yield remaining[:-1], written, join, written
            elif join == "collapse-triple-letter" and remaining.endswith(written[0]):
                yield remaining + written[0], written, join, written


def join_allowed(join, spelling, stem, ipa):
    if join == "double-consonant":
        return (len(stem) >= 2 and stem[-2][-1] in "12"
                and stem[-2][:-1] in {"AE", "AH", "EH", "IH", "AA", "AO", "UH"}
                and ipa[stem[-1].rstrip("012")] == spelling[-1])
    if join == "drop-silent-e":
        return stem[-1] in joint.parser.CONSONANTS
    return True


def match_phones(word, stem, written, affix, affix_phones, join, ipa, features):
    prefix = affix["type"] == "prefix"
    edge_index = 0 if prefix else -1
    boundary = stem[edge_index]
    cost = 0
    if len(word) == len(stem) + len(affix_phones) - 1:
        if boundary in joint.parser.CONSONANTS and ipa[boundary] == affix_phones[-1 if prefix else 0]:
            affix_phones = affix_phones[:-1] if prefix else affix_phones[1:]
            cost = 1
        elif join == "drop-silent-e" and re.search(r"[^aeiou]le$", written) and stem[-2:] == ["AH0", "L"]:
            stem = stem[:-2] + [boundary]
            cost = 1
    if len(word) != len(stem) + len(affix_phones):
        return None
    attached, retained = (word[:len(affix_phones)], word[len(affix_phones):]) if prefix else (
        word[len(stem):], word[:len(stem)])
    for token, expected in zip(attached, affix_phones):
        base = token.rstrip("012")
        if expected in {ipa[base], {"ER": "ɚ", "AH": "ʌ"}.get(base)}:
            continue
        if ((token, expected) in {("AH0", "ɪ"), ("IH0", "ə"), ("IH0", "i:")}
                or (prefix and affix["written"] == "re" and base == "IY" and expected == "ɪ")):
            cost += 1
        else:
            return None
    shifts = 0
    for i, (observed, original) in enumerate(zip(retained, stem)):
        left, right = observed.rstrip("012"), original.rstrip("012")
        if left == right:
            continue
        if i == (0 if prefix else len(stem) - 1) and any(
                rule["replaceSound"] == ipa[left]
                and (not rule["condition"] or condition_matches(rule["condition"], stem, ipa, features))
                and (rule["writtenMatch"] is None or re.search(
                    rule["writtenMatch"], written, re.I if "i" in rule["flags"] else 0))
                for rule in affix["edgeRules"]):
            cost += 1
        elif (({left, right} == LOW_BACK) or ({observed, original} == REDUCED)
                or (join == "y-to-i" and i == len(stem) - 1 and right == "IY" and observed in REDUCED)):
            cost += 1
        elif (left in joint.parser.VOWELS and right in joint.parser.VOWELS
              and affix["stressEffect"] == "attract-preceding" and shifts == 0):
            cost += 2
            shifts += 1
        else:
            return None
    return cost


def reconstruct_ledger(entries, common, names, exceptions, config, ipa):
    eligible = {row["spelling"]: row["tokens"] for row in entries if row["spelling"] in common}
    affixes = config["affixes"]
    forms = [sorted({a["written"], *(v.get("written", a["written"]) for v in a["allomorphs"])}) for a in affixes]
    features = config["features"]

    @lru_cache(maxsize=None)
    def strip_one(word):
        candidates = []
        for i, affix in enumerate(affixes):
            for stem, form, join, written in spelling_hypotheses(word, affix, forms[i]):
                if stem not in eligible or len(stem) >= len(word) or not join_allowed(join, stem, eligible[stem], ipa):
                    continue
                if word in exceptions and stem not in exceptions[word]:
                    continue
                for surface, phones in variant_forms(affix, eligible[stem], ipa, features):
                    if surface != form:
                        continue
                    cost = match_phones(eligible[word], eligible[stem], stem, affix, phones, join, ipa, features)
                    if cost is not None:
                        direction = affix["type"]
                        rank = (cost, -len(written), direction == "prefix",
                                join != "direct", i, stem, join)
                        step = {"type": direction, "affix": affix["written"], "written": written, "join": join, "stem": stem}
                        candidates.append((rank, step))
        return min(candidates, key=lambda candidate: candidate[0])[1] if candidates else None

    rows = []
    for source in entries:
        word = source["spelling"]
        row = {"spelling": word, "line": source["line"], "stem": None, "steps": []}
        if word not in eligible:
            row["status"] = "name-or-uppercase" if word in names else "outside-common-list"
            rows.append(row)
            continue
        stem = word
        while step := strip_one(stem):
            row["steps"].append(step)
            stem = step["stem"]
        row["stem"] = stem
        counts = Counter(step["type"] for step in row["steps"])
        if max(counts.values(), default=0) > 1:
            row["status"] = "too-many-affixes"
        elif stem in exceptions:
            row.update(status="residue", lemmas=exceptions[stem])
        else:
            templates = {(): "bare", ("prefix",): "prefixed", ("suffix",): "suffixed", ("prefix", "suffix"): "both"}
            row.update(status="included", template=templates[tuple(sorted(counts))])
        rows.append(row)
    return rows


def summarize(entries, ledger, ipa):
    def coda(entry):
        tokens = entry["tokens"]
        last_vowel = max(i for i, token in enumerate(tokens) if token[-1] in "012")
        return " ".join(ipa[p] for p in tokens[last_vowel + 1:])

    included = [row for row in ledger if row["status"] == "included"]
    root_words = {row["stem"] for row in included}
    roots = [entry for entry in entries if entry["spelling"] in root_words]
    ending = {entry["spelling"]: ipa[entry["tokens"][-1].rstrip("012")] for entry in roots}
    lengths = defaultdict(Counter)
    for root in roots:
        length = len(root["tokens"])
        syllables = sum(token[-1] in "012" for token in root["tokens"])
        lengths[str(length)][str(syllables)] += 1
    suffixes = defaultdict(Counter)
    for row in included:
        for step in row["steps"]:
            if step["type"] == "suffix":
                suffixes[step["affix"]][ending[row["stem"]]] += 1

    hist = joint.histogram
    tables = {
        "outcomes": hist(Counter(row["status"] for row in ledger)),
        "templates": hist(Counter(row["template"] for row in included)),
        "affixes": hist(Counter(step["type"] + ":" + step["affix"] for row in included for step in row["steps"])),
        "allStrips": hist(Counter(step["type"] + ":" + step["affix"] for row in ledger for step in row["steps"])),
        "suffixByFinal": {suffix: hist(counts) for suffix, counts in suffixes.items()},
        "syllables": hist(sum(lengths.values(), Counter())),
        "phones": hist({length: sum(counts.values()) for length, counts in lengths.items()}),
        "syllablesByPhones": {length: hist(counts) for length, counts in lengths.items()},
        "codas": {
            "full": hist(Counter(map(coda, entries))),
            "common": hist(Counter(coda(entry) for entry, row in zip(entries, ledger) if row["stem"] is not None)),
            "roots": hist(Counter(map(coda, roots))),
        },
    }
    return roots, tables


def prepare(source, scowl, wordnet, root=ROOT):
    entries, _, _, _ = joint.parser.count_source(pinned(source, CMU).decode("utf8"))
    entry_digest = joint.sha(joint.parser.encoded(entries))
    joint.same(entry_digest, joint.ENTRY_DIGEST, "source-derived joint entry digest")
    common, names = unpack_scowl(pinned(scowl, SCOWL))
    exceptions = unpack_exceptions(pinned(wordnet, WORDNET))
    config = config_from_checkout(root)
    ipa = joint.strict_json((root / PROJECTION).read_bytes())["arpabetToIpa"]
    ledger = reconstruct_ledger(entries, common, names, exceptions, config, ipa)
    roots, tables = summarize(entries, ledger, ipa)
    return {
        "version": "cmu-common-root-reference-v1",
        "sources": {"cmu": CMU, "scowl": SCOWL, "wordnet": WORDNET},
        "population": {"version": "cmu-joint-ascii-first-v1", "parser": "cmu-lossless-records-v1",
                       "selected": len(entries), "entryDigest": entry_digest},
        "implementation": [{"path": p, "sha256": joint.sha((root / p).read_bytes())} for p in SOURCES],
        "config": config, "ledger": ledger, "roots": roots, "tables": tables,
    }


def validate(envelope, expected):
    actual = envelope.get("artifact")
    joint.same(actual, expected, "artifact")
    joint.same(envelope, {"artifact": expected, "digest": joint.digest(expected)}, "envelope")


def path_args():
    cli = argparse.ArgumentParser(description=__doc__)
    for name in ("source", "scowl", "wordnet", "artifact"):
        cli.add_argument("--" + name, required=True, type=Path)
    return cli


if __name__ == "__main__":
    args = path_args().parse_args()
    artifact = prepare(args.source, args.scowl, args.wordnet)
    envelope = joint.strict_json(args.artifact.read_bytes())
    validate(envelope, artifact)
    print(f"Verified {len(artifact['ledger']):,} ledger rows, {len(artifact['roots']):,} roots and all tables.")
