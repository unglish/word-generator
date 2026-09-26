"""Descriptive Q09 endpoints from archived words; no generator or sampler imports."""
import hashlib
import json
from pathlib import Path
from types import ModuleType

_path = Path(__file__).with_name("q09-supplement-expectations-v1.py")
_features = ModuleType("q09_supplement_expectations")
_features.__file__ = str(_path)
exec(compile(_path.read_bytes(), str(_path), "exec"), _features.__dict__)
pattern_features = _features.pattern_features
U, P, S = "unmarked", "primary", "secondary"
ROOT_DOMAINS = ("root-before-primary", "root-after-primary", "root-after-explicit-secondary",
                "root-after-rhythmic", "root-after-pattern-application")
WORD_DOMAINS = ("assembled-after-morphology", "final-lexical-before-realization", "surface-after-realization")
DOMAINS = ROOT_DOMAINS + WORD_DOMAINS + ("root-placement-complete",)


def integer(value, low=0, high=2**53 - 1):
    assert type(value) is int and low <= value <= high, ("invalid integer", value)
    return value


def semantic(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(semantic(value).encode()).hexdigest()


def marks(snapshot):
    result = [syllable["mark"] for syllable in snapshot["syllables"]]
    assert result and all(mark in (U, P, S) for mark in result)
    return result


def weight(syllable, policy):
    """Saved-snapshot description; does not claim a runtime reweighing occurred."""
    assert policy["type"] in ("legacy-segment-count", "moraic")
    quantities = []
    for phone in syllable["nucleus"]:
        declared = phone.get("nuclearQuantity")
        if declared is None:
            quantities.append("unknown:unspecified")
        elif policy["type"] == "legacy-segment-count":
            quantities.append("unknown:legacy-policy")
        elif declared["analysis"] != policy["analysis"]:
            quantities.append("unknown:model-mismatch")
        else:
            quantities.append(f"known:{integer(declared['moras'], 1, 2)}")
    legacy = "heavy" if syllable["coda"] or len(syllable["nucleus"]) > 1 else "light"
    if policy["type"] == "legacy-segment-count":
        return {"operational": legacy, "basis": "legacy-rule", "analytical": "unknown", "quantities": quantities}
    assert policy["coda"] in ("weight-by-position", "nonmoraic")
    known = sum(int(value[-1]) for value in quantities if value.startswith("known:"))
    if not quantities:
        analytical = "unknown"
    elif (syllable["coda"] and policy["coda"] == "weight-by-position") or known >= 2:
        analytical = "heavy"
    elif all(value.startswith("known:") for value in quantities):
        analytical = "light"
    else:
        analytical = "unknown"
    if analytical == "unknown":
        assert policy["unknown"] == "legacy-segment-count", "Unsupported unknown-quantity fallback"
    return {"operational": legacy if analytical == "unknown" else analytical,
            "basis": "legacy-fallback" if analytical == "unknown" else "moraic-analysis",
            "analytical": analytical, "quantities": quantities}


def edge_position(index, length):
    if length == 1:
        return "sole"
    if index == 0:
        return "initial"
    if index == length - 1:
        return "final"
    return "interior"


def coordinate_role(trace, snapshot, index):
    if snapshot["coordinates"] == "root":
        return "root"
    assert snapshot["coordinates"] == "word"
    assembly = trace.get("assembly")
    if assembly is None:
        return "unavailable"
    start = integer(assembly["rootSyllableStart"])
    if index < start:
        return "prefix"
    if index < start + trace["rootSyllableCount"]:
        return "root"
    return "suffix"


def origin_label(trace, snapshot, syllable):
    origin = syllable["origin"]
    if origin["kind"] == "unmarked":
        assert syllable["mark"] == U
        return "unmarked"
    if origin["kind"] == "input":
        assert trace["version"] == 1
        return "input"
    assert origin["kind"] == "event", "Proposal origin cannot substitute for an actual assignment"
    event_id = integer(origin["eventId"], 0, integer(snapshot["eventCount"]) - 1)
    event = trace["events"][event_id]
    assert event["id"] == event_id and event["after"] == syllable["mark"]
    cause = event["cause"]
    if cause["kind"] == "morphology":
        effect = trace["morphology"][integer(cause["effectId"], 0, len(trace["morphology"]) - 1)]
        assert effect["role"] in ("prefix", "suffix")
        return f"morphology:{effect['role']}:{cause['action']}"
    allowed = {"root-primary", "explicit-secondary", "rhythmic"} if trace["version"] == 1 else {"root-primary", "root-pattern-sampler"}
    assert cause["kind"] in allowed
    return cause["kind"]


def snapshot_counts(trace, snapshot, policy):
    labels = marks(snapshot)
    descriptions = [weight(syllable, policy) for syllable in snapshot["syllables"]]
    heavy = [item["operational"] == "heavy" for item in descriptions]
    result = {"observedWords": 1, "syllables": len(labels), "adjacentPairOpportunities": max(0, len(labels) - 1),
              "primaryMarks": labels.count(P), "secondaryMarks": labels.count(S),
              "missingPrimaryWords": int(P not in labels), "multiplePrimaryWords": int(labels.count(P) > 1)}
    for key, value in pattern_features(labels, heavy).items():
        result[("descriptiveSnapshotWeight:" if key.startswith("operationalHeavy") else "") + key] = value
    origins = [origin_label(trace, snapshot, syllable) for syllable in snapshot["syllables"]]
    roles = [coordinate_role(trace, snapshot, index) for index in range(len(labels))]
    for index, (syllable, description) in enumerate(zip(snapshot["syllables"], descriptions)):
        position = edge_position(index, len(labels))
        for category in (f"operational:{description['operational']}:{description['basis']}", f"analytical:{description['analytical']}"):
            key = f"descriptiveSnapshotWeight:{category}:position:{position}"
            result[key + ":syllables"] = result.get(key + ":syllables", 0) + 1
            result[key + ":secondary"] = result.get(key + ":secondary", 0) + int(labels[index] == S)
        for quantity in description["quantities"]:
            key = "nuclearQuantity:" + quantity
            result[key] = result.get(key, 0) + 1
        if labels[index] == S:
            schwa = any(phone["sound"] == "ə" for phone in syllable["nucleus"])
            result["secondarySchwaSyllables"] = result.get("secondarySchwaSyllables", 0) + int(schwa)
        if index + 1 < len(labels) and labels[index] != U and labels[index + 1] != U:
            orientation = labels[index] + ">" + labels[index + 1]
            origin = origins[index] + ">" + origins[index + 1]
            boundary = roles[index] + ">" + roles[index + 1]
            for key in ("orientation:" + orientation, "origin:" + origin, "boundary:" + boundary,
                        f"joint:{orientation}|{origin}|{boundary}"):
                result["adjacency:" + key] = result.get("adjacency:" + key, 0) + 1
    result.setdefault("secondarySchwaSyllables", 0)
    result["secondarySchwaWords"] = int(result["secondarySchwaSyllables"] > 0)
    return result


def unavailable_reason(version, domain):
    if version == 2 and domain in ("root-after-explicit-secondary", "root-after-rhythmic"):
        return "not-executed"
    if version == 1 and domain == "root-after-pattern-application":
        return "not-executed"
    return "unavailable-historical"


def observe_word(word, config, contexts):
    trace = word["trace"]["stressPattern"]
    version = integer(trace["version"], 1, 2)
    assert trace["scope"] == "returned-attempt"
    n = integer(trace["rootSyllableCount"], 1, 9)
    snapshots = {snapshot["domain"]: snapshot for snapshot in trace["snapshots"]}
    assert len(snapshots) == len(trace["snapshots"])
    allowed = set(ROOT_DOMAINS + WORD_DOMAINS)
    assert set(snapshots) <= allowed
    assert not any(unavailable_reason(version, domain) == "not-executed" for domain in snapshots)
    common = "root-after-rhythmic" if version == 1 else "root-after-pattern-application"
    rules = config["pronunciation"]["stress"]
    policy = rules["syllableWeight"]
    counts = {"words": 1, "rootSyllables": n}
    attempt = integer(word["trace"]["attempts"])
    counts[f"selectedAttemptIndex:{attempt}"] = 1
    counts["selectedAttemptIndexSum"] = attempt
    repairs = [repair for repair in word["trace"]["repairs"] if repair["rule"] == "repairStressedNuclei"]
    counts["stressedNucleusRepairEvents"] = len(repairs)
    counts["stressedNucleusRepairWords"] = int(bool(repairs))
    domains = {}
    for domain in DOMAINS:
        snapshot = snapshots.get(common if domain == "root-placement-complete" else domain)
        if snapshot is None:
            availability = unavailable_reason(version, domain)
            counts[f"{domain}:availability:{availability}:words"] = 1
            domains[domain] = {"availability": availability}
            continue
        if domain in ROOT_DOMAINS or domain == "root-placement-complete":
            assert len(snapshot["syllables"]) == n
        observed = snapshot_counts(trace, snapshot, policy)
        counts[f"{domain}:availability:observed:words"] = 1
        for key, value in observed.items():
            counts[f"{domain}:{key}"] = value
        domains[domain] = {"availability": "observed", "actualDomain": snapshot["domain"], "counts": observed}

    forms = word["trace"].get("morphology", {}).get("realization", {})
    roles = [role for role in ("prefix", "suffix") if role in forms and forms[role] is not None]
    morphology = "both" if len(roles) == 2 else roles[0] if roles else "bare"
    root_before = snapshots.get("root-before-primary")
    primary_snapshot = snapshots.get("root-after-primary")
    placement = snapshots.get(common)
    root_weight = [weight(syllable, policy) for syllable in root_before["syllables"]] if root_before else None
    heavy = [item["operational"] == "heavy" for item in root_weight] if root_weight is not None else None
    unknown = [any(value.startswith("unknown:") for value in item["quantities"]) or not item["quantities"] for item in root_weight] if root_weight is not None else None
    placement_marks = marks(placement) if placement else None
    k = placement_marks.count(S) if placement_marks is not None else "unavailable"
    primary_indices = [index for index, value in enumerate(marks(primary_snapshot)) if value == P] if primary_snapshot else []
    primary = primary_indices[0] if len(primary_indices) == 1 else None
    primary_position = f"{primary}:{edge_position(primary, n)}" if primary is not None else "unavailable"
    heavy_mask = "".join("H" if value else "L" for value in heavy) if heavy is not None else "unavailable"
    unknown_mask = "".join("?" if value else "K" for value in unknown) if unknown is not None else "unavailable"
    strata = [f"morphology:{morphology}/root:{n}/word:{len(word['syllables'])}",
              f"root:{n}/K:{k}/primary:{primary_position}/operational:{heavy_mask}/quantity:{unknown_mask}"]
    if placement_marks is not None and heavy is not None:
        for key, value in pattern_features(placement_marks, heavy).items():
            if key.startswith("operationalHeavy"):
                counts["rootPlacementFixedWeight:" + key] = value
    witnesses = {}
    if repairs:
        witnesses["vowel-repair"] = {"events": repairs}
    if attempt > 0:
        witnesses["selected-attempt-positive"] = {"selectedAttemptIndex": attempt}
    schwa_domains = [domain for domain, observed in domains.items() if observed["availability"] == "observed" and observed["counts"]["secondarySchwaWords"]]
    if schwa_domains:
        witnesses["secondary-schwa"] = {"domains": schwa_domains}
    mechanism = None
    if version == 2:
        assert root_before is not None and primary_snapshot is not None and placement_marks is not None and heavy is not None
        source = {"beforePrimary": marks(root_before), "afterPrimary": marks(primary_snapshot), "operationalHeavy": heavy,
                  "secondary": rules["secondary"], "rhythmic": rules["rhythmic"], "lambda": rules["rootPattern"]["lambda"]}
        proposal = trace["rootPattern"]["proposal"]["snapshots"][1]["marks"]
        assert len(proposal) == n and proposal.count(S) == k
        assert [i for i, mark in enumerate(proposal) if mark == P] == [primary]
        assert [i for i, mark in enumerate(placement_marks) if mark == P] == [primary]
        context_id = digest({"input": source, "secondaryCount": k})
        context = contexts[context_id]
        assert semantic(source) == semantic(context["analysis"]["input"])
        assert context["analysis"]["secondaryCount"] == k
        supported = {tuple(row["marks"]): row for row in context["analysis"]["rows"] if row["prior"]["status"] == "finite"}
        assert tuple(proposal) in supported and tuple(placement_marks) in supported
        minimum = min(row["adjacentMarkedPairs"] for row in supported.values())
        variable = len({row["adjacentMarkedPairs"] for row in supported.values()}) > 1
        before = pattern_features(proposal, heavy)
        after = pattern_features(placement_marks, heavy)
        delta = {key: after[key] - before[key] for key in before}
        for value in range(-8, 9):
            counts[f"mechanism:adjacencyDelta:{value}"] = int(delta["adjacentMarkedPairs"] == value)
        for label, features in (("proposal", before), ("application", after)):
            for value in range(9):
                counts[f"mechanism:{label}:adjacency:{value}"] = int(features["adjacentMarkedPairs"] == value)
                counts[f"mechanism:{label}:excessAboveSupportMinimum:{value}"] = int(features["adjacentMarkedPairs"] - minimum == value)
            for key, value in features.items():
                counts[f"mechanism:{label}:{key}"] = value
        for key, value in delta.items():
            counts[f"mechanism:featureDelta:{key}:{value}"] = 1
        tests = {
            "adjacency-increase": delta["adjacentMarkedPairs"] > 0,
            "lapse-ge2-increase": delta["unmarkedRun:all:ge2:count"] > 0,
            "lapse-ge3-increase": delta["unmarkedRun:all:ge3:count"] > 0,
            "heavy-coverage-loss": delta["operationalHeavySecondaryNumerator"] < 0,
            "expected-variable-support": variable,
            "proposal-application-different": proposal != placement_marks,
            "applied-support-minimum-excess": after["adjacentMarkedPairs"] > minimum,
        }
        mechanism = {"contextId": context_id, "proposal": proposal, "application": placement_marks,
                     "minimumSupportedAdjacencies": minimum, "supportCostVaries": variable, "delta": delta}
        for condition, matched in tests.items():
            if matched:
                witnesses[condition] = mechanism
    return {"counts": counts, "strata": strata, "mechanism": mechanism, "witnessConditions": witnesses}


class Aggregator:
    """First witness means frozen traversal order, never largest severity."""
    def __init__(self):
        self.groups = {}
        self.witnesses = {}
        self.words = 0
        self.context_patterns = {}

    def add(self, draw, observation):
        profile, seed, index = draw["profile"], integer(draw["seed"], 0, 2**32 - 1), integer(draw["drawIndex"])
        coordinate = {"profile": profile, "seed": seed, "drawIndex": index}
        names = ["total", f"profile:{profile}", f"stream:{profile}/{seed}"] + [f"profile:{profile}/{stratum}" for stratum in observation["strata"]]
        mechanism = observation["mechanism"]
        for name in names:
            group = self.groups.setdefault(name, {"counts": {}, "contextUses": {}})
            for key, value in observation["counts"].items():
                integer(value)
                group["counts"][key] = integer(group["counts"].get(key, 0) + value)
            if mechanism:
                context_id = mechanism["contextId"]
                group["contextUses"][context_id] = group["contextUses"].get(context_id, 0) + 1
            for condition, evidence in observation["witnessConditions"].items():
                key = name + "|" + condition
                if key not in self.witnesses:
                    self.witnesses[key] = {"group": name, "condition": condition, "coordinate": coordinate,
                                           "wordSha256": digest(draw["word"]), "word": draw["word"], "evidence": evidence}
        if mechanism:
            context = self.context_patterns.setdefault(mechanism["contextId"], {"observedWords": 0, "proposalPatterns": {}, "appliedPatterns": {}})
            context["observedWords"] += 1
            for field, marks_field in (("proposalPatterns", "proposal"), ("appliedPatterns", "application")):
                pattern = "".join({U: "U", P: "P", S: "S"}[mark] for mark in mechanism[marks_field])
                context[field][pattern] = context[field].get(pattern, 0) + 1
        self.words += 1

    def reconcile(self):
        assert self.groups["total"]["counts"]["words"] == self.words
        for group in self.groups.values():
            counts = group["counts"]
            for domain in DOMAINS:
                assert sum(counts.get(f"{domain}:availability:{status}:words", 0) for status in ("observed", "not-executed", "unavailable-historical")) == counts["words"]
            if group["contextUses"]:
                assert sum(group["contextUses"].values()) == counts["words"]
                assert sum(counts.get(f"mechanism:adjacencyDelta:{value}", 0) for value in range(-8, 9)) == counts["words"]
        return {"words": self.words, "groups": self.groups, "witnesses": self.witnesses,
                "empiricalContextPatterns": self.context_patterns}
