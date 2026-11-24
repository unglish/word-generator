#!/usr/bin/env python3
"""Build the audited English lexicon sampling and gate references from Phase 1."""

import argparse
from collections import Counter, defaultdict
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PHASE_ONE_DIGEST = "2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467"
CMU_SHA256 = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22"
TEMPLATES = ("bare", "suffixed", "prefixed", "both")


def syllable_count(tokens):
    return sum(phone[-1].isdigit() for phone in tokens)


def nuclei_by_stress(tokens, projection):
    vowels = [phone for phone in tokens if phone[-1] in "012"]
    for index, phone in enumerate(vowels):
        if len(vowels) == 1:
            position = "isolated"
        elif index == 0:
            position = "initial"
        elif index == len(vowels) - 1:
            position = "final"
        else:
            position = "medial"
        stress = ("unstressed", "primary", "secondary")[int(phone[-1])]
        sound = "ʌ" if phone in ("AH1", "AH2") else projection[phone[:-1]]
        yield (stress, position, sound)


def probabilities(counts):
    total = sum(counts.values())
    return {key: count / total for key, count in counts.items()}


def validate_transitions(sample, measured):
    """Validate all sampled root rows, including those that only feed the tail."""
    if set(sample) != {str(root) for root in measured}:
        raise ValueError("Transitions must contain exactly the measured root lengths")
    pooled = {}
    for key, counts in sample.items():
        root = int(key)
        pool = Counter()
        for surface, count in counts.items():
            length = int(surface)
            if length < root or not isinstance(count, int) or isinstance(count, bool) or count <= 0:
                raise ValueError(f"Invalid transition for root length {root}: {surface} = {count}")
            pool[min(6, length)] += count
        if sum(pool.values()) == 0 or (root <= 5 and not pool[root]):
            raise ValueError(f"Missing transitions or zero diagonal for root length {root}")
        pooled[root] = probabilities(pool)
    return pooled


def target_root_weights(measured, transitions, target):
    """Minimum KL(fitted || measured) with exact finished-bucket constraints.

    The 1–5 diagonal is nonzero and an affix can only add syllables. Thus the
    first five constraints uniquely determine their root weights. The pooled
    6+ constraint fixes the total remaining mass. Its KL minimizer retains the
    measured conditional proportions of the tail (Lagrange multiplier common
    to all tail roots). This direct solve needs no iteration.
    """
    fitted = {}
    for root in range(1, 6):
        from_shorter = sum(mass * transitions[short].get(root, 0) for short, mass in fitted.items())
        fitted[root] = (target[root] - from_shorter) / transitions[root][root]
    tail_mass = 1 - sum(fitted.values())
    tail_total = sum(count for root, count in measured.items() if root >= 6)
    for root, count in sorted(measured.items()):
        if root >= 6:
            fitted[root] = tail_mass * count / tail_total
    if any(mass <= 0 for mass in fitted.values()):
        raise ValueError("Full-CMU target is infeasible with the measured transitions")
    for surface, goal in target.items():
        predicted = sum(mass * transitions[root].get(surface, 0) for root, mass in fitted.items())
        if abs(predicted - goal) > 1e-10:
            raise ValueError(f"Length projection failed residual check at {surface}: {predicted} vs {goal}")
    return fitted


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
    templates = defaultdict(Counter)
    root_phones_by_length = defaultdict(Counter)
    root_nuclei_by_length = defaultdict(Counter)
    coda_lengths = defaultdict(lambda: defaultdict(Counter))
    joint, affixes, codas = Counter(), Counter(), Counter()
    for row in rows:
        tokens = roots[row["stem"]]
        syllables = syllable_count(tokens)
        joint[len(tokens), syllables] += 1
        templates[syllables][row["template"]] += 1
        for step in row["steps"]:
            affixes[step["affix"]] += 1
        coda = final_coda(tokens)
        coda_lengths[syllables][len(tokens)][len(coda.split())] += 1
        if coda:
            codas[coda] += 1
        root_phones_by_length[syllables].update(projection[phone.rstrip("012")] for phone in tokens)
        root_nuclei_by_length[syllables].update(nuclei_by_stress(tokens, projection))

    full_phones = Counter(projection[phone.rstrip("012")] for tokens in full.values() for phone in tokens)
    full_syllables = Counter(syllable_count(tokens) for tokens in full.values())
    measured = Counter({root: sum(counts.values()) for root, counts in templates.items()})
    pooled_target = {s: full_syllables[s] for s in range(1, 6)}
    pooled_target[6] = sum(count for syllables, count in full_syllables.items() if syllables >= 6)
    transitions = validate_transitions(transition_sample, measured)
    fitted = target_root_weights(measured, transitions, probabilities(pooled_target))
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
        "finalCodaLengths": {s: {p: sorted(counts.items()) for p, counts in sorted(by_phone.items())}
                             for s, by_phone in sorted(coda_lengths.items())},
    }
    root_phones = Counter()
    root_nuclei = Counter()
    expected_coda_lengths = Counter()
    for root, mass in fitted.items():
        factor = len(rows) * mass / measured[root]
        for sound, count in root_phones_by_length[root].items():
            root_phones[sound] += count * factor
        for key, count in root_nuclei_by_length[root].items():
            root_nuclei[key] += count * factor
        for counts in coda_lengths[root].values():
            for length, count in counts.items():
                expected_coda_lengths[length] += count * factor
    nuclei = defaultdict(lambda: defaultdict(dict))
    for (stress, position, sound), count in sorted(root_nuclei.items()):
        nuclei[stress][position][sound] = round(count, 8)
    reference = {
        "fullCmu": {"phonemes": dict(sorted(full_phones.items())), "syllables": dict(sorted(full_syllables.items()))},
        "roots": {
            "phonemes": {phone: round(count, 8) for phone, count in sorted(root_phones.items())},
            "syllables": {root: round(mass * len(rows), 8) for root, mass in sorted(fitted.items())},
            "finalCodaLengths": {length: round(count, 8) for length, count in sorted(expected_coda_lengths.items())},
            "nucleiByStress": nuclei,
        },
    }
    print(json.dumps({"included": len(rows), "excludedRoots": len(exclusions),
                      "measured": probabilities(measured), "fitted": fitted,
                      "templateCounts": dict(sum(templates.values(), Counter()))}, sort_keys=True))
    return runtime, reference


