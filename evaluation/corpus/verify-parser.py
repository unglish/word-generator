"""Independent pinned-source recount and complete #304 semantic parity check."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_SHA = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22"
OLD_REFERENCE_SHA = "3006f65d7039820a428ba3419b63fd486de17fb3ccbb1f9d24c1cda354ffe3de"
OLD_SCORES_SHA = "a39b126fc0d45f351c8831986324b5bf0a5553eaa9f78fa2409e1084bf65eddc"
VOWELS = set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split())
CONSONANTS = set("B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH".split())


def sha(value):
    return hashlib.sha256(value).hexdigest()


def encoded(value, canonical=False):
    return json.dumps(value, ensure_ascii=False, sort_keys=canonical, separators=(",", ":")).encode()


def read_json(filename):
    return json.loads(Path(filename).read_bytes())


def count_source(text):
    entries, rejections, excluded, seen = [], [], {}, set()
    counts = {"entry": 0, "comment": 0, "blank": 0}
    for line_number, original in enumerate(text.splitlines(), 1):
        line = original.strip()
        if not line:
            counts["blank"] += 1
            continue
        if line.startswith(";;;"):
            counts["comment"] += 1
            continue
        counts["entry"] += 1
        label, *tokens = re.split(r"\s+#", line)[0].split()
        reason = None
        if re.search(r"\(\d+\)$", label):
            reason = "alternate_pronunciation"
        elif not re.fullmatch("[a-zA-Z]+", label):
            reason = "non_ascii_spelling"
        elif not tokens or any(token not in CONSONANTS and not (
            re.fullmatch("[A-Z]+[012]", token) and token[:-1] in VOWELS
        ) for token in tokens):
            reason = "unsupported_pronunciation"
        elif not any(token[-1:] in ("0", "1", "2") for token in tokens):
            reason = "no_vowel"
        elif label.lower() in seen:
            reason = "duplicate_spelling"
        if reason:
            excluded[reason] = excluded.get(reason, 0) + 1
            rejections.append({"line": line_number, "label": label, "reason": reason})
        else:
            seen.add(label.lower())
            entries.append({"line": line_number, "label": label, "spelling": label.lower(), "tokens": tokens})
    return entries, rejections, excluded, counts


def verify(source_path, audit_path, reference_path, scores_path):
    source = Path(source_path).read_bytes()
    assert sha(source) == SOURCE_SHA, "Wrong raw source bytes"
    audit, reference, scores = map(read_json, [audit_path, reference_path, scores_path])
    assert audit["version"] == "cmu-source-audit-v1"
    assert audit["source"]["sha256"] == SOURCE_SHA
    assert audit["source"]["bytes"] == len(source)
    assert audit["source"]["revision"] == "74790861f652b15e4ac49015a90074ad62a27690"
    assert audit["source"]["file"] == "cmudict.dict"
    license_info = audit["source"]["license"]
    assert license_info["path"] == "evaluation/review/wordlikeness/artifacts/CMUDICT-LICENSE.txt"
    assert sha((ROOT / license_info["path"]).read_bytes()) == license_info["sha256"]
    entries, rejections, excluded, counts = count_source(source.decode())
    assert counts == audit["records"] == {"entry": 135166, "comment": 0, "blank": 0}
    assert excluded == audit["population"]["excluded"] == {"non_ascii_spelling": 8559, "alternate_pronunciation": 9114, "no_vowel": 8}
    assert rejections == audit["rejections"]
    assert len(entries) == audit["population"]["accepted"] == 117485
    assert sha(encoded(entries)) == audit["population"]["entryDigest"]
    assert audit["population"]["units"] == "integer-selected-entry-count"
    assert audit["population"]["policy"] == "cmu-ascii-first-v1"
    assert audit["population"]["definition"] == {
        "id": "cmu-ascii-first-v1",
        "exclusionOrder": ["alternate_pronunciation", "non_ascii_spelling", "unsupported_pronunciation", "no_vowel", "duplicate_spelling"],
        "spelling": "lowercase-ascii-letters", "pronunciation": "first-valid-unlabelled-entry-in-source-order",
        "weighting": "equal-selected-spelling-types", "phoneProjection": "original-arpabet-with-explicit-vowel-stress",
    }
    assert sha(encoded(audit["population"]["definition"])) == audit["population"]["policyDigest"]
    sources = audit["parser"]["sources"]
    assert [item["path"] for item in sources] == ["evaluation/corpus/cmu.ts", "evaluation/corpus/audit.ts", "evaluation/review/wordlikeness/model.ts"]
    assert audit["parser"]["version"] == "cmu-lossless-records-v1"
    assert sha(encoded(sources)) == audit["parser"]["implementationSha256"]
    for item in sources:
        assert (ROOT / item["path"]).read_text() == item["content"], "Audit source differs from current implementation"
    old_directory = ROOT / "evaluation/review/wordlikeness/artifacts"
    old_reference_bytes = (old_directory / "reference-v1.json").read_bytes()
    old_score_bytes = (old_directory / "frozen-scores-v1.json").read_bytes()
    assert sha(old_reference_bytes) == OLD_REFERENCE_SHA
    assert sha(old_score_bytes) == OLD_SCORES_SHA
    old_reference, old_scores = json.loads(old_reference_bytes), json.loads(old_score_bytes)
    assert set(reference) == set(old_reference)
    assert set(scores) == set(old_scores)
    assert reference["model"] == old_reference["model"], "Model semantics changed"
    assert reference["digest"] == old_reference["digest"]
    assert reference["version"] == old_reference["version"] == scores["version"] == old_scores["version"]
    implementation_paths = [f"evaluation/review/wordlikeness/{name}.ts" for name in ["model", "score", "artifact"]] + ["evaluation/corpus/cmu.ts"]
    implementation = sha(encoded([{"path": name, "sha256": sha((ROOT / name).read_bytes())} for name in implementation_paths], canonical=True))
    assert reference["implementation_digest"] == scores["implementation_digest"] == implementation
    assert implementation != old_reference["implementation_digest"], "Extraction was not given new provenance"
    assert scores["studies"] == old_scores["studies"], "Frozen sample, score component or diagnostic changed"
    assert scores["comparator_digest"] == old_scores["comparator_digest"]
    assert scores["model_digest"] == old_scores["model_digest"] == reference["digest"]
    assert [len(study["rows"]) for study in scores["studies"]] == [200, 200]
    # Retain the scorer's exact JavaScript numeric canonicalization for its hash.
    # Population recounting and all semantic comparisons above are independent.
    subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e",
                    'import {readFileSync} from "node:fs"; import {validateMachineArtifact} from "./evaluation/review/wordlikeness/artifact.ts"; validateMachineArtifact(JSON.parse(readFileSync(process.argv[1], "utf8")));',
                    str(Path(scores_path).resolve())], cwd=ROOT, check=True, capture_output=True)
    return {
        "version": "cmu-parser-parity-v1", "sourceSha256": SOURCE_SHA,
        "entryDigest": audit["population"]["entryDigest"], "records": counts, "accepted": len(entries), "excluded": excluded,
        "independentSourceAccounting": True, "completeModelEquality": True, "completeFrozenScoreRowsEquality": True,
        "frozenScoreRows": 400, "priorReferenceSha256": OLD_REFERENCE_SHA, "priorScoresSha256": OLD_SCORES_SHA,
        "priorImplementationDigest": old_reference["implementation_digest"], "implementationDigest": implementation,
        "sourceAuditSha256": sha(Path(audit_path).read_bytes()), "referenceSha256": sha(Path(reference_path).read_bytes()),
        "scoresSha256": sha(Path(scores_path).read_bytes()), "verifierSha256": sha(Path(__file__).read_bytes()),
        "scoreArtifactIntegrity": "validated with the pinned JavaScript canonicalizer",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["source", "audit", "reference", "scores", "out"]:
        parser.add_argument(f"--{name}", required=True)
    args = parser.parse_args()
    report = verify(args.source, args.audit, args.reference, args.scores)
    with open(args.out, "x") as output:
        json.dump(report, output, indent=2)
        output.write("\n")
    print(json.dumps({"accepted": report["accepted"], "frozenScoreRows": report["frozenScoreRows"], "completeModelEquality": True}))
