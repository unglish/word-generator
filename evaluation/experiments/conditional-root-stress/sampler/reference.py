"""Independent sampler checks from complete literal-history maps, without DP imports."""
from collections import defaultdict
from fractions import Fraction as F
import importlib.util
import math
from pathlib import Path

ORACLE_PATH = Path(__file__).resolve().parents[1] / "law-evidence/q09-pattern-oracle.py"
spec = importlib.util.spec_from_file_location("frozen_literal_history_oracle", ORACLE_PATH)
oracle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oracle)
assert oracle.sha(ORACLE_PATH.read_bytes()) == "20d7ff793169ef78a0f4ee27e4420f53bb19ad431dcd18e072d42f1ffa0027e9"
GRID = 1 << 32
U, P, S = oracle.U, oracle.P, oracle.S


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fields(value, names, label):
    require(isinstance(value, dict) and set(value) == set(names), label + " fields")


def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def check_log(value, expected, label):
    require(expected > 0 and finite(value), label + " finite log")
    target = oracle.rational_log(expected)
    require(abs(value - target) <= 2e-10, label + " log tolerance")
    probability, reference = math.exp(value), float(expected)
    require(abs(probability - reference) <= 1e-12, label + " absolute probability tolerance")
    if reference >= 1e-12:
        require(abs(probability - reference) / reference <= 1e-10, label + " relative probability tolerance")


def check_mass(value, expected, label):
    if expected == 0:
        require(value == {"status": "zero"}, label + " exact zero support")
    else:
        fields(value, ["status", "value"], label)
        require(value["status"] == "finite", label + " positive support")
        check_log(value["value"], expected, label)


def ceil_grid(ratio):
    require(0 <= ratio <= 1, "grid ratio")
    scaled = ratio * GRID
    return (scaled.numerator + scaled.denominator - 1) // scaled.denominator


def configured_case(protocol, case):
    values = {**protocol["defaults"], **case}
    return oracle.configuration(values["n"], values["primary"], values["window"], values["neighbors"],
        values["secondaryEnabled"], values["rhythmicEnabled"], values["secondaryPercent"],
        values["rhythmicPercent"], values["weights"], values["heavyMask"])


def drawn_steps(sample):
    return [("component", entry) for entry in sample["componentDraws"]] + [
        ("backward", entry) for entry in sample["backward"] if entry["kind"] == "drawn"]


def takes_first(kind, entry):
    return entry["takeCandidate"] if kind == "component" else not entry["previousMarked"]


