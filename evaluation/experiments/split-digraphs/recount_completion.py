"""Independent arithmetic checks; does not authenticate producer eligibility or reading licenses."""
import math
from fractions import Fraction


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_completion_sample(sample):
    candidates = sample["candidates"]
    identities = [entry["inventoryIndex"] for entry in candidates]
    require(all(type(value) is int and 0 <= value <= 2**53 - 1 for value in identities), "invalid inventory identity")
    require(len(set(identities)) == len(identities), "duplicate inventory identity")
    retained = []
    for entry in candidates:
        weight = entry["weight"]
        require(type(weight) in (int, float) and math.isfinite(weight) and weight > 0, "invalid weight")
        if "refusal" in entry:
            require(isinstance(entry["refusal"], str) and len(entry["refusal"]) > 0, "invalid refusal")
        else:
            retained.append(entry)
        require(entry["retainedWeight"] == (0 if "refusal" in entry else weight), "wrong retained weight")
    if not retained:
        require(sample["status"] == "infeasible" and "roll" not in sample and "inventoryIndex" not in sample, "infeasible draw/selection")
        require(all(entry["probability"] == 0 for entry in candidates), "infeasible probability")
        return {"candidates": len(candidates), "draws": 0, "selected": 0, "infeasible": 1}
    total_exact = sum((Fraction(entry["weight"]) for entry in retained), Fraction())
    for entry in candidates:
        expected = 0.0 if "refusal" in entry else float(Fraction(entry["weight"]) / total_exact)
        require(math.isfinite(entry["probability"]) and math.isclose(entry["probability"], expected, rel_tol=2e-15, abs_tol=0), "wrong conditional probability")
    require(sample["status"] == "selected", "missing selection")
    if len(retained) == 1:
        require("roll" not in sample and sample["inventoryIndex"] == retained[0]["inventoryIndex"], "singleton draw/selection")
    else:
        roll = sample.get("roll")
        require(type(roll) in (int, float) and math.isfinite(roll) and 0 <= roll < 1, "invalid draw")
        # Match the registered binary64 cumulative boundary law, not an exact-real replacement law.
        total = 0.0
        for entry in retained:
            total += entry["weight"]
        scale = 1.0 if math.isfinite(total) else max(entry["weight"] for entry in retained)
        weights = [entry["weight"] / scale for entry in retained]
        require(all(weight > 0 for weight in weights), "unrepresentable ratio")
        total = 0.0
        for weight in weights:
            total += weight
        target = roll * total
        cumulative = 0.0
        selected = retained[-1]["inventoryIndex"]
        for entry, weight in zip(retained, weights):
            cumulative += weight
            if target < cumulative:
                selected = entry["inventoryIndex"]
                break
        require(sample["inventoryIndex"] == selected, "wrong selected interval")
    return {"candidates": len(candidates), "draws": int(len(retained) > 1), "selected": 1, "infeasible": 0}


def recount_completion(trace):
    """Count every recorded completion outcome; unavailable eligibility remains outside this check."""
    totals = {"attempts": 0, "evaluated": 0, "candidates": 0, "draws": 0, "selected": 0, "infeasible": 0}
    for record in trace["completion"]["attempts"]:
        attempt = record["attempt"]
        totals["attempts"] += 1
        if attempt["status"] != "evaluated":
            require(record["certificateId"] is None, "certificate on unevaluated attempt")
            continue
        totals["evaluated"] += 1
        sample = attempt["sample"]
        result = check_completion_sample(sample)
        for key, value in result.items():
            totals[key] += value
        if sample["status"] == "selected":
            identity = record["certificateId"]
            require(type(identity) is int and 0 <= identity < len(trace["completion"]["certificates"]), "missing completion certificate")
            certificate = trace["completion"]["certificates"][identity]
            require(certificate["id"] == identity and certificate["unitId"] == attempt["nucleusId"] and
                    certificate["inventoryIndex"] == sample["inventoryIndex"] and certificate["attempt"] == attempt, "completion certificate binding")
        else:
            require(record["certificateId"] is None, "certificate on infeasible attempt")
    require(totals["selected"] == len(trace["completion"]["certificates"]), "unaccounted completion certificate")
    return totals
