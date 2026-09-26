"""V2: preregistered supplemental histograms plus independent raw-ledger replay."""
import gzip
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

CAPS = {"repairConsonantPileups", "repairConsonantLetters", "repairFinalConsonantLetters", "repairVowelLetters", "postJoinVowelCap"}
PROTOCOL = "451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862"
EVALUATOR = "ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def owners(cell):
    origin = cell["origin"]
    return origin["sourceUnitIds"] if origin["kind"] == "rewrite" else [origin["unitId"]]


def replay(base):
    """Reconstruct cell edits and changed-phone multiplicity, not reading legality."""
    assert len(base["phones"]) == len(base["units"])
    cells, known, certificates = [], set(), base.get("certificates", [])
    seen_certificates, replacements = set(), set()
    for i, unit in enumerate(base["units"]):
        assert unit["id"] == unit["choiceId"] == base["phones"][i]["id"] == i
        assert unit["phoneIds"] == [i]
        assert len(unit["sourceCellIds"]) == len(unit["afterDoubling"])
        for offset, cell_id in enumerate(unit["sourceCellIds"]):
            assert cell_id not in known
            known.add(cell_id)
            cell = {"id": cell_id, "text": unit["afterDoubling"][offset], "origin": {"kind": "selection", "unitId": i, "offset": offset}}
            if base["version"] == 2:
                cell["partId"] = base["phones"][i]["syllableIndex"]
            cells.append(cell)
    for i, edit in enumerate(base["edits"]):
        assert edit["id"] == i
        start, size = edit["start"], len(edit["input"])
        assert start >= 0 and cells[start:start + size] == edit["input"]
        assert edit["before"] == "".join(c["text"] for c in edit["input"])
        assert edit["after"] == "".join(c["text"] for c in edit["output"])
        for offset, cell in enumerate(edit["output"]):
            assert cell["id"] not in known and len(cell["text"]) == 1
            known.add(cell["id"])
            origin = cell["origin"]
            assert origin["editId"] == i
            if origin["kind"] == "licensed":
                cid, uid = origin["certificateId"], origin["unitId"]
                certificate = certificates[cid]
                assert certificate["id"] == cid and certificate["version"] == 1
                if cid not in seen_certificates:
                    assert certificate["before"] == "".join(c["text"] for c in cells)
                    assert certificate["inputCellIds"] == [c["id"] for c in cells]
                    assert certificate["phoneIds"] == [p for entry in certificate["replacements"] for p in entry["phoneIds"]]
                    assert len(certificate["phoneIds"]) == len(set(certificate["phoneIds"]))
                    seen_certificates.add(cid)
                entries = [entry for entry in certificate["replacements"] if entry["unitId"] == uid]
                assert len(entries) == 1
                entry = entries[0]
                assert entry["phoneIds"] == base["units"][uid]["phoneIds"]
                assert entry["inputCellIds"] == [c["id"] for c in edit["input"]]
                assert entry["before"] == edit["before"] and entry["after"] == edit["after"]
                assert origin["offset"] == offset and origin["sourceUnitIds"] == [uid]
                assert cell["partId"] == entry["partId"]
                if offset == 0:
                    assert (cid, uid) not in replacements
                    replacements.add((cid, uid))
            else:
                assert origin["kind"] == "rewrite" and origin["ownership"] == "unresolved"
                expected = list(dict.fromkeys(p for c in edit["input"] for p in owners(c)))
                assert origin["sourceUnitIds"] == expected
        cells[start:start + size] = edit["output"]
    assert cells == base["cells"] and "".join(c["text"] for c in cells) == base["surface"]
    assert base["unresolvedCells"] == sum(c["origin"]["kind"] == "rewrite" for c in cells)
    assert seen_certificates == set(range(len(certificates)))
    assert replacements == {(c["id"], e["unitId"]) for c in certificates for e in c["replacements"]}


