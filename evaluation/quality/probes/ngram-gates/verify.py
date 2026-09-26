"""Independent archive/count/certificate check; imports no TypeScript study code."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def grams(text, size):
    data = text.lower().encode("utf-16-le", errors="surrogatepass")
    return [data[i:i + size * 2].decode("utf-16-le", errors="surrogatepass")
            for i in range(0, len(data) - (size - 1) * 2, 2)]


def mulberry_value(seed, call):
    mask = (1 << 32) - 1
    state = (seed + 0x6D2B79F5 * call) & mask
    value = ((state ^ (state >> 15)) * (1 | state)) & mask
    value ^= (value + (((value ^ (value >> 7)) * (61 | value)) & mask)) & mask
    return ((value ^ (value >> 14)) & mask) / (1 << 32)


def gate(counts, total, reference, cutoff, threshold, direction):
    reference_total = sum(reference.values())
    rows = []
    for gram in counts if direction == "over" else reference:
        reference_count = reference.get(gram, 0)
        if reference_count / reference_total > cutoff:
            rows.append({"ngram": gram, "generatedCount": counts.get(gram, 0),
                         "referenceCount": reference_count,
                         "ratio": (counts.get(gram, 0) / total) / (reference_count / reference_total)})
    pick = max if direction == "over" else min
    result = pick(rows, key=lambda row: row["ratio"])
    return {**result, "generatedTotal": total, "referenceTotal": reference_total,
            "cutoff": cutoff, "threshold": threshold, "direction": direction,
            "failed": result["ratio"] > threshold if direction == "over" else result["ratio"] < threshold}


def verify(directory):
    report_bytes = (directory / "report.json").read_bytes()
    report = json.loads(report_bytes)
    protocol = report["protocol"]
    assert report["generatorCommit"] == protocol["generatorCommit"]
    artifacts = report["artifacts"]
    expected_files = sorted([record["file"] for record in artifacts] + ["report.json"])
    assert len(expected_files) == len(set(expected_files))
    assert sorted(path.name for path in directory.iterdir()) == expected_files
    for artifact in artifacts:
        data = (directory / artifact["file"]).read_bytes()
        assert len(data) == artifact["bytes"] and sha(data) == artifact["sha256"], artifact["file"]
    source_bytes = gzip.decompress((directory / "sources.json.gz").read_bytes())
    assert sha(source_bytes) == report["sourceDigest"]
    source_rows = json.loads(source_bytes)
    sources = {source["path"]: source["content"] for source in source_rows}
    assert len(source_rows) == len(sources)
    assert json.loads(sources["evaluation/quality/probes/ngram-gates/protocol.json"]) == protocol
    assert sources["evaluation/quality/probes/ngram-gates/verify.py"] == Path(__file__).read_text()
    thresholds = json.loads(sources["src/config/ngram-thresholds.json"])
    references = [json.loads(sources[f"data/cmu/cmu-lexicon-{name}.json"]) for name in ("bigrams", "trigrams")]
    period, increment = 2 ** 32, 0x6D2B79F5
    anchor = int.from_bytes(hashlib.sha256(protocol["id"].encode()).digest()[:4], "big")
    count = protocol["replicates"]
    schedule = [{"id": "control", "seed": protocol["controlSeed"], "phase": None, "capacity": period}]
    for i in range(count):
        phase = i * period // count
        schedule.append({"id": f"study-{i + 1:02}", "phase": phase,
                         "capacity": (i + 1) * period // count - phase,
                         "seed": (anchor + increment * phase) % period})
    assert schedule == report["schedule"]
    derived_files = ["sources.json.gz", "protocol.json"]
    for entry in schedule:
        derived_files.extend([f"{entry['id']}.json", f"{entry['id']}-written.jsonl.gz", f"{entry['id']}-traces.jsonl.gz"])
    assert sorted(derived_files) == sorted(record["file"] for record in artifacts)
    assert json.loads((directory / "protocol.json").read_text()) == {"protocol": protocol, "schedule": schedule}
    cutoffs = [thresholds["minBigramBaselineFreq"], thresholds["minTrigramBaselineFreq"]]
    eligible = []
    for reference, cutoff in zip(references, cutoffs):
        total = sum(reference.values())
        eligible.append({gram for gram, value in reference.items() if value / total > min(0.001, cutoff)})
    failures = Counter()
    any_failures = 0
    verified = []
    for entry, replicate in zip(schedule, report["replicates"], strict=True):
        assert {key: replicate[key] for key in entry} == entry
        assert json.loads((directory / f"{entry['id']}.json").read_text()) == replicate
        assert isinstance(replicate["rngCalls"], int) and replicate["rngCalls"] >= 0
        assert replicate["consumedStatesIncludingNextValue"] == replicate["rngCalls"] + 1 <= entry["capacity"]
        assert replicate["nextRng"] == mulberry_value(entry["seed"], replicate["rngCalls"] + 1)
        for artifact in replicate["artifacts"]:
            assert artifact in artifacts
        counts = [Counter(), Counter()]
        expected_witnesses = {gram: [] for group in eligible for gram in group}
        expected_traces = {}
        traces = {}
        with gzip.open(directory / f"{entry['id']}-traces.jsonl.gz", "rt") as stream:
            for line in stream:
                trace = json.loads(line)
                assert trace["draw"] not in traces and trace["word"]["trace"]
                assert trace["wordSeed"] == (entry["seed"] + increment * trace["startCalls"]) % period
                assert 0 <= trace["startCalls"] < trace["startCalls"] + trace["calls"] <= replicate["rngCalls"]
                traces[trace["draw"]] = trace
        words = 0
        with gzip.open(directory / f"{entry['id']}-written.jsonl.gz", "rt") as stream:
            for line in stream:
                row = json.loads(line)
                assert row["draw"] == words
                hits = set()
                for index, size in enumerate((2, 3)):
                    occurrences = grams(row["written"], size)
                    counts[index].update(occurrences)
                    for gram in set(occurrences) & eligible[index]:
                        if len(expected_witnesses[gram]) < 3:
                            expected_witnesses[gram].append(words)
                            hits.add(gram)
                if hits:
                    trace = traces[words]
                    assert trace["word"]["written"]["clean"] == row["written"]
                    assert set(trace["grams"]) == hits
                    expected_traces[words] = True
                words += 1
        assert words == replicate["words"] == protocol["wordsPerReplicate"] == thresholds["sampleSize"]
        assert set(expected_traces) == set(traces) and len(traces) == replicate["traceWords"]
        assert expected_witnesses == replicate["witnesses"]
        assert dict(counts[0]) == replicate["bigrams"] and dict(counts[1]) == replicate["trigrams"]
        totals = [sum(counter.values()) for counter in counts]
        assert totals == [replicate["bigramTotal"], replicate["trigramTotal"]]
        gates = {}
        for i, label in enumerate(("bigram", "trigram")):
            gates[f"{label}Over"] = gate(counts[i], totals[i], references[i], 0.001,
                                        thresholds[f"max{label.capitalize()}OverRepresentation"], "over")
            gates[f"{label}Under"] = gate(counts[i], totals[i], references[i], cutoffs[i],
                                         thresholds[f"min{label.capitalize()}Representation"], "under")
        assert gates == replicate["gates"]
        if entry["phase"] is not None:
            failures.update({key: int(value["failed"]) for key, value in gates.items()})
            any_failures += int(any(value["failed"] for value in gates.values()))
        verified.append({"id": entry["id"], "words": words, "traceWitnesses": len(traces), "counts": totals})
    assert dict(failures) == report["failureCounts"] and any_failures == report["anyGateFailures"]
    assert (directory / "report.json").read_bytes() == report_bytes
    return {"reportSha256": sha(report_bytes), "verifierSha256": sha(Path(__file__).read_bytes()),
            "verified": verified, "failureCounts": dict(failures), "anyGateFailures": any_failures,
            "checks": ["exact file set and hashes", "source/protocol identity", "phase schedule and capacities",
                       "all written draws and n-gram counts", "all first-three witness indices",
                       "witness spelling and RNG coordinates", "all four gate extrema and denominators",
                       "control excluded from study rejection counts"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    result = verify(args.run)
    with args.out.open("x") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