class HistoryReference:
    def __init__(self, case, count, factor=F(1, 2)):
        self.case, self.count, self.factor = case, count, factor
        self.n, self.primary = case["n"], case["primaryIndex"]
        self.prior, component_maps, self.history_count = oracle.enumerate_histories(case)
        self.identities = list(component_maps)
        self.components = list(component_maps.values())
        self.component_priors = [sum(values.values(), F()) for values in self.components]
        self.tilted = [{pattern: probability * factor ** oracle.adjacency(pattern)
                        for pattern, probability in values.items() if pattern.count(S) == count}
                       for values in self.components]
        self.component_masses = [sum(values.values(), F()) for values in self.tilted]
        self.partition = sum(self.component_masses, F())
        require(self.partition > 0, "registered sampler count must have positive support")
        self.continuous = {pattern: probability * factor ** oracle.adjacency(pattern) / self.partition
                           for pattern, probability in self.prior.items() if pattern.count(S) == count}

    def prefix_candidates(self, component, index, marked, remaining):
        """Sum ALL complete histories, not only histories with the final target K."""
        prior = self.component_priors[component]
        require(prior > 0, "cannot condition a zero-prior component")
        masses = [F(), F()]
        for pattern, probability in self.components[component].items():
            prefix = pattern[:index + 1]
            if prefix.count(S) != remaining or (pattern[index] != U) != marked:
                continue
            previous = int(index > 0 and pattern[index - 1] != U)
            masses[previous] += probability / prior * self.factor ** oracle.adjacency(prefix)
        return masses

    def suffix_candidates(self, component, suffix):
        """A separate conditional check: final K and the already sampled suffix."""
        index = self.n - len(suffix)
        masses = [F(), F()]
        for pattern, probability in self.tilted[component].items():
            if pattern[index:] == tuple(suffix):
                previous = int(index > 0 and pattern[index - 1] != U)
                masses[previous] += probability
        total = sum(masses)
        require(total > 0, "sampled suffix has no compatible complete history")
        return [value / total for value in masses]

    def _work(self, value, sample=False):
        names = ["componentPasses", "positions", "statesVisited", "transitionsConsidered", "allocatedCells", "peakRetainedCells"]
        fields(value, names, "work")
        require(all(integer(value[key]) and value[key] >= 0 for key in names), "work counts")
        passes = sum(mass > 0 for mass in self.component_priors) + int(sample)
        width = 2 * (self.count + 1)
        require(value["componentPasses"] == passes and value["positions"] == passes * self.n, "DP pass dimensions")
        require(value["statesVisited"] <= passes * self.n * width, "DP state bound")
        require(value["transitionsConsidered"] == 2 * value["statesVisited"], "DP transition bound")
        require(value["allocatedCells"] == (passes - int(sample)) * 2 * width + (self.n + 1) * width * int(sample), "DP allocation dimensions")
        require(value["peakRetainedCells"] == (self.n + 1 if sample else 2) * width, "DP retained dimensions")

    def verify_sample(self, sample, row, consumed):
        fields(sample, ["marks", "count", "selectedComponentIndex", "componentTermination", "componentDraws", "backward",
                        "selectedPatternPriorLogMass", "selectedPatternConditionalLogMass", "work"], "sample")
        require(len(row) == 15 and all(integer(value) and 0 <= value < GRID for value in row), "fixed uint32 row")
        require(integer(consumed) and 0 <= consumed <= 15, "consumed count")
        count = sample["count"]
        fields(count, ["secondaryCount", "logPartition", "components", "work"], "count analysis")
        require(integer(count["secondaryCount"]) and count["secondaryCount"] == self.count, "count identity")
        check_mass(count["logPartition"], self.partition, "partition")
        require(len(count["components"]) == len(self.components), "component count")
        for index, actual in enumerate(count["components"]):
            fields(actual, ["component", "prior", "tiltedMassAtK"], "component")
            identity = {"kind": "no-explicit-mark"} if self.identities[index] is None else {"kind": "explicit-mark", "syllableIndex": self.identities[index]}
            if self.identities[index] is not None:
                require(integer(actual["component"].get("syllableIndex")), "component identity integer")
            require(actual["component"] == identity, "component identity/order")
            check_mass(actual["prior"], self.component_priors[index], "component prior")
            check_mass(actual["tiltedMassAtK"], self.component_masses[index], "component tilted")
        self._work(count["work"])
        self._work(sample["work"], sample=True)
        ordinal = 0

        def uniform(entry):
            nonlocal ordinal
            require(integer(entry["drawOrdinal"]) and entry["drawOrdinal"] == ordinal and ordinal < consumed, "draw ordinal/count")
            require(finite(entry["uniform"]) and entry["uniform"] == row[ordinal] / GRID, "draw/tape identity")
            ordinal += 1
            return entry["uniform"]

        positive = [index for index, value in enumerate(self.component_masses) if value > 0]
        selected, termination, cursor = positive[-1], "only-positive" if len(positive) == 1 else "last-positive", 0
        for position, index in enumerate(positive[:-1]):
            require(cursor < len(sample["componentDraws"]), "missing component draw")
            entry = sample["componentDraws"][cursor]
            cursor += 1
            fields(entry, ["candidateIndex", "remainingFromIndex", "logCandidateMass", "logRemainingMass", "uniform", "drawOrdinal", "takeCandidate"], "component draw")
            require(integer(entry["candidateIndex"]) and integer(entry["remainingFromIndex"]) and
                    entry["candidateIndex"] == index and entry["remainingFromIndex"] == positive[position + 1], "component/tail coordinate")
            check_log(entry["logCandidateMass"], self.component_masses[index], "candidate mass")
            check_log(entry["logRemainingMass"], sum(self.component_masses[j] for j in positive[position + 1:]), "tail mass")
            require(isinstance(entry["takeCandidate"], bool), "component decision boolean")
            uniform(entry)  # Numeric branch truth is checked in the separately pinned same-Node replay.
            if entry["takeCandidate"]:
                selected, termination = index, "accepted-candidate"
                break
        require(cursor == len(sample["componentDraws"]), "extra component draw")
        require(integer(sample["selectedComponentIndex"]) and sample["selectedComponentIndex"] == selected and
                sample["componentTermination"] == termination, "selected component/termination")
        require(len(sample["backward"]) == self.n, "backward length")
        marked = self.primary == self.n - 1 or self.identities[selected] == self.n - 1
        remaining, suffix = self.count, []
        for index, entry in zip(range(self.n - 1, -1, -1), sample["backward"]):
            current = P if index == self.primary else S if marked else U
            suffix.insert(0, current)
            candidates = self.prefix_candidates(selected, index, marked, remaining)
            total = sum(candidates)
            require(total > 0, "positive backward state")
            require([value / total for value in candidates] == self.suffix_candidates(selected, suffix), "independent prefix/suffix factorization")
            require(integer(entry["syllableIndex"]) and integer(entry["remainingSecondaryCount"]) and
                    entry["syllableIndex"] == index and entry["remainingSecondaryCount"] == remaining, "backward coordinate/count")
            require(isinstance(entry["previousMarked"], bool), "predecessor boolean")
            if 0 in candidates:
                fields(entry, ["kind", "syllableIndex", "previousMarked", "remainingSecondaryCount"], "forced step")
                require(entry["kind"] == "forced" and entry["previousMarked"] == (candidates[0] == 0), "exact forced support")
            else:
                fields(entry, ["kind", "syllableIndex", "previousMarked", "remainingSecondaryCount", "logUnmarkedMass", "logMarkedMass", "uniform", "drawOrdinal"], "drawn step")
                require(entry["kind"] == "drawn", "positive alternatives require a draw")
                check_log(entry["logUnmarkedMass"], candidates[0], "unmarked predecessor")
                check_log(entry["logMarkedMass"], candidates[1], "marked predecessor")
                uniform(entry)
            remaining -= int(marked and index != self.primary)
            marked = entry["previousMarked"]
        require(remaining == 0 and not marked, "initial state")
        require(ordinal == consumed, "extra or missing draw")
        require(sample["marks"] == suffix and tuple(suffix) in self.continuous, "complete pattern/K/primary/support")
        check_log(sample["selectedPatternPriorLogMass"], self.prior[tuple(suffix)], "summed pattern prior")
        check_log(sample["selectedPatternConditionalLogMass"], self.continuous[tuple(suffix)], "conditional pattern")
        return tuple(suffix)

    def ideal_grid(self):
        """Quantize rational binary choices; sum every component/path leaf."""
        result = defaultdict(F)
        positive = [i for i, value in enumerate(self.component_masses) if value > 0]

        def backward(component, suffix, probability):
            if len(suffix) == self.n:
                result[tuple(suffix)] += probability
                return
            probabilities = self.suffix_candidates(component, suffix)
            first = F(ceil_grid(probabilities[0]), GRID)
            index = self.n - len(suffix) - 1
            if first:
                backward(component, [U] + suffix, probability * first)
            if first < 1:
                backward(component, [P if index == self.primary else S] + suffix, probability * (1 - first))

        def component(position, probability):
            index = positive[position]
            if position == len(positive) - 1:
                first = F(1)
            else:
                first = F(ceil_grid(self.component_masses[index] / sum(self.component_masses[i] for i in positive[position:])), GRID)
            if first:
                final = P if self.primary == self.n - 1 else S if self.identities[index] == self.n - 1 else U
                backward(index, [final], probability * first)
            if first < 1:
                component(position + 1, probability * (1 - first))
        component(0, F(1))
        require(sum(result.values()) == 1, "ideal grid normalization")
        return dict(result)