def observe(word):
    base = word["trace"]["baseSpelling"]
    replay(base)
    out = Counter(words=1, phones=len(base["phones"]), units=len(base["units"]), unresolvedCells=base["unresolvedCells"])
    out[f'legacySelectedAttemptIndex:{word["trace"]["attempts"]}'] += 1
    out[f'ledgerVersion:{base["version"]}'] += 1
    if base["unresolvedCells"]:
        out["wordsWithUnresolvedCells"] += 1
    live = {c["id"] for c in base["cells"]}
    lineage = {p for c in base["cells"] for p in owners(c)}
    rewritten = {p for c in base["cells"] if c["origin"]["kind"] == "rewrite" for p in owners(c)}
    licensed = {p for c in base["cells"] if c["origin"]["kind"] == "licensed" for p in owners(c)}
    for unit in base["units"]:
        uid, original = unit["id"], set(unit["sourceCellIds"])
        spelling = json.dumps([base["phones"][uid]["soundAtSpelling"], unit["selected"]], ensure_ascii=False, separators=(",", ":"))
        out[f"selectedSpelling:{spelling}"] += 1
        if unit["selected"] == "th":
            out["selectedThUnits"] += 1
        if original and uid not in lineage:
            out["noSurvivingLineageUnits"] += 1
            consuming = [e for e in base["edits"] if any(uid in owners(c) for c in e["input"])]
            rule = consuming[-1]["rule"] if consuming else "unavailable"
            out[f"noLineageRule:{rule}"] += 1
            if rule in CAPS:
                out["capNoLineageUnits"] += 1
        remaining = original & live
        if 0 < len(remaining) < len(original) and uid not in rewritten and uid not in licensed:
            out["partialSourceUnits"] += 1
            if unit["selected"] == "th" and len(remaining) == 1:
                out["partialThUnits"] += 1
                missing = next(i for i in unit["sourceCellIds"] if i not in live)
                edits = [e for e in base["edits"] if any(c["id"] == missing for c in e["input"])]
                rule = edits[0]["rule"] if edits else "unavailable"
                out[f"partialThRule:{rule}"] += 1
                if rule in CAPS:
                    out["capPartialThUnits"] += 1
    cap_edits = [e for e in base["edits"] if e["rule"] in CAPS]
    out["capEdits"] += len(cap_edits)
    if cap_edits:
        out["capWords"] += 1
    out["capUnknownInputCells"] += sum(c["origin"]["kind"] == "rewrite" for e in cap_edits for c in e["input"])
    episodes = word["trace"].get("spellingBudgets")
    if episodes is None:
        out["budgetEpisodesUnavailableWords"] += 1
    for e in episodes or []:
        scope, status = e["scope"], e["status"]
        for key in ["episodes", f"episodeScope:{scope}", f"episodeStatus:{status}", f"{scope}:status:{status}"]:
            out[key] += 1
        if e["before"]["exceeded"]:
            out["overBudgetEpisodes"] += 1
        for key in e["before"]["exceeded"]:
            out[f"implicatedBudget:{key}"] += 1
        out["visitedAssignments"] += e["visitedAssignments"]
        out["eligibleOptionsVisited"] += e["legalOptions"]
        out["changedUnits"] += len(e["changedUnits"])
        out["episodeUnresolvedInputCells"] += e["unresolvedCells"]
        out[f"{scope}:unresolvedInputCells"] += e["unresolvedCells"]
        if e["unresolvedCells"]:
            out[f"{scope}:episodesWithUnresolvedInput"] += 1
        for stage in ["before", "after"]:
            for key, value in e[stage]["values"].items():
                out[f"{scope}:{stage}:{key}:{value}"] += 1
        if status == "infeasible":
            out[f'infeasibleReason:{e["reason"]}'] += 1
            out[f'{scope}:reason:{e["reason"]}'] += 1
            for key, count in e["refusals"].items():
                out[f"branchRefusal:{key}"] += count
    certificates = base.get("certificates", [])
    out["verifiedCertificates"] += len(certificates)  # Comparison key; only structural replay is independent here.
    out["changedPhoneIdsInCertificates"] += sum(len(c["phoneIds"]) for c in certificates)
    for certificate in certificates:
        for replacement in certificate["replacements"]:
            uid = replacement["unitId"]
            spelling = json.dumps([base["phones"][uid]["soundAtSpelling"], replacement["before"], replacement["after"]], ensure_ascii=False, separators=(",", ":"))
            out[f"licensedSpelling:{spelling}"] += 1
        for choice in certificate["choices"]:
            out[f'replayedPool:{choice["pool"]}'] += 1
            if choice["quotaRelaxed"]:
                out["replayedQuotaRelaxations"] += 1
    surface = word["written"]["clean"].lower()
    out["letters"] += len(surface)
    out[f"writtenLength:{len(surface)}"] += 1
    if re.search(r"[bcdfghjklmnpqrstvwxyz]{5}", surface):
        out["rawFiveConsonantWords"] += 1
    return out


