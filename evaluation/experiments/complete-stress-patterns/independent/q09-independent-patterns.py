"""Independent Q09a mark-event replay and raw snapshot recount.

This does not call the TypeScript observer, infer feet, or re-evaluate primary
OT/weight policy. It validates the recorded execution against snapshots, the
legacy trace and final Word, then derives descriptive counts from raw labels.
"""
import argparse
from copy import deepcopy
import gzip
import hashlib
import json
import math
from pathlib import Path
import stat

DOMAINS = ["root-before-primary", "root-after-primary", "root-after-explicit-secondary", "root-after-rhythmic", "assembled-after-morphology", "final-lexical-before-realization", "surface-after-realization"]
SEGMENTS = ["onset", "nucleus", "coda"]
MARKS = ["unmarked", "primary", "secondary"]
PROTOCOL = "451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862"
EVALUATOR = "ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007"
REFERENCE = "38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def content_digest(value):
    return sha(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())


def regular_path(root, relative):
    relative = Path(relative)
    require(not relative.is_absolute() and ".." not in relative.parts and relative.parts, "Unsafe archive path")
    require(stat.S_ISDIR(root.lstat().st_mode), "Regular archive directory required")
    path = root
    for index, part in enumerate(relative.parts):
        path = path / part
        mode = path.lstat().st_mode
        require(stat.S_ISREG(mode) if index == len(relative.parts) - 1 else stat.S_ISDIR(mode), "Regular archive path required")
    return path


def exact(actual, expected, label):
    if isinstance(expected, dict):
        require(isinstance(actual, dict) and actual.keys() == expected.keys(), label + ": object fields")
        for key in expected:
            exact(actual[key], expected[key], label + "." + str(key))
    elif isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), label + ": array length")
        for index, (a, b) in enumerate(zip(actual, expected)):
            exact(a, b, label + "." + str(index))
    elif type(expected) in (int, float):
        require(type(actual) in (int, float) and actual == expected, label + ": numeric value")
    else:
        require(type(actual) is type(expected) and actual == expected, label + ": exact value")


def require(condition, label):
    if not condition:
        raise ValueError(label)


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def rng(value):
    require(number(value) and 0 <= value < 1, "Invalid executed RNG value")


def mark(syllable):
    return {"ˈ": "primary", "ˌ": "secondary"}.get(syllable.get("stress"), "unmarked")


def sounds(syllables):
    return [{segment: [p["sound"] for p in syllable[segment]] for segment in SEGMENTS} for syllable in syllables]


def phone_snapshot(phone):
    return {key: deepcopy(phone[key]) for key in ["sound", "nuclearQuantity", "reduced", "aspirated"] if key in phone}


def returned_snapshot(syllables):
    return [{**{segment: [phone_snapshot(p) for p in syllable[segment]] for segment in SEGMENTS}, "mark": mark(syllable)} for syllable in syllables]