def check_transition_artifact(transitions, digest):
    if transitions["countsDigest"] != digest(transitions["counts"]):
        raise ValueError("Transition counts digest mismatch")
    for field in ("generatorRevision", "generatorSourceTree"):
        if not re.fullmatch(r"[0-9a-f]{40}", transitions.get(field, "")):
            raise ValueError(f"Missing or invalid transition {field}")
    if transitions.get("sampleSize") != 30_000 or transitions.get("seedBase") != 491004:
        raise ValueError("Transition sample protocol differs from the pinned protocol")
    if any(sum(row.values()) != transitions["sampleSize"] for row in transitions["counts"].values()):
        raise ValueError("Every transition row must have the specified sample size")
    return transitions["counts"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root-reference", type=Path, required=True, help="Independently verified Phase 1 artifact")
    parser.add_argument("--source", type=Path, required=True, help="Pinned CMU dictionary")
    parser.add_argument("--transitions", type=Path, required=True, help="Pinned empirical transitions with all root lengths")
    parser.add_argument("--runtime-out", type=Path, required=True)
    parser.add_argument("--reference-out", type=Path, required=True)
    parser.add_argument("--pins-out", type=Path, required=True)
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
    transitions = verifier.strict_json(options.transitions.read_bytes())
    counts = check_transition_artifact(transitions, verifier.digest)
    runtime, reference = build(envelope["artifact"], source, counts)
    with options.runtime_out.open("x", encoding="utf-8") as handle:
        handle.write("// Generated by evaluation/corpus/stage-reference.py.\n")
        handle.write("export const lexiconReference = ")
        rendered = json.dumps(runtime, ensure_ascii=False, indent=2)
        handle.write(re.sub(r"\[\s*(\d+),\s*(\d+)\s*\]", r"[\1, \2]", rendered))
        handle.write(" as const;\n")
    write_json(options.reference_out, reference)
    inputs = {
        "evaluation/corpus/stage-reference.py": Path(__file__),
        "evaluation/corpus/root-coda-exclusions.json": ROOT / "evaluation/corpus/root-coda-exclusions.json",
        "evaluation/corpus/stage-transitions.json": options.transitions,
        "evaluation/corpus/stage-references.json": options.reference_out,
        "src/config/lexicon-reference.ts": options.runtime_out,
    }
    write_json(options.pins_out, {name: sha256(path.read_bytes()).hexdigest() for name, path in inputs.items()})


if __name__ == "__main__":
    main()
