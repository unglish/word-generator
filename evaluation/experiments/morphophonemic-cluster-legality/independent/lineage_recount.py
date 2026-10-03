"""Independent JSON-only structural replay. Does not certify configured rule eligibility."""
from collections import Counter

PARTS = ("prefix", "root", "suffix")
SEGMENTS = ("onset", "nucleus", "coda")


def units(text):
    encoded = text.encode("utf-16-le", "surrogatepass")
    return [encoded[i:i + 2].decode("utf-16-le", "surrogatepass") for i in range(0, len(encoded), 2)]


def natural(value):
    return type(value) is int and 0 <= value <= 9007199254740991


def replay_cells(record):
    assert type(record["version"]) is int and record["version"] == 1 and record["scope"] == "operational-cell-lineage"
    parts = {part: [] for part in PARTS}
    allocated = set()

    def allocate(identity):
        assert natural(identity) and identity not in allocated
        allocated.add(identity)

    for cell in record["initial"]:
        allocate(cell["id"])
        part, source = cell["part"], cell["source"]
        assert part in parts and len(units(cell["text"])) == 1
        if part == "root":
            assert source["kind"] in ("base-cell", "unresolved-root")
        else:
            assert source["kind"] == "affix"
        if source["kind"] == "base-cell":
            assert natural(source["cellId"])
        else:
            assert natural(source["offset"]) and source["offset"] == len(parts[part])
        parts[part].append(cell)
    for number, event in enumerate(record["events"]):
        assert natural(event["id"]) and event["id"] == number and event["part"] in parts
        assert all(natural(identity) for identity in event["inputIds"])
        cells = parts[event["part"]]
        start = event["start"]
        before, after = units(event["before"]), units(event["after"])
        assert natural(start) and start + len(before) <= len(cells)
        removed = cells[start:start + len(before)]
        assert [cell["text"] for cell in removed] == before
        assert [cell["id"] for cell in removed] == event["inputIds"]
        assert len(after) == len(event["outputIds"])
        inserted = []
        for offset, (text, identity) in enumerate(zip(after, event["outputIds"])):
            allocate(identity)
            inserted.append(dict(id=identity, text=text, part=event["part"],
                                 source=dict(kind="edit", eventId=number, offset=offset)))
        cells[start:start + len(before)] = inserted
    final = [cell for part in PARTS for cell in parts[part]]
    for cell in record["cells"]:
        assert natural(cell["id"])
        source = cell["source"]
        for key in ("cellId", "eventId", "offset"):
            if key in source:
                assert natural(source[key])
    assert final == record["cells"]
    assert [cell["text"] for cell in final] == units(record["surface"])
    return final


def replay_phones(record, syllables):
    assert type(record["version"]) is int and record["version"] == 1
    sounds = {}
    for index, phone in enumerate(record["initial"]):
        assert natural(phone["id"]) and phone["id"] == index and isinstance(phone["initialSound"], str)
        source = phone["source"]
        if source["kind"] == "segment":
            assert source["part"] in PARTS and source["segment"] in SEGMENTS
            assert natural(source["syllable"]) and natural(source["index"])
        elif source["kind"] == "flat-affix":
            assert source["part"] in ("prefix", "suffix") and natural(source["index"])
        else:
            assert source["kind"] == "bridge" and source["boundary"] in ("prefix-root", "root-suffix")
        sounds[index] = phone["initialSound"]
    for change in record["changes"]:
        assert natural(change["id"]) and sounds[change["id"]] == change["before"]
        sounds[change["id"]] = change["after"]
    previous = -1
    for realization in record["realization"]:
        assert natural(realization["id"])
        index = realization["changeIndex"]
        assert natural(index) and previous < index < len(record["changes"])
        previous = index
        change = record["changes"][index]
        assert change == dict(id=realization["id"], before=realization["before"]["sound"],
                              after=realization["after"]["sound"], rule=realization["rule"])
    expected = [(s, segment, i, phone["sound"]) for s, syllable in enumerate(syllables)
                for segment in SEGMENTS for i, phone in enumerate(syllable[segment])]
    assert len(expected) == len(record["final"])
    seen = set()
    for phone, coordinate in zip(record["final"], expected):
        identity = phone["id"]
        assert natural(identity) and identity in sounds and identity not in seen
        seen.add(identity)
        assert natural(phone["syllable"]) and natural(phone["index"])
        assert (phone["syllable"], phone["segment"], phone["index"], phone["sound"]) == coordinate
        assert sounds[identity] == phone["sound"]
    assert seen == set(sounds)


