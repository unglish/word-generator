"""Q13b independent doubling/strata arithmetic, adapted from retained Q12c recount.

Historical Q12c verifier remains unchanged. Original sampler records retain the
same contract in ledger v4; shared formations are subsequent operations.
"""
import json
import math
import sys

if sys.flags.optimize:
    raise RuntimeError('Assertions must be enabled')

COUNTS = ("words", "units", "sampledAttempts", "sampledSuccesses", "sampledFailures", "directlyCounted",
          "skipped", "quotaIncrements", "unsupportedOrdinaryExpansions", "sToCkExpansions",
          "wordsWithSampledSuccess", "wordsWithUnsupportedOrdinaryExpansion", "wordsWithSToCkExpansion")

def key(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

def event_observation(word, allowed):
    trace = word["trace"]
    base = trace["baseSpelling"]
    assert type(base["version"]) is int and base["version"] in (3, 4)
    decisions = trace["graphemeSelections"]
    assert len(decisions) == len(base["units"]) == len(base["phones"])
    assert [u["id"] for u in base["units"]] == list(range(len(decisions)))
    assert [p["id"] for p in base["phones"]] == list(range(len(decisions)))
    units = {u["choiceId"]: u for u in base["units"]}
    assert len(units) == len(decisions)
    counts = dict.fromkeys(COUNTS, 0)
    counts.update(words=1, units=len(decisions))
    events = []
    for index, choice in enumerate(decisions):
        assert type(choice["index"]) is int and choice["index"] == index
        unit = units[index]
        assert unit["id"] == index and unit["phoneIds"] == [index]
        sound = base["phones"][index]["soundAtSpelling"]
        assert sound == choice["phoneme"] and unit["selected"] == choice["selected"]
        result = unit["afterDoubling"]
        assert isinstance(result, str)
        increment = unit["doublingIncrement"]
        assert type(increment) is int and increment in (0, 1)
        decision = choice["doubling"]
        assert type(decision["attempted"]) is bool
        attempted = decision["attempted"]
        success = "result" in decision
        if attempted:
            probability = decision["probability"]
            assert type(probability) in (int, float) and math.isfinite(probability)
            assert probability == int(probability) and 0 < probability <= 100
            counts["sampledAttempts"] += 1
        if success:
            assert attempted and isinstance(decision["result"], str)
            assert result == decision["result"] and increment == 1
            kind = "sampled-success"
            counts["sampledSuccesses"] += 1
            counts["wordsWithSampledSuccess"] = 1
        else:
            assert result == unit["selected"]
            if attempted:
                assert decision["reason"] == "roll-failed" and increment == 0
                kind = "sampled-failure"
                counts["sampledFailures"] += 1
            elif increment:
                assert decision["reason"] == "multi-char-grapheme" and len(unit["selected"]) > 1
                kind = "direct-counted"
                counts["directlyCounted"] += 1
            else:
                assert isinstance(decision["reason"], str)
                kind = "skipped"
                counts["skipped"] += 1
        relation = (sound, unit["selected"], result)
        unsupported = success and relation not in allowed
        mismatch = success and relation == ("s", "c", "ck")
        counts["unsupportedOrdinaryExpansions"] += int(unsupported)
        counts["sToCkExpansions"] += int(mismatch)
        counts["wordsWithUnsupportedOrdinaryExpansion"] |= int(unsupported)
        counts["wordsWithSToCkExpansion"] |= int(mismatch)
        counts["quotaIncrements"] += increment
        events.append((index, [*relation, kind, decision.get("reason")]))
    assert counts["sampledAttempts"] == counts["sampledSuccesses"] + counts["sampledFailures"]
    assert counts["units"] == counts["sampledAttempts"] + counts["directlyCounted"] + counts["skipped"]
    assert counts["quotaIncrements"] == counts["sampledSuccesses"] + counts["directlyCounted"]
    return counts, events

def dimensions(row):
    word = row["word"]
    assert isinstance(word["syllables"], list) and len(word["syllables"]) > 0
    trace = word["trace"]
    applied = trace["summary"]["morphologyApplied"]
    assert type(applied) is bool and applied == bool(trace.get("morphology"))
    morphology = trace.get("morphology")
    affixes = []
    for role in ("prefix", "suffix"):
        if morphology and morphology.get("template") == "bare":
            assert not any(key in morphology for key in ("prefix", "suffix", "realization"))
            affixes.append(None)
            continue
        if not morphology:
            affixes.append(None)
            continue
        assert "realization" in morphology and morphology["realization"] is not None
        realization = morphology["realization"]
        if role not in realization:
            affixes.append(None)
            continue
        affix = realization[role]
        assert isinstance(affix, dict)
        resolved = affix["resolved"]
        assert isinstance(resolved["written"], str)
        assert isinstance(resolved["phonemes"], list) and all(isinstance(p, str) for p in resolved["phonemes"])
        affixes.append([resolved["written"], resolved["phonemes"]])
    prefix, suffix = affixes
    shape = ("prefix" if prefix is not None else "none") + "/" + ("suffix" if suffix is not None else "none")
    profile, seed = row["profile"], row["seed"]
    length = len(word["syllables"])
    return [["all"], ["profile", profile], ["stream", profile, seed], ["syllables", profile, length],
            ["morphology", profile, shape], ["syllables-morphology", profile, length, shape],
            ["resolved-affixes", profile, prefix, suffix]]
