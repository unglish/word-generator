#!/usr/bin/env python3
"""Build the audited English lexicon sampling and gate references from Phase 1."""

import argparse
from collections import Counter, defaultdict
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PHASE_ONE_DIGEST = "2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467"
CMU_SHA256 = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22"
TEMPLATES = ("bare", "suffixed", "prefixed", "both")


def syllable_count(tokens):
    return sum(phone[-1].isdigit() for phone in tokens)


def probabilities(counts):
    total = sum(counts.values())
    return {key: count / total for key, count in counts.items()}


def target_root_weights(measured, transitions, target):
    """Fit root-length mass to full CMU by EM on the root → surface mixture."""
    weights = probabilities(measured)
    for _ in range(300):
        expected = Counter()
        for root, mass in weights.items():
            for surface, chance in transitions[root].items():
                expected[surface] += mass * chance
        weights = probabilities({
            root: mass * sum(chance * target.get(surface, 0) / expected[surface]
                             for surface, chance in transitions[root].items()
                             if expected[surface])
            for root, mass in weights.items()
        })
    return weights


def write_json(path, value):
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def build(artifact, source, transition_sample):
    projection = json.loads((ROOT / "data/cmu/phoneme-normalization.json").read_text())["arpabetToIpa"]

    def final_coda(tokens):
        last_vowel = max(i for i, phone in enumerate(tokens) if phone[-1].isdigit())
        return " ".join(projection[phone] for phone in tokens[last_vowel + 1:])

    ledger = artifact["ledger"]
    lines = source.decode("utf-8").split("\n")
    full = {row["spelling"]: lines[row["line"] - 1].split("#", 1)[0].split()[1:] for row in ledger}
    roots = {row["spelling"]: row["tokens"] for row in artifact["roots"]}
    audit = json.loads((ROOT / "evaluation/corpus/root-coda-exclusions.json").read_text())
    exclusions = {word for coda, words in audit.items() for word in words if final_coda(roots[word]) == coda}
    if len(exclusions) != sum(map(len, audit.values())):
        raise ValueError("Duplicate or mismatched audited root coda")

    rows = [row for row in ledger if row["status"] == "included" and row["stem"] not in exclusions]
    templates, transitions = defaultdict(Counter), defaultdict(Counter)
    joint, affixes, codas, root_phones = Counter(), Counter(), Counter(), Counter()
    for row in rows:
        tokens = roots[row["stem"]]
        syllables = syllable_count(tokens)
        joint[len(tokens), syllables] += 1
        templates[syllables][row["template"]] += 1
        transitions[syllables][min(6, syllable_count(full[row["spelling"]]))] += 1
        for step in row["steps"]:
            affixes[step["affix"]] += 1
        coda = final_coda(tokens)
        if coda:
            codas[coda] += 1
        root_phones.update(projection[phone.rstrip("012")] for phone in tokens)

    full_phones = Counter(projection[phone.rstrip("012")] for tokens in full.values() for phone in tokens)
    full_syllables = Counter(syllable_count(tokens) for tokens in full.values())
    measured = Counter({root: sum(counts.values()) for root, counts in templates.items()})
    if transition_sample:
        for root, counts in transition_sample.items():
            if int(root) not in transitions:
                raise ValueError(f"No measured root length {root}")
            transitions[int(root)] = Counter({int(surface): count for surface, count in counts.items()})
    pooled_target = {s: full_syllables[s] for s in range(1, 6)}
    pooled_target[6] = sum(count for syllables, count in full_syllables.items() if syllables >= 6)
    fitted = target_root_weights(measured, {r: probabilities(c) for r, c in transitions.items()},
                                 probabilities(pooled_target))
    # Reweight the syllable marginal while preserving every measured P(phones | syllables).
    fitted_joint = defaultdict(dict)
    for (phones, syllables), count in sorted(joint.items()):
        mass = round(100 * count * fitted[syllables] / measured[syllables], 10)
        if mass > 0:
            fitted_joint[phones][syllables] = mass

    runtime = {
        "rootLengths": fitted_joint,
        "templates": {s: {t: templates[s][t] for t in TEMPLATES} for s in sorted(templates)},
        "affixFrequencies": dict(sorted(affixes.items())),
        "finalCodaCounts": {",".join(coda.split()): count for coda, count in sorted(codas.items())},
    }
    reference = {
        "fullCmu": {"phonemes": dict(sorted(full_phones.items())), "syllables": dict(sorted(full_syllables.items()))},
        "roots": {"phonemes": dict(sorted(root_phones.items())), "syllables": dict(sorted(measured.items()))},
    }
    print(json.dumps({"included": len(rows), "excludedRoots": len(exclusions),
                      "measured": probabilities(measured), "fitted": fitted,
                      "templateCounts": dict(sum(templates.values(), Counter()))}, sort_keys=True))
    return runtime, reference


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root-reference", type=Path, required=True, help="Independently verified Phase 1 artifact")
    parser.add_argument("--source", type=Path, required=True, help="Pinned CMU dictionary")
    parser.add_argument("--transitions", type=Path, help="Measured surface syllable counts by forced root length")
    parser.add_argument("--runtime-out", type=Path, required=True)
    parser.add_argument("--reference-out", type=Path, required=True)
    options = parser.parse_args()
    spec = spec_from_file_location("verify_joint", Path(__file__).with_name("verify-joint.py"))
    verifier = module_from_spec(spec)
    spec.loader.exec_module(verifier)
    envelope = verifier.strict_json(options.root_reference.read_bytes())
    if envelope["digest"] != PHASE_ONE_DIGEST or verifier.digest(envelope["artifact"]) != PHASE_ONE_DIGEST:
        raise ValueError("Expected the verified Phase 1 reference from 0de88f5c")
    source = options.source.read_bytes()
    if sha256(source).hexdigest() != CMU_SHA256:
        raise ValueError("CMU source digest mismatch")
    transitions = json.loads(options.transitions.read_text()) if options.transitions else None
    runtime, reference = build(envelope["artifact"], source, transitions)
    with options.runtime_out.open("x", encoding="utf-8") as handle:
        handle.write("// Generated by evaluation/corpus/stage-reference.py.\n")
        handle.write("export const lexiconReference = ")
        json.dump(runtime, handle, ensure_ascii=False, indent=2)
        handle.write(";\n")
    write_json(options.reference_out, reference)


if __name__ == "__main__":
    main()