def recount_word(word):
    counts = Counter(words=1)
    trace = word.get("trace", {})
    morphology = trace.get("morphology")
    template = morphology["template"] if morphology else "no-morphology-plan"
    counts["words/" + ("planned-bare" if template == "bare" else template)] += 1
    base = trace.get("baseSpelling")
    if base is None:
        counts["missingBaseEvidence"] += 1
    else:
        if any(edit["phase"] == "gap" for edit in base["edits"]):
            counts["words/gap-overridden"] += 1
        for kind in ("shared", "split"):
            ledger = base.get(kind)
            counts[f"root/{kind}/unavailable"] += int(ledger is None)
            if ledger is not None:
                counts[f"root/{kind}/constructions"] += len(ledger["constructions"])
                counts[f"root/{kind}/liveConstructions"] += len(ledger["liveConstructionIds"])
    if trace.get("finalNucleus", {}).get("repairs"):
        counts["words/final-nucleus-repaired"] += 1
    for name, required in (("finalNucleus", True), ("pronunciationPasses", True),
                           ("morphologyPreparation", morphology is not None),
                           ("morphologyWriting", template in ("prefixed", "suffixed", "both")),
                           ("gapSpellingPass", template in ("bare", "no-morphology-plan"))):
        if required and name not in trace:
            counts["missingOperationPackets/" + name] += 1
    final = trace.get("finalWord")
    if final is None:
        counts["missingFinalEvidence"] += 1
        return counts
    cells = replay_cells(final["spelling"])
    assert [cell["text"] for cell in cells] == units(word["written"]["clean"])
    replay_phones(final["phones"], word["syllables"])
    for phase in ("initial", "cells"):
        for cell in final["spelling"][phase]:
            counts[f"cells/{phase}/{cell['part']}/{cell['source']['kind']}"] += 1
    live = {cell["id"] for cell in cells}
    by_id = {cell["id"]: cell["part"] for cell in final["spelling"]["initial"]}
    for event in final["spelling"]["events"]:
        by_id.update({identity: event["part"] for identity in event["outputIds"]})
    for identity, part in by_id.items():
        if identity not in live:
            counts[f"cells/deleted/{part}"] += 1
    counts["cells/finalPhonemicLicenseUnavailable"] += len(cells)
    if any(event["rule"] == "repairConsonantLetters" for event in final["spelling"]["events"]):
        counts["words/final-cleanup-edited"] += 1
    for event in final["spelling"]["events"]:
        key = f"edits/{event['part']}/{event['rule']}"
        counts[key] += 1
        counts[key + "/removedUnits"] += len(units(event["before"]))
        counts[key + "/insertedUnits"] += len(units(event["after"]))
    for phone in final["phones"]["initial"]:
        source = phone["source"]
        counts[f"phones/initial/{source.get('part', 'bridge')}/{source['kind']}"] += 1
    origins = {phone["id"]: phone["source"] for phone in final["phones"]["initial"]}
    root_start = word.get("lexical", {}).get("rootSyllableStart", 0)
    root_length = len(word.get("lexical", {}).get("root", []))
    for phone in final["phones"]["final"]:
        origin = origins[phone["id"]]
        part = origin.get("part", "bridge")
        counts[f"phones/final/{part}/{origin['kind']}"] += 1
        if part in ("prefix", "suffix") and root_start <= phone["syllable"] < root_start + root_length:
            counts[f"phones/affixInRoot/{part}"] += 1
    for origin in origins.values():
        if origin["kind"] == "bridge":
            counts["phones/bridges/" + origin["boundary"]] += 1
    for change in final["phones"]["changes"]:
        counts["phones/changes/" + change["rule"]] += 1
    for change in final["phones"]["realization"]:
        counts["phones/realizations/" + change["rule"]] += 1
    return counts