def validate_word(word):
    trace = word["trace"]
    pattern = trace["stressPattern"]
    exact(pattern["version"], 1, "Pattern version")
    exact(pattern["scope"], "returned-attempt", "Pattern attempt scope")
    snapshots = pattern["snapshots"]
    exact([s["domain"] for s in snapshots], DOMAINS, "Ordered unique snapshot domains")
    exact([s["coordinates"] for s in snapshots], ["root"] * 4 + ["word"] * 3, "Snapshot coordinate domains")
    n = pattern["rootSyllableCount"]
    require(type(n) is int and n >= 0, "Invalid root count")
    labels = [s["mark"] for s in snapshots[0]["syllables"]]
    exact(len(labels), n, "Initial root length")
    require(all(label in MARKS for label in labels), "Invalid initial mark")
    origins = [{"kind": "unmarked" if label == "unmarked" else "input"} for label in labels]
    events = pattern["events"]
    cursor = 0
    coordinates = "root"

    def check_snapshot(index):
        snapshot = snapshots[index]
        exact(snapshot["eventCount"], cursor, "Snapshot event boundary")
        exact(len(snapshot["syllables"]), len(labels), "Snapshot syllable count")
        exact([s["mark"] for s in snapshot["syllables"]], labels, "Replayed snapshot labels")
        exact([s["origin"] for s in snapshot["syllables"]], origins, "Replayed snapshot origins")

    def assign(index, after, cause):
        nonlocal cursor
        require(type(index) is int and 0 <= index < len(labels), "Assignment outside coordinate domain")
        require(cursor < len(events), "Missing executed assignment")
        expected = {"id": cursor, "coordinates": coordinates, "syllableIndex": index,
                    "before": labels[index], "previousOrigin": origins[index], "after": after, "cause": cause}
        exact(events[cursor], expected, "Ordered assignment including prior origin")
        labels[index] = after
        origins[index] = {"kind": "event", "eventId": cursor}
        cursor += 1

    check_snapshot(0)
    primary = pattern["primary"]
    old_weight = trace["stressWeight"]
    exact({k: primary[k] for k in ["strategy", "selectedIndex"]}, old_weight["primary"], "Legacy primary observation")
    for draw in primary["draws"]:
        rng(draw)
    if primary["selectedIndex"] is not None:
        assign(primary["selectedIndex"], "primary", {"kind": "root-primary"})
    else:
        exact(n, 0, "Only an empty root lacks selected primary in this pipeline")
    if n <= 1 or primary["strategy"] in ["fixed", "initial", "penultimate"]:
        exact(primary["draws"], [], "Non-sampling primary strategy")
    elif primary["strategy"] == "weight-sensitive":
        exact(len(primary["draws"]), 1, "Executed weighted primary draw")
    check_snapshot(1)
    for snapshot in snapshots[1:4]:
        exact(sounds(snapshot["syllables"]), sounds(snapshots[0]["syllables"]), "Stress assignment changed segments")

    secondary = pattern["explicitSecondary"]
    exact({k: secondary[k] for k in ["candidates", "selectedIndex", "applied"]}, old_weight["secondary"], "Legacy secondary observation")
    candidates = secondary["candidates"]
    first_primary = next((i for i, label in enumerate(labels) if label == "primary"), None)
    skipped = "monosyllabic" if n <= 1 else "disabled" if not secondary["enabled"] else "no-primary" if first_primary is None else None
    expected_indices = [] if skipped else [i for i in range(n if secondary["candidateWindow"] == "all-nonprimary" else min(n, 3)) if i != first_primary]
    if skipped is None and not expected_indices:
        skipped = "no-candidates"
    exact(secondary["skipped"], skipped, "Secondary skip reason")
    exact([c["syllableIndex"] for c in candidates], expected_indices, "Secondary candidate coordinates")
    if skipped:
        exact([secondary[k] for k in ["selectedIndex", "selectionDraw", "gateDraw", "applied"]], [None, None, None, False], "Skipped secondary has no invented execution")
    else:
        draw = secondary["selectionDraw"]
        rng(draw)
        rng(secondary["gateDraw"])
        require(all(number(c["weight"]) for c in candidates), "Invalid observed candidate weight")
        total = 0.0
        for candidate in candidates:
            total += candidate["weight"]
        threshold = draw * total
        cumulative = 0.0
        selected = candidates[-1]["syllableIndex"]
        for candidate in candidates:
            cumulative += candidate["weight"]
            if threshold < cumulative:
                selected = candidate["syllableIndex"]
                break
        exact(secondary["selectedIndex"], selected, "Weighted secondary execution including last-option fallback")
        applied = secondary["gateDraw"] * 100 < secondary["probability"]
        exact(secondary["applied"], applied, "Secondary gate execution")
        if applied:
            assign(selected, "secondary", {"kind": "explicit-secondary"})
    check_snapshot(2)

    rhythm = pattern["rhythmic"]
    iterations = rhythm["iterations"]
    indices = list(range(1, max(1, n - 1))) if rhythm["enabled"] else []
    exact([row["syllableIndex"] for row in iterations], indices, "All rhythmic loop iterations")
    for iteration, row in enumerate(iterations):
        index = row["syllableIndex"]
        before, left, right = labels[index], labels[index - 1], labels[index + 1]
        check_neighbors = before == "unmarked"
        skipped = "already-marked" if not check_neighbors else "marked-neighbor" if rhythm["requireUnstressedNeighbors"] and (left != "unmarked" or right != "unmarked") else None
        exact({k: row[k] for k in ["before", "left", "right", "neighborCheckPerformed", "skipped"]},
              {"before": before, "left": left, "right": right, "neighborCheckPerformed": check_neighbors, "skipped": skipped}, "Sequential rhythmic state")
        if skipped:
            exact([row["draw"], row["applied"]], [None, False], "Skipped rhythm draw")
        else:
            rng(row["draw"])
            applied = row["draw"] * 100 < rhythm["probability"]
            exact(row["applied"], applied, "Rhythmic gate execution")
            if applied:
                assign(index, "secondary", {"kind": "rhythmic", "iteration": iteration})
    check_snapshot(3)

    assembly = pattern["assembly"]
    prefix, suffix = assembly["prefixSyllables"], assembly["suffixSyllables"]
    require(all(type(v) is int and v >= 0 for v in [prefix, suffix]), "Invalid realized affix counts")
    exact(assembly["rootSyllableStart"], prefix, "Prefix/root offset")
    exact(word["lexical"]["rootSyllableStart"], prefix, "Returned lexical offset")
    exact(len(word["lexical"]["root"]), n, "Returned root length")
    labels = ["unmarked"] * prefix + labels + ["unmarked"] * suffix
    origins = [{"kind": "unmarked"} for _ in range(prefix)] + origins + [{"kind": "unmarked"} for _ in range(suffix)]
    coordinates = "word"
    realization = trace.get("morphology", {}).get("realization", {})
    roles = [role for role in ["prefix", "suffix"] if realization.get(role)]
    exact([effect["role"] for effect in pattern["morphology"]], roles, "Realized word-local affix roles")
    for effect_id, effect in enumerate(pattern["morphology"]):
        exact(effect["id"], effect_id, "Affix effect order")
        role = effect["role"]
        resolved = realization[role]["resolved"]
        realized_count = 0 if resolved["syllableCount"] == 0 else len(resolved.get("syllables", []))
        exact(realized_count, prefix if role == "prefix" else suffix, "Actual resolved affix syllable-array count")
        indices = list(range(prefix)) if role == "prefix" else list(range(prefix + n, len(labels)))
        exact(effect["syllableIndices"], indices, "Realized affix coordinates")
        kind = effect["effect"]
        require(kind in ["none", "primary", "secondary", "attract-preceding"], "Invalid stress effect")
        status = "no-realized-syllables" if not indices else "none" if kind == "none" else "prefix-attraction-not-applied" if kind == "attract-preceding" and role == "prefix" else "no-preceding-syllable" if kind == "attract-preceding" and indices[0] == 0 else "applied"
        exact(effect["status"], status, "Morphology effect status")
        start = cursor
        if status == "applied":
            cause = {"kind": "morphology", "effectId": effect_id}
            if kind in ["primary", "attract-preceding"]:
                for i in range(len(labels)):
                    if labels[i] == "primary":
                        assign(i, "secondary", {**cause, "action": "demote-primary"})
                assign(indices[0] if kind == "primary" else indices[0] - 1, "primary", {**cause, "action": "affix-primary" if kind == "primary" else "preceding-primary"})
            else:
                assign(indices[0], "secondary", {**cause, "action": "affix-secondary"})
        exact(effect["eventIds"], list(range(start, cursor)), "Affix/assignment bijection")
    for index in range(4, 7):
        check_snapshot(index)
    exact(cursor, len(events), "No surplus assignment events")

    for index, syllables in [(5, word["lexical"]["syllables"]), (6, word["syllables"])]:
        actual = [{k: v for k, v in syllable.items() if k != "origin"} for syllable in snapshots[index]["syllables"]]
        exact(actual, returned_snapshot(syllables), "Final detached phoneme/quantity/label observations")
    stages = trace["stages"]
    for name, side, index in [("applyStress", "before", 0), ("applyStress", "after", 3), ("assembleMorphology", "after", 4), ("generatePronunciation", "before", 5), ("generatePronunciation", "after", 6)]:
        matching = [stage for stage in stages if stage["name"] == name]
        exact(len(matching), 1, "Unique legacy stage " + name)
        legacy = matching[0][side]
        exact([{segment: syllable[segment] for segment in SEGMENTS} for syllable in legacy], sounds(snapshots[index]["syllables"]), "Legacy stage segment coordinates")
        exact([mark(syllable) for syllable in legacy], [s["mark"] for s in snapshots[index]["syllables"]], "Legacy stage stress labels")
    exact(len(old_weight["syllables"]), n, "Root-only operational weight observation")
    for i, analysis in enumerate(old_weight["syllables"]):
        exact(analysis["syllableIndex"], i, "Weight/root coordinate")
        root = snapshots[0]["syllables"][i]
        exact(analysis["coda"], [p["sound"] for p in root["coda"]], "Weight/root coda")
        exact([(p["segmentIndex"], p["sound"], p.get("declared")) for p in analysis["nucleus"]], [(j, p["sound"], p.get("nuclearQuantity")) for j, p in enumerate(root["nucleus"])], "Weight/root nucleus declaration")
    return pattern


