"""Independent raw active-archive recount and literal-history mechanism proof.

This does not replay production sampler/affix events; those have a separately
bound same-engine integration verifier. It checks every saved context/use/count.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys
from types import ModuleType

HERE = Path(__file__).resolve().parent
helper_path = HERE / "verify-mechanism.py"
helper = ModuleType("independent_mechanism")
helper.__file__ = str(helper_path)
exec(compile(helper_path.read_bytes(), str(helper_path), "exec"), helper.__dict__)
U, P, S = helper.U, helper.P, helper.S
DOMAINS = ["root-before-primary", "root-after-primary", "root-after-pattern-application", "assembled-after-morphology",
           "final-lexical-before-realization", "surface-after-realization", "root-after-explicit-secondary", "root-after-rhythmic"]
sha = lambda data: hashlib.sha256(data).hexdigest()


def add(counts, name, amount=1):
    helper.integer(amount, 0, 2 ** 53 - 1)
    counts[name] = counts.get(name, 0) + amount
    helper.integer(counts[name], 0, 2 ** 53 - 1)


def semantic(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def strict_equal(actual, expected):
    assert semantic(actual) == semantic(expected)


def classify_weight(syllable, policy):
    known = 0
    quantities = []
    for phone in syllable["nucleus"]:
        declared = phone.get("nuclearQuantity")
        if declared is None: status = "unknown:unspecified"
        elif policy["type"] == "legacy-segment-count": status = "unknown:legacy-policy"
        elif declared["analysis"] != policy["analysis"]: status = "unknown:model-mismatch"
        else:
            moras = helper.integer(declared["moras"], 1, 2)
            status = f"known:{moras}"
            known += moras
        quantities.append(status)
    legacy = "heavy" if syllable["coda"] or len(syllable["nucleus"]) > 1 else "light"
    if policy["type"] == "legacy-segment-count": return legacy, "legacy-rule", quantities
    assert policy["type"] == "moraic"
    if not quantities: analytical = None
    elif syllable["coda"] and policy["coda"] == "weight-by-position": analytical = "heavy"
    elif known >= 2: analytical = "heavy"
    elif all(item.startswith("known:") for item in quantities): analytical = "light"
    else: analytical = None
    if analytical: return analytical, "moraic-analysis", quantities
    assert policy["unknown"] == "legacy-segment-count"
    return legacy, "legacy-fallback", quantities


def domain_counts(counts, domain, snapshot):
    if snapshot is None:
        add(counts, f"{domain}:unavailableWords")
        return
    marks = [syllable["mark"] for syllable in snapshot["syllables"]]
    pattern = helper.key(marks)
    add(counts, f"{domain}:observedWords")
    add(counts, f"{domain}:syllables", len(marks))
    add(counts, f"{domain}:primaryMarks", marks.count(P))
    add(counts, f"{domain}:secondaryMarks", marks.count(S))
    add(counts, f"{domain}:adjacentPairs", helper.oracle.adjacency(marks))
    add(counts, f"{domain}:pattern:{pattern}")
    for match in re.finditer("U+", pattern):
        initial, final = match.start() == 0, match.end() == len(pattern)
        position = "whole-word" if initial and final else "initial" if initial else "final" if final else "internal"
        add(counts, f"{domain}:unmarkedRun:{position}:{len(match.group())}")


def observe_word(word, config):
    trace = word["trace"]["stressPattern"]
    assert type(trace["version"]) is int and trace["version"] == 2
    assert "stressWeight" not in word["trace"]
    n = helper.integer(trace["rootSyllableCount"], 1, 9)
    assert [item["domain"] for item in trace["snapshots"]] == DOMAINS[:6]
    snapshots = {item["domain"]: item for item in trace["snapshots"]}
    assert all(len(snapshot["syllables"]) == n for snapshot in trace["snapshots"][:3])
    assert len(trace["weightInput"]["syllables"]) == n
    counts = {"words": 1, "rootSyllables": n}
    for domain in DOMAINS: domain_counts(counts, domain, snapshots.get(domain))
    rules = config["pronunciation"]["stress"]
    policy = rules["syllableWeight"]
    heavy = []
    for index, syllable in enumerate(trace["snapshots"][0]["syllables"]):
        weight, basis, quantities = classify_weight(syllable, policy)
        strict_equal(trace["weightInput"]["syllables"][index]["operational"], {"weight": weight, "basis": basis})
        add(counts, f"operationalWeight:{weight}:{basis}")
        for quantity in quantities: add(counts, f"nuclearQuantity:{quantity}")
        heavy.append(weight == "heavy")
    add(counts, "appliedAssignmentEvents", len(trace["events"]))
    for event in trace["events"]:
        cause = event["cause"]
        name = cause["kind"]
        if name == "morphology": name = trace["morphology"][helper.integer(cause["effectId"], 0, len(trace["morphology"]) - 1)]["role"] + ":" + cause["action"]
        add(counts, "appliedCause:" + name)
    proposal = trace["rootPattern"]["proposal"]["snapshots"][1]["marks"]
    applied = [syllable["mark"] for syllable in trace["snapshots"][2]["syllables"]]
    k = proposal.count(S)
    assert len(proposal) == n and len(applied) == n and applied.count(S) == k
    source = {"beforePrimary": [syllable["mark"] for syllable in trace["snapshots"][0]["syllables"]],
              "afterPrimary": [syllable["mark"] for syllable in trace["snapshots"][1]["syllables"]],
              "operationalHeavy": heavy, "secondary": rules["secondary"], "rhythmic": rules["rhythmic"], "lambda": rules["rootPattern"]["lambda"]}
    context_id = sha(semantic({"input": source, "secondaryCount": k}).encode())
    forms = word["trace"].get("morphology", {}).get("realization", {})
    role = "both" if forms.get("prefix") and forms.get("suffix") else "prefix" if forms.get("prefix") else "suffix" if forms.get("suffix") else "bare"
    return counts, context_id, source, k, helper.key(proposal), helper.key(applied), f"{role}/root:{n}/word:{len(word['syllables'])}"


def update_group(group, counts, context, k, proposal, applied):
    for name, value in counts.items(): add(group["counts"], name, value)
    add(group["contextUses"], context["id"])
    extra = {"proposalSecondaryCount": k, "sampledSecondaryCount": k,
             "proposalAdjacentPairs": sum(a != "U" and b != "U" for a, b in zip(proposal, proposal[1:])),
             "sampledAdjacentPairs": sum(a != "U" and b != "U" for a, b in zip(applied, applied[1:])),
             "proposalChangedWords": int(proposal != applied), "supportVariableWords": int(context["analysis"]["expectation"]["supportCostVaries"]),
             "proposalPattern:" + proposal: 1, "sampledPattern:" + applied: 1, f"proposalK:{k}": 1}
    for name, value in extra.items(): add(group["counts"], name, value)


def regular(root, relative):
    assert root.is_dir() and not root.is_symlink()
    path = root
    parts = relative.split("/")
    assert all(part not in ("", ".", "..") for part in parts)
    for i, part in enumerate(parts):
        path /= part
        assert not path.is_symlink()
        assert path.is_file() if i == len(parts) - 1 else path.is_dir()
    return path


def verify_sources(frozen):
    for field, root in [("candidateSources", frozen["root"]), ("originalSources", frozen["original"]), ("tools", frozen["root"]),
                        ("evaluator", frozen["root"]), ("references", frozen["root"]), ("dependencies", frozen["root"]), ("immutablePublishedFiles", frozen["root"])]:
        for record in frozen[field]:
            data = regular(Path(root), record["path"]).read_bytes()
            assert sha(data) == record["sha256"]
            if "bytes" in record: assert len(data) == record["bytes"]


def verify_archive_sources(run, manifest, frozen):
    sources = json.loads(gzip.decompress((run / "sources.json.gz").read_bytes()))
    groups = {"generator": [r for r in frozen["candidateSources"] if r["path"].startswith("src/")],
              "evaluator": frozen["tools"] + frozen["evaluator"] + frozen["dependencies"], "references": frozen["references"],
              "packageFiles": [r for r in frozen["candidateSources"] if r["path"] in ("package.json", "package-lock.json")]}
    assert set(sources) == set(groups)
    for field, records in groups.items():
        actual = {record["path"]: record["content"].encode() for record in sources[field]}
        assert len(actual) == len(sources[field]) and set(actual) == {record["path"] for record in records}
        for record in records: assert sha(actual[record["path"]]) == record["sha256"]
    strict_equal(manifest["generator"]["effectiveConfig"], frozen["configs"]["active"])
    strict_equal(manifest["producer"]["engine"], frozen["engine"])
    package_lock = next(record["content"] for record in sources["packageFiles"] if record["path"] == "package-lock.json")
    strict_equal(manifest["environment"], {"node": frozen["engine"]["version"], "platform": frozen["engine"]["platform"],
                                          "arch": frozen["engine"]["arch"], "packageLockDigest": sha(semantic(package_lock).encode())})


def verify(args):
    freeze_bytes = args.freeze.read_bytes(); assert sha(freeze_bytes) == args.freeze_sha
    report_bytes = args.analysis.read_bytes(); assert sha(report_bytes) == args.analysis_sha
    manifest_bytes = regular(args.run, "manifest.json").read_bytes(); assert sha(manifest_bytes) == args.manifest_sha
    frozen = json.loads(freeze_bytes); report = json.loads(report_bytes); manifest = json.loads(manifest_bytes)["manifest"]
    assert HERE == Path(frozen["root"]) / "evaluation/experiments/conditional-root-stress-runtime"
    assert report["passed"] is True and report["variant"] == "active" and report["schemaVersion"] == "q09-runtime-observation-v1"
    assert report["sourceFreezeSha256"] == manifest["producer"]["sourceFreezeSha256"] == args.freeze_sha
    assert report["archiveManifestSha256"] == args.manifest_sha
    assert report["generatorSourceDigest"] == manifest["generator"]["sourceDigest"]
    assert manifest["producer"]["variant"] == "active" and manifest["producer"]["rawSummarySchema"] == "q09-raw-capture-v1"
    assert manifest["producer"]["metricStatus"] == "not-evaluated" and manifest["cohort"] == "development"
    strict_equal(manifest["protocol"], frozen["schedule"])
    assert manifest["protocol"]["wordsPerReplicate"] == 10000
    pins = {record["file"]: record for record in manifest["artifacts"]}
    assert len(pins) == len(manifest["artifacts"])
    schedule = [(profile, seed) for profile in frozen["schedule"]["profiles"] for seed in profile["seeds"]["development"]]
    expected = {"summary.json", "sources.json.gz", "generation-accounting.json"} | {f"words/{profile['id']}-{seed}.jsonl.gz" for profile, seed in schedule}
    assert set(pins) == expected and len(schedule) == 20
    def check_files():
        actual = {p.name for p in args.run.iterdir() if p.name != "words"} | {f"words/{p.name}" for p in (args.run / "words").iterdir()}
        assert actual == expected | {"manifest.json"}
        for name, record in pins.items():
            data = regular(args.run, name).read_bytes(); assert len(data) == record["bytes"] and sha(data) == record["sha256"]
    verify_sources(frozen); check_files(); verify_archive_sources(args.run, manifest, frozen)
    contexts = {}; proof = {"contexts": 0, "queries": 0, "positive": 0, "zero": 0}
    actual_contexts = {}
    for context in report["contexts"]:
        assert re.fullmatch("[a-f0-9]{64}", context["id"]) and context["id"] not in contexts
        expected_id = sha(semantic({"input": context["analysis"]["input"], "secondaryCount": context["analysis"]["secondaryCount"]}).encode())
        assert context["id"] == expected_id
        checked = helper.verify_context(context)
        add(proof, "contexts")
        for name in ("queries", "positive", "zero"): add(proof, name, checked[name])
        contexts[context["id"]] = context
        actual_contexts[context["id"]] = {"observedWords": 0, "proposalPatterns": {}, "appliedPatterns": {}}
    empty = lambda: {"counts": {}, "contextUses": {}}
    groups = {"total": empty(), "profiles": {}, "streams": {}, "strata": {}}
    words = 0
    for profile, seed in schedule:
        count = 0
        with gzip.open(args.run / f"words/{profile['id']}-{seed}.jsonl.gz", "rt", encoding="utf8") as stream:
            for line in stream:
                assert line.endswith("\n") and line != "\n"
                draw = json.loads(line)
                assert draw["profile"] == profile["id"]
                assert helper.integer(draw["seed"], 0, 2**32 - 1) == seed
                assert helper.integer(draw["drawIndex"], 0, 9999) == count
                counts, context_id, source, k, proposal, applied, stratum = observe_word(draw["word"], frozen["configs"]["active"])
                context = contexts[context_id]
                strict_equal(context["analysis"]["input"], source); assert context["analysis"]["secondaryCount"] == k
                supported = {helper.key(row["marks"]) for row in context["analysis"]["rows"] if row["prior"]["status"] == "finite"}
                assert proposal in supported and applied in supported
                observed = actual_contexts[context_id]; add(observed, "observedWords")
                add(observed["proposalPatterns"], proposal); add(observed["appliedPatterns"], applied)
                targets = [groups["total"], groups["profiles"].setdefault(profile["id"], empty()), groups["streams"].setdefault(f"{profile['id']}/{seed}", empty()),
                           groups["strata"].setdefault(f"{profile['id']}/{stratum}", empty())]
                for target in targets: update_group(target, counts, context, k, proposal, applied)
                count += 1; words += 1
        assert count == 10000
    assert words == report["completedWords"] == 200000
    strict_equal(groups, report["groups"])
    for context_id, observed in actual_contexts.items():
        strict_equal(observed, {field: contexts[context_id][field] for field in observed})
    verify_sources(frozen); check_files()
    assert args.freeze.read_bytes() == freeze_bytes and args.analysis.read_bytes() == report_bytes
    assert (args.run / "manifest.json").read_bytes() == manifest_bytes
    return {"schemaVersion": "q09-independent-runtime-recount-v1", "passed": True, "words": words, "streams": 20, **proof,
            "scope": "all active context masses/support and raw aggregate counts; production sampler/event replay remains separate",
            "freezeSha256": args.freeze_sha, "analysisSha256": args.analysis_sha, "manifestSha256": args.manifest_sha,
            "verifierSha256": sha(Path(__file__).read_bytes()), "python": {"version": sys.version, "executableSha256": sha(Path(sys.executable).read_bytes())}}


def protect_output(args):
    freeze_bytes = args.freeze.read_bytes()
    assert sha(freeze_bytes) == args.freeze_sha
    frozen = json.loads(freeze_bytes)
    target = args.out.resolve()
    for source in (args.run, HERE.parents[2], Path(frozen["original"])):
        assert not target.is_relative_to(source.resolve()), "Output overlaps an input tree"
    assert target not in (args.freeze.resolve(), args.analysis.resolve())
    assert not args.out.exists()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for name in ("freeze", "run", "analysis", "out"): parser.add_argument("--" + name, type=Path, required=True)
    for name in ("freeze-sha", "manifest-sha", "analysis-sha"): parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    protect_output(args)
    try:
        outcome = verify(args)
    except Exception as error:
        outcome = {"schemaVersion": "q09-independent-runtime-recount-v1", "passed": False, "error": {"type": type(error).__name__, "message": str(error)}}
        with args.out.open("x") as stream: json.dump(outcome, stream, allow_nan=False); stream.write("\n")
        raise
    with args.out.open("x") as stream: json.dump(outcome, stream, allow_nan=False); stream.write("\n")