def verify_numeric_tree(reference, tree):
    fields(tree, ["root", "nodes", "apiCalls"], "numeric tree")
    nodes, visited, output = tree["nodes"], set(), defaultdict(F)
    calls = 0

    def walk(node_id, prefix, probability):
        nonlocal calls
        require(integer(node_id) and 0 <= node_id < len(nodes) and node_id not in visited, "tree node identity/cycle")
        visited.add(node_id)
        node = nodes[node_id]
        require(node["prefix"] == prefix, "tree prefix")
        require(len(prefix) <= 15, "tree depth")
        if node["kind"] == "leaf":
            fields(node, ["kind", "prefix", "sample", "consumed"], "leaf")
            row = prefix + [0] * (15 - len(prefix))
            pattern = reference.verify_sample(node["sample"], row, node["consumed"])
            require(node["consumed"] == len(prefix), "leaf consumes no unseen draw")
            output[pattern] += probability
            calls += 1
            return
        fields(node, ["kind", "prefix", "boundary", "probes", "search", "first", "second"], "branch")
        require(node["kind"] == "branch" and integer(node["boundary"]) and 0 <= node["boundary"] <= GRID, "grid boundary")
        probes = {}
        coordinate = None
        for probe in node["probes"]:
            fields(probe, ["uint32", "sample", "consumed"], "probe")
            value = probe["uint32"]
            require(integer(value) and 0 <= value < GRID and value not in probes, "unique uint32 probe")
            row = prefix + [value] + [0] * (14 - len(prefix))
            reference.verify_sample(probe["sample"], row, probe["consumed"])
            steps = drawn_steps(probe["sample"])
            require(len(steps) > len(prefix), "branch has an actual next draw")
            kind, step = steps[len(prefix)]
            current = (kind, step.get("candidateIndex"), step.get("remainingFromIndex"), step.get("syllableIndex"), step.get("remainingSecondaryCount"))
            if coordinate is None:
                coordinate = current
            require(current == coordinate, "branch coordinates stable under current draw")
            probes[value] = takes_first(kind, step)
            require(probes[value] == (value < node["boundary"]), "numeric monotonic boundary probe")
            calls += 1
        lo, hi = 0, GRID
        for midpoint in node["search"]:
            require(integer(midpoint) and lo < hi and midpoint == (lo + hi) // 2 and midpoint in probes, "binary search schedule")
            if probes[midpoint]:
                lo = midpoint + 1
            else:
                hi = midpoint
        require(lo == hi == node["boundary"], "complete boundary search")
        needed = {0, GRID - 1, GRID // 4, GRID // 2, 3 * GRID // 4}
        needed.update(value for value in [lo - 1, lo] if 0 <= value < GRID)
        require(needed <= probes.keys(), "boundary/endpoint/quartile probes")
        if lo:
            walk(node["first"], prefix + [0], probability * F(lo, GRID))
        else:
            require(node["first"] is None, "absent zero-probability first branch")
        if lo < GRID:
            walk(node["second"], prefix + [lo], probability * F(GRID - lo, GRID))
        else:
            require(node["second"] is None, "absent zero-probability second branch")
    walk(tree["root"], [], F(1))
    require(len(visited) == len(nodes) and integer(tree["apiCalls"]) and calls == tree["apiCalls"], "tree coverage/call accounting")
    require(sum(output.values()) == 1, "numeric grid normalization")
    return dict(output)