def empty_observation():
    return {"words": 0, "originsAvailableWords": 0, "originsUnavailableWords": 0,
            "stressDrawsAvailableWords": 0, "stressDrawsUnavailableWords": 0,
            "assignmentEvents": 0, "primaryDraws": 0, "explicitDraws": 0, "rhythmicDraws": 0,
            "causes": {}, "morphologyStatus": {}, "rhythmicOutcomes": {}, "rootQuantity": {}, "rootOperational": {},
            "domains": {domain: {"observedWords": 0, "unavailableWords": 0, "quantityObservedWords": 0, "quantityUnavailableWords": 0, "syllables": 0, "primary": 0, "secondary": 0,
                                 **{key: {} for key in ["patterns", "adjacencies", "unmarkedRuns", "secondaryDistances", "boundaryAdjacencies", "originAdjacencies", "declaredNuclei"]}}
                        for domain in DOMAINS}}


def increment(counts, key, by=1):
    counts[key] = counts.get(key, 0) + by


def origin_path(origin, pattern):
    chain = []
    while origin["kind"] == "event":
        event = pattern["events"][origin["eventId"]]
        cause = event["cause"]
        chain.append(cause["kind"] if cause["kind"] != "morphology" else pattern["morphology"][cause["effectId"]]["role"] + ":" + cause["action"])
        origin = event["previousOrigin"]
    return ">".join([origin["kind"], *reversed(chain)])