def main():
    run, expected_source, report_path = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    manifest_bytes = (run / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)["manifest"]
    assert manifest["cohort"] == "development"
    assert manifest["generator"]["sourceDigest"] == expected_source
    assert manifest["protocolDigest"] == PROTOCOL and manifest["evaluatorDigest"] == EVALUATOR
    artifacts = manifest["artifacts"]
    assert len({a["file"] for a in artifacts}) == len(artifacts)
    for artifact in artifacts:
        data = (run / artifact["file"]).read_bytes()
        assert len(data) == artifact["bytes"] and sha(data) == artifact["sha256"], artifact["file"]
    sources = json.loads(gzip.decompress((run / "sources.json.gz").read_bytes()))["generator"]
    assert sha(json.dumps(sources, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()) == expected_source
    profiles, replicates, strata, total = {}, {}, {}, Counter()
    expected = {f'{p["id"]}-{s}.jsonl.gz' for p in manifest["protocol"]["profiles"] for s in p["seeds"]["development"]}
    paths = list((run / "words").iterdir())
    assert {p.name for p in paths} == expected and all(p.is_file() and not p.is_symlink() for p in paths)
    assert {a["file"] for a in artifacts if a["file"].startswith("words/")} == {"words/" + name for name in expected}
    for p in manifest["protocol"]["profiles"]:
        profiles[p["id"]] = Counter()
        for seed in p["seeds"]["development"]:
            counts = Counter()
            with gzip.open(run / "words" / f'{p["id"]}-{seed}.jsonl.gz', "rt") as rows:
                for index, row in enumerate(rows):
                    draw = json.loads(row)
                    assert (draw["profile"], draw["seed"], draw["drawIndex"]) == (p["id"], seed, index)
                    observed = observe(draw["word"])
                    counts.update(observed)
                    morphology = draw["word"]["trace"].get("morphology") or {}
                    realization = morphology.get("realization")
                    prefix, suffix = (bool((realization or morphology).get(k)) for k in ["prefix", "suffix"])
                    label = "both" if prefix and suffix else "prefix" if prefix else "suffix" if suffix else "bare"
                    if realization is None and (prefix or suffix):
                        label = "planned-only:" + label
                    strata.setdefault(f'{p["id"]}/{label}', Counter()).update(observed)
            assert counts["words"] == 10000
            replicates[f'{p["id"]}/{seed}'] = counts
            profiles[p["id"]].update(counts)
            total.update(counts)
            print(f'{p["id"]}/{seed}: {counts["words"]} structurally replayed', flush=True)
    assert total["words"] == 200000
    result = {"result": "pass", "scope": "Independent raw counts and exact cell/certificate-edit structure; probability/reading licenses verified separately by frozen TypeScript observer", "manifestSha256": sha(manifest_bytes), "sourceDigest": expected_source, "scriptSha256": sha(Path(__file__).read_bytes()), "total": total, "profiles": profiles, "replicates": replicates, "strata": strata}
    with report_path.open("x") as output:
        json.dump(result, output, indent=2)
        output.write("\n")


if __name__ == "__main__":
    main()