def observe(word, mode="candidate"):
    result = empty_observation()
    trace = word["trace"]
    pattern = validate_word(word) if mode == "candidate" else None
    if mode == "control":
        require("stressPattern" not in trace, "Control unexpectedly contains candidate observation")
    result["words"] = 1
    result["originsAvailableWords" if pattern else "originsUnavailableWords"] = 1
    result["stressDrawsAvailableWords" if pattern else "stressDrawsUnavailableWords"] = 1
    if pattern:
        result["assignmentEvents"] = len(pattern["events"])
        result["primaryDraws"] = len(pattern["primary"]["draws"])
        result["explicitDraws"] = sum(pattern["explicitSecondary"][key] is not None for key in ["selectionDraw", "gateDraw"])
        for event in pattern["events"]:
            cause = event["cause"]
            key = cause["kind"] if cause["kind"] != "morphology" else pattern["morphology"][cause["effectId"]]["role"] + ":" + cause["action"]
            increment(result["causes"], key)
        for effect in pattern["morphology"]:
            increment(result["morphologyStatus"], ":".join(effect[key] for key in ["role", "effect", "status"]))
        for row in pattern["rhythmic"]["iterations"]:
            result["rhythmicDraws"] += row["draw"] is not None
            increment(result["rhythmicOutcomes"], row["skipped"] or ("applied" if row["applied"] else "gate-failed"))
    for syllable in trace["stressWeight"]["syllables"]:
        operational = syllable["operational"]
        increment(result["rootOperational"], operational["weight"] + ":" + operational["basis"])
        for phone in syllable["nucleus"]:
            quantity = phone["quantity"]
            increment(result["rootQuantity"], "known:" + str(quantity["moras"]) if quantity["status"] == "known" else "unknown:" + quantity["reason"])
    historical = {
        "root-before-primary": ("applyStress", "before"), "root-after-rhythmic": ("applyStress", "after"),
        "assembled-after-morphology": ("assembleMorphology", "after"),
        "final-lexical-before-realization": ("generatePronunciation", "before"),
        "surface-after-realization": ("generatePronunciation", "after"),
    }
    for domain_index, domain in enumerate(DOMAINS):
        counts = result["domains"][domain]
        # Availability of the new domain snapshot's declarations; root weight
        # metadata has its own retained observation in both versions.
        counts["quantityObservedWords" if pattern else "quantityUnavailableWords"] = 1
        if pattern:
            snapshot = pattern["snapshots"][domain_index]
            syllables = snapshot["syllables"]
            labels = [s["mark"] for s in syllables]
        elif domain in historical:
            name, side = historical[domain]
            stages = [stage for stage in trace["stages"] if stage["name"] == name]
            exact(len(stages), 1, "Historical stage uniquely available")
            labels = [mark(syllable) for syllable in stages[0][side]]
        else:
            counts["unavailableWords"] = 1
            continue
        counts["observedWords"] = 1
        counts["syllables"] = len(labels)
        counts["primary"] = labels.count("primary")
        counts["secondary"] = labels.count("secondary")
        counts["patterns"]["".join({"unmarked": "U", "primary": "P", "secondary": "S"}[label] for label in labels)] = 1
        primaries = [i for i, label in enumerate(labels) if label == "primary"]
        for i, label in enumerate(labels):
            if label == "secondary":
                if not primaries:
                    increment(counts["secondaryDistances"], "no-primary")
                for primary in primaries:
                    increment(counts["secondaryDistances"], f"{len(primaries)}-primary:{i-primary}")
            if i + 1 == len(labels) or label == "unmarked" or labels[i+1] == "unmarked":
                continue
            pair = label + ":" + labels[i+1]
            increment(counts["adjacencies"], pair)
            if domain_index < 4:
                boundary = "within-root"
            else:
                start = word["lexical"]["rootSyllableStart"]
                end = start + len(word["lexical"]["root"])
                boundary = "prefix-root" if i + 1 == start else "root-suffix" if i + 1 == end else "within-domain"
                increment(counts["boundaryAdjacencies"], boundary + ":" + pair)
            if pattern:
                origins = origin_path(syllables[i]["origin"], pattern) + "|" + origin_path(syllables[i+1]["origin"], pattern)
                increment(counts["originAdjacencies"], boundary + ":" + origins + ":" + pair)
        i = 0
        while i < len(labels):
            if labels[i] != "unmarked":
                i += 1
                continue
            start = i
            while i < len(labels) and labels[i] == "unmarked":
                i += 1
            position = "whole-word" if start == 0 and i == len(labels) else "initial" if start == 0 else "final" if i == len(labels) else "internal"
            increment(counts["unmarkedRuns"], f"{position}:{i-start}")
        if pattern:
            for syllable in syllables:
                for phone in syllable["nucleus"]:
                    q = phone.get("nuclearQuantity")
                    increment(counts["declaredNuclei"], "unspecified" if q is None else q["analysis"] + ":" + str(q["moras"]))
    return result


def morphology_key(word):
    realization = word["trace"].get("morphology", {}).get("realization", {})
    return "both" if realization.get("prefix") and realization.get("suffix") else "prefixed" if realization.get("prefix") else "suffixed" if realization.get("suffix") else "bare"


def merge(target, source):
    for key, value in source.items():
        if isinstance(value, dict):
            merge(target.setdefault(key, {}), value)
        else:
            target[key] = target.get(key, 0) + value


def aggregate(records, mode="candidate"):
    totals = empty_observation()
    profiles, streams, strata = {}, {}, {}
    for record in records:
        word = record["word"]
        counts = observe(word, mode)
        stream = f"{record['profile']}:{record['seed']}"
        stratum = f"{morphology_key(word)}:{len(word['syllables'])}"
        merge(totals, counts)
        merge(profiles.setdefault(record["profile"], empty_observation()), counts)
        merge(streams.setdefault(stream, empty_observation()), counts)
        merge(strata.setdefault(stream, {}).setdefault(stratum, empty_observation()), counts)
    return {"totals": totals, "profiles": profiles, "streams": streams, "strata": strata}


def strict_load(data):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "Duplicate JSON key")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def archive_records(run, manifest):
    protocol = manifest["protocol"]
    exact(manifest["cohort"], "development", "Sealed validation cohort must not be opened")
    expected = [f"words/{profile['id']}-{seed}.jsonl.gz" for profile in protocol["profiles"] for seed in profile["seeds"]["development"]]
    exact(sorted(str(path.relative_to(run)) for path in (run / "words").iterdir()), sorted(expected), "Exact shard file set")
    exact(sorted(a["file"] for a in manifest["artifacts"] if a["file"].startswith("words/")), sorted(expected), "Manifest shard set")
    for profile in protocol["profiles"]:
        for seed in profile["seeds"]["development"]:
            filename = regular_path(run, f"words/{profile['id']}-{seed}.jsonl.gz")
            count = 0
            with gzip.open(filename, "rt", encoding="utf-8") as stream:
                for index, line in enumerate(stream):
                    record = strict_load(line)
                    exact([record["profile"], record["seed"], record["drawIndex"]], [profile["id"], seed, index], "Consecutive scheduled draw")
                    count += 1
                    yield record
            exact(count, protocol["wordsPerReplicate"], "Full scheduled stream")


def run_archive(run, manifest_sha, generator_digest, mode="candidate"):
    tool_bytes = Path(__file__).read_bytes()
    manifest_path = regular_path(run, "manifest.json")
    manifest_bytes = manifest_path.read_bytes()
    exact(sha(manifest_bytes), manifest_sha, "Externally pinned manifest bytes")
    envelope = strict_load(manifest_bytes)
    manifest = envelope["manifest"]
    exact(manifest["protocolDigest"], PROTOCOL, "Frozen protocol")
    exact(content_digest(manifest["protocol"]), PROTOCOL, "Frozen protocol content")
    exact(manifest["evaluatorDigest"], EVALUATOR, "Frozen evaluator")
    exact(manifest["referenceDigest"], REFERENCE, "Frozen reference")
    exact(manifest["generator"]["sourceDigest"], generator_digest, "Externally expected generator")
    artifacts = manifest["artifacts"]
    require(len({a["file"] for a in artifacts}) == len(artifacts), "Repeated artifact path")
    def verify_bytes():
        exact(regular_path(run, "manifest.json").read_bytes(), manifest_bytes, "Manifest changed during recount")
        for artifact in artifacts:
            path = regular_path(run, artifact["file"])
            data = path.read_bytes()
            exact([len(data), sha(data)], [artifact["bytes"], artifact["sha256"]], "Pinned artifact bytes")
    verify_bytes()
    sources = strict_load(gzip.decompress(regular_path(run, "sources.json.gz").read_bytes()))
    for key, expected in [("generator", generator_digest), ("references", REFERENCE)]:
        source_list = sources[key]
        require(len({entry["path"] for entry in source_list}) == len(source_list), "Duplicate captured source")
        exact(content_digest(source_list), expected, "Complete captured " + key + " source content")
    summary = strict_load(regular_path(run, "summary.json").read_bytes())
    evaluator = sources["evaluator"]
    require(len({entry["path"] for entry in evaluator}) == len(evaluator), "Duplicate captured evaluator source")
    exact(content_digest({"files": evaluator, "definitions": summary["definitions"]}), EVALUATOR, "Complete captured evaluator and metric definitions")
    result = aggregate(archive_records(run, manifest), mode)
    verify_bytes()
    exact(Path(__file__).read_bytes(), tool_bytes, "Independent verifier changed during recount")
    return {"schemaVersion": 1, "probe": "independent-stress-pattern-replay-v1", "mode": mode, "manifestFileSha256": manifest_sha,
            "manifestDigest": envelope["digest"], "generatorDigest": generator_digest,
            "toolSha256": sha(tool_bytes), "scope": "recorded-execution-and-label-counts; primary-OT-policy-not-recomputed", **result}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--manifest-sha", required=True)
    parser.add_argument("--generator-digest", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--mode", choices=["candidate", "control"], required=True)
    args = parser.parse_args()
    result = run_archive(args.run, args.manifest_sha, args.generator_digest, args.mode)
    with args.out.open("x") as handle:
        json.dump(result, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write("\n")
    print(json.dumps({"output": str(args.out), "words": result["totals"]["words"], "manifest": args.manifest_sha}))
