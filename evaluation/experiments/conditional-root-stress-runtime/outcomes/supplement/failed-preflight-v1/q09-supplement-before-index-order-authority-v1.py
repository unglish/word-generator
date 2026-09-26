"""Read-only authority boundary for the Q09 archived-word supplement.

Only the Python standard library is imported. This module does not load generator
or production observer code. Callers supply a reviewed external spec hash and the
complete, literal source allowlist; a successful report requires both variants to
be exhausted and all inputs to pass the same checks again after observation.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys


SCHEMA = "q09-supplement-authority-v1"
TOOL_DIRECTORY = "evaluation/experiments/conditional-root-stress-runtime"
SOURCE_GROUPS = ("candidateSources", "originalSources", "tools", "evaluator",
                 "references", "dependencies", "immutablePublishedFiles")
MAX_INTEGER = 2 ** 53 - 1


class AuthorityError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise AuthorityError(message)


def integer(value, minimum=0, maximum=MAX_INTEGER):
    require(type(value) is int and minimum <= value <= maximum, "Invalid integer")
    return value


def sha(data):
    return hashlib.sha256(data).hexdigest()


def equal(actual, expected, message):
    require(json.dumps(actual, sort_keys=True, ensure_ascii=False, allow_nan=False)
            == json.dumps(expected, sort_keys=True, ensure_ascii=False, allow_nan=False), message)


class NumberToken(str):
    """Retain the trusted producer's JSON number spelling for canonical hashes."""


def parse_json(data, lexical_numbers=False):
    def pairs(entries):
        result = {}
        for key, value in entries:
            require(key not in result, "Duplicate JSON key: " + key)
            result[key] = value
        return result

    def invalid(value):
        raise AuthorityError("Non-JSON numeric constant: " + value)

    options = {"object_pairs_hook": pairs, "parse_constant": invalid}
    if lexical_numbers:
        options.update(parse_int=NumberToken, parse_float=NumberToken)
    return json.loads(data, **options)


def canonical(value):
    """Canonical JSON; float inputs must retain their original JSON lexemes.

    Frozen Node output supplies its own finite number spelling, avoiding a Python
    float-to-string algorithm accidentally substituting for JSON.stringify.
    """
    if isinstance(value, NumberToken):
        return str(value)
    if value is None or type(value) in (str, bool, int):
        return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if type(value) is list:
        return "[" + ",".join(canonical(item) for item in value) + "]"
    require(type(value) is dict, "Canonical digest requires JSON with lexical numbers")
    keys = sorted(value, key=lambda key: key.encode("utf-16-be"))
    return "{" + ",".join(canonical(key) + ":" + canonical(value[key]) for key in keys) + "}"


def digest(value):
    return sha(canonical(value).encode("utf8"))


def absolute(path):
    value = os.fspath(path)
    result = Path(value)
    require(result.is_absolute() and str(result) == value, "Expected a normalized absolute path")
    require(".." not in result.parts, "Path traversal is forbidden")
    return result


def regular(path, directory=False):
    path = absolute(path)
    current = Path(path.anchor)
    for index, part in enumerate(path.parts[1:]):
        current /= part
        mode = current.lstat().st_mode
        is_directory = directory or index < len(path.parts) - 2
        require(stat.S_ISDIR(mode) if is_directory else stat.S_ISREG(mode),
                "Input is not a regular " + ("directory: " if is_directory else "file: ") + str(current))
    return path


def relative_file(root, relative):
    require(type(relative) is str and all(part not in ("", ".", "..") for part in relative.split("/")),
            "Invalid relative source path")
    require(not Path(relative).is_absolute(), "Absolute source member is forbidden")
    return regular(absolute(root) / relative)


def pin_file(record, root=None):
    require(type(record) is dict, "Invalid pin record")
    path = relative_file(root, record["path"]) if root is not None else regular(record["path"])
    require(type(record["sha256"]) is str and re.fullmatch("[a-f0-9]{64}", record["sha256"]), "Invalid SHA256 pin")
    data = path.read_bytes()
    require(sha(data) == record["sha256"], "Input SHA256 differs: " + str(path))
    if "bytes" in record:
        require(len(data) == integer(record["bytes"]), "Input size differs: " + str(path))
    return data


def verify_artifact(run, pin):
    path = relative_file(run, pin["file"])
    expected_size = integer(pin["bytes"])
    require(type(pin["sha256"]) is str and re.fullmatch("[a-f0-9]{64}", pin["sha256"]), "Invalid artifact SHA256")
    checksum = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(chunk)
            size += len(chunk)
    require(checksum.hexdigest() == pin["sha256"], "Input SHA256 differs: " + str(path))
    require(size == expected_size, "Input size differs: " + str(path))


def exact_records(records, label):
    require(type(records) is list, label + " is not a list")
    paths = [record["path"] for record in records]
    require(len(set(paths)) == len(paths), "Duplicate " + label + " record")
    return set(paths)


def listed_files(root, relative, source_only=False, exclusions=()):
    root = absolute(root)
    directory = regular(root / relative, directory=True)
    found = []
    for item in sorted(directory.iterdir()):
        member = item.relative_to(root).as_posix()
        if member in exclusions:
            continue
        mode = item.lstat().st_mode
        if stat.S_ISDIR(mode):
            found.extend(listed_files(root, member, source_only, exclusions))
        else:
            require(stat.S_ISREG(mode), "Unexpected source alias or special file: " + str(item))
            if not source_only or (re.search(r"\.(ts|js|mjs|json)$", member)
                                   and not re.search(r"\.(test|bench)\.", member)):
                found.append(member)
    return found


def protect_output(out, roots=(), files=()):
    out = absolute(out)
    regular(out.parent, directory=True)
    require(not os.path.lexists(out), "Output already exists: " + str(out))
    for root in roots:
        require(not out.is_relative_to(regular(root, directory=True)), "Output overlaps input tree")
    require(out not in {absolute(path) for path in files}, "Output overlaps input file")
    return out


class Authority:
    def __init__(self, spec_path, spec_sha, own_source_paths):
        self.spec_path = absolute(spec_path)
        self.spec_sha = spec_sha
        self.spec_bytes = pin_file({"path": str(self.spec_path), "sha256": spec_sha})
        self.spec = parse_json(self.spec_bytes)
        require(self.spec["schemaVersion"] == SCHEMA, "Wrong authority spec schema")
        require(set(self.spec) == {"schemaVersion", "ownSources", "freeze", "variants", "schedule", "evidence"},
                "Unexpected authority spec fields")
        supplied = [str(absolute(path)) for path in own_source_paths]
        require(len(set(supplied)) == len(supplied), "Duplicate supplied own source path")
        require(str(absolute(__file__)) in supplied, "Authority helper omitted from source allowlist")
        require(exact_records(self.spec["ownSources"], "own source") == set(supplied), "Own source allowlist differs")
        for record in self.spec["ownSources"]:
            require(set(record) == {"path", "bytes", "sha256"}, "Incomplete own source pin")
        self._input_bytes = {}
        self.frozen = self._read_input(self.spec["freeze"])
        self._lex_frozen = parse_json(self._input_bytes[self.spec["freeze"]["path"]], True)
        require(self.frozen["schemaVersion"] == "q09-configured-capture-freeze-v1", "Wrong freeze schema")
        require(set(self.spec["variants"]) == {"control", "active"}, "Both variants are required")
        self.reports = {}
        self.manifests = {}
        self._lex_manifests = {}
        self._before = False
        self._consumed = set()
        self._started = set()
        for variant, binding in self.spec["variants"].items():
            require(set(binding) == {"run", "manifest", "report"}, "Unexpected variant binding fields")
            require(set(binding["manifest"]) == {"bytes", "sha256"}, "Incomplete manifest pin")
            manifest_pin = {"path": str(absolute(binding["run"]) / "manifest.json"), **binding["manifest"]}
            envelope = self._read_input(manifest_pin)
            require(set(envelope) == {"manifest", "digest"}, "Unexpected manifest envelope fields")
            lexical = parse_json(self._input_bytes[manifest_pin["path"]], True)
            require(digest(lexical["manifest"]) == envelope["digest"], "Manifest internal digest differs")
            self.manifests[variant] = envelope["manifest"]
            self._lex_manifests[variant] = lexical["manifest"]
            self.reports[variant] = self._read_input(binding["report"])
        exact_records(self.spec["evidence"], "evidence")
        for record in self.spec["evidence"]:
            self._read_input(record)
        self._schedule = self._validate_schedule()
        self._bind_inputs()

    def _read_input(self, record):
        require(set(record) == {"path", "bytes", "sha256"}, "Incomplete external input pin")
        data = pin_file(record)
        require(record["path"] not in self._input_bytes, "Duplicate external input pin")
        self._input_bytes[record["path"]] = data
        return parse_json(data)

    def _validate_schedule(self):
        schedule = self.frozen["schedule"]
        expected = self.spec["schedule"]
        require(set(expected) == {"wordsPerReplicate", "streams", "wordsPerVariant"}, "Unexpected schedule expectation")
        size = integer(schedule["wordsPerReplicate"], 1)
        require(size == integer(expected["wordsPerReplicate"], 1), "Unexpected replicate size")
        streams = []
        profile_ids = set()
        for profile in schedule["profiles"]:
            require(type(profile["id"]) is str and re.fullmatch("[a-z0-9][a-z0-9-]*", profile["id"]), "Invalid profile ID")
            require(profile["id"] not in profile_ids, "Duplicate schedule profile")
            profile_ids.add(profile["id"])
            for seed in profile["seeds"]["development"]:
                streams.append((profile["id"], integer(seed, 0, 2 ** 32 - 1)))
        require(len(streams) == integer(expected["streams"], 1), "Unexpected stream count")
        require(len({seed for _, seed in streams}) == len(streams), "Duplicate development seed")
        require(len(streams) * size == integer(expected["wordsPerVariant"], 1), "Unexpected word count")
        return streams

    def _bind_inputs(self):
        frozen = self.frozen
        freeze_sha = self.spec["freeze"]["sha256"]
        for variant, manifest in self.manifests.items():
            report = self.reports[variant]
            require(type(manifest["schemaVersion"]) is int and manifest["schemaVersion"] == 1, "Wrong archive schema")
            require(manifest["cohort"] == "development", "Wrong archive cohort")
            equal(manifest["protocol"], frozen["schedule"], "Archive schedule differs from freeze")
            equal(manifest["generator"]["effectiveConfig"], frozen["configs"][variant], "Archive config differs from freeze")
            producer = {"kind": "configured-public-api-capture-v1", "rawSummarySchema": "q09-raw-capture-v1",
                        "metricStatus": "not-evaluated", "variant": variant, "sourceFreezeSha256": freeze_sha,
                        "engine": frozen["engine"], "configurationDigest": digest(self._lex_frozen["configs"][variant]),
                        "scheduleDigest": digest(self._lex_frozen["schedule"]), "adapterSourceDigest": digest(self._lex_frozen["tools"])}
            equal(manifest["producer"], producer, "Archive producer differs from freeze")
            require(manifest["protocolDigest"] == producer["scheduleDigest"], "Protocol digest differs")
            require(report["schemaVersion"] == "q09-runtime-observation-v1" and report["passed"] is True,
                    "Runtime report did not pass")
            require(report["variant"] == variant, "Runtime report variant differs")
            require(report["sourceFreezeSha256"] == freeze_sha, "Runtime report freeze differs")
            require(report["archiveManifestSha256"] == self.spec["variants"][variant]["manifest"]["sha256"],
                    "Runtime report archive differs")
            require(report["generatorSourceDigest"] == manifest["generator"]["sourceDigest"], "Runtime report source differs")
            require(integer(report["completedWords"]) == self.spec["schedule"]["wordsPerVariant"], "Runtime report word count differs")

    def _verify_sources(self):
        for record in self.spec["ownSources"]:
            pin_file(record)
        for field in SOURCE_GROUPS:
            root = self.frozen["original"] if field == "originalSources" else self.frozen["root"]
            exact_records(self.frozen[field], field)
            for record in self.frozen[field]:
                pin_file(record, root)
        for field, root in (("candidateSources", self.frozen["root"]), ("originalSources", self.frozen["original"])):
            actual = set(listed_files(root, "src", source_only=True)) | {"package.json", "package-lock.json", "tsconfig.json"}
            require(actual == {record["path"] for record in self.frozen[field]}, "Frozen source closure differs")
        excluded = tuple(TOOL_DIRECTORY + "/" + name for name in ("outcomes", "evidence"))
        require(set(listed_files(self.frozen["root"], TOOL_DIRECTORY, exclusions=excluded))
                == {record["path"] for record in self.frozen["tools"]}, "Frozen tool closure differs")
        quality = Path(self.frozen["root"]) / "evaluation/quality"
        actual_evaluator = {"evaluation/quality/" + item.name for item in quality.iterdir()
                            if re.search(r"\.(ts|js|mjs|json)$", item.name) and not re.search(r"\.(test|bench)\.", item.name)}
        require(actual_evaluator == {record["path"] for record in self.frozen["evaluator"]}, "Frozen evaluator closure differs")
        require(set(listed_files(self.frozen["root"], "data/cmu", source_only=True))
                == {record["path"] for record in self.frozen["references"]}, "Frozen reference closure differs")
        pin_file({"path": self.frozen["engine"]["executable"], "sha256": self.frozen["engine"]["sha256"]})

    def _verify_embedded(self, variant, sources):
        frozen = self.frozen
        records = frozen["originalSources" if variant == "control" else "candidateSources"]
        groups = {"generator": [r for r in records if r["path"].startswith("src/")],
                  "evaluator": frozen["tools"] + frozen["evaluator"] + frozen["dependencies"],
                  "references": frozen["references"],
                  "packageFiles": [r for r in records if r["path"] in ("package.json", "package-lock.json")]}
        require(set(sources) == set(groups), "Embedded source groups differ")
        for name, expected in groups.items():
            actual = sources[name]
            require([r["path"] for r in actual] == [r["path"] for r in expected], "Embedded source path/order differs")
            exact_records(actual, "embedded " + name)
            for content, pin in zip(actual, expected):
                require(set(content) == {"path", "content"} and type(content["content"]) is str, "Invalid embedded source record")
                data = content["content"].encode("utf8")
                require(sha(data) == pin["sha256"], "Embedded source hash differs: " + pin["path"])
                if "bytes" in pin:
                    require(len(data) == pin["bytes"], "Embedded source size differs")
        manifest = self.manifests[variant]
        require(digest(sources["generator"]) == manifest["generator"]["sourceDigest"], "Generator source digest differs")
        require(digest(sources["references"]) == manifest["referenceDigest"], "Reference digest differs")
        require(digest({"files": sources["evaluator"], "definitions": []}) == manifest["evaluatorDigest"], "Evaluator digest differs")
        lock = next(record["content"] for record in sources["packageFiles"] if record["path"] == "package-lock.json")
        equal(manifest["environment"], {"node": frozen["engine"]["version"], "platform": frozen["engine"]["platform"],
                                      "arch": frozen["engine"]["arch"], "packageLockDigest": digest(lock)}, "Archive environment differs")

    def _verify_archive(self, variant):
        run = regular(self.spec["variants"][variant]["run"], directory=True)
        regular(run / "words", directory=True)
        expected = {"sources.json.gz", "summary.json", "generation-accounting.json"}
        expected.update(f"words/{profile}-{seed}.jsonl.gz" for profile, seed in self._schedule)
        pins = self.manifests[variant]["artifacts"]
        require(all(set(pin) == {"file", "bytes", "sha256"} for pin in pins), "Invalid archive artifact pin")
        require(len(pins) == len(expected) and {pin["file"] for pin in pins} == expected, "Archive artifact set differs")
        actual = {entry.name for entry in run.iterdir() if entry.name != "words"}
        actual.update("words/" + entry.name for entry in (run / "words").iterdir())
        require(actual == expected | {"manifest.json"}, "Archive filesystem set differs")
        for pin in pins:
            verify_artifact(run, pin)
        self._verify_embedded(variant, parse_json(gzip.decompress(relative_file(run, "sources.json.gz").read_bytes())))

    def _verify_inputs(self):
        require(pin_file({"path": str(self.spec_path), "sha256": self.spec_sha}) == self.spec_bytes, "Authority spec changed")
        equal(self.spec, parse_json(self.spec_bytes), "Loaded authority spec was modified")
        for path, initial in self._input_bytes.items():
            require(regular(path).read_bytes() == initial, "Pinned input changed: " + path)
        equal(self.frozen, parse_json(self._input_bytes[self.spec["freeze"]["path"]]), "Loaded freeze was modified")
        for variant, binding in self.spec["variants"].items():
            equal(self.reports[variant], parse_json(self._input_bytes[binding["report"]["path"]]), "Loaded runtime report was modified")
            manifest_path = str(Path(binding["run"]) / "manifest.json")
            equal(self.manifests[variant], parse_json(self._input_bytes[manifest_path])["manifest"], "Loaded archive manifest was modified")
        self._verify_sources()
        for variant in self.spec["variants"]:
            self._verify_archive(variant)

    def validate_before(self):
        require(not self._before, "Authority validation already started")
        self._verify_inputs()
        self._before = True
        return self

    def iter_draws(self, variant):
        require(self._before and variant in self.manifests, "Validate authority before reading a known variant")
        require(variant not in self._started, "Variant already read or partially consumed")
        self._started.add(variant)
        run = Path(self.spec["variants"][variant]["run"])
        size = self.spec["schedule"]["wordsPerReplicate"]
        streams = []
        observed_accounting = []
        for profile, seed in self._schedule:
            count = 0
            previous = 0
            boundaries = hashlib.sha256()
            path = relative_file(run, f"words/{profile}-{seed}.jsonl.gz")
            with gzip.open(path, "rt", encoding="utf8", newline="") as stream:
                for line in stream:
                    require(line.endswith("\n") and line != "\n", "Incomplete or empty JSONL record")
                    draw = parse_json(line)
                    require(count < size, "Extra archive draw")
                    require(draw["profile"] == profile and integer(draw["seed"], 0, 2 ** 32 - 1) == seed
                            and integer(draw["drawIndex"]) == count, "Archive draw coordinate differs")
                    require(type(draw["word"]) is dict and type(draw["word"].get("trace")) is dict, "Missing traced word")
                    before, after = integer(draw["rng"]["before"]), integer(draw["rng"]["after"])
                    require(before == previous and after >= before, "RNG boundary differs")
                    boundary = {"drawIndex": count, "before": before, "after": after}
                    boundaries.update((json.dumps(boundary, separators=(",", ":")) + "\n").encode())
                    count += 1
                    previous = after
                    yield draw
            require(count == size, "Incomplete archive stream")
            streams.append({"profile": profile, "seed": seed, "words": count})
            observed_accounting.append({"profile": profile, "seed": seed, "generationRngCalls": previous,
                                        "boundariesSha256": boundaries.hexdigest()})
        self._verify_summary_accounting(variant, streams, observed_accounting)
        self._consumed.add(variant)

    def _verify_summary_accounting(self, variant, streams, observed):
        run = Path(self.spec["variants"][variant]["run"])
        words = sum(stream["words"] for stream in streams)
        manifest = self.manifests[variant]
        summary = parse_json(relative_file(run, "summary.json").read_bytes())
        expected = {"schemaVersion": "q09-raw-capture-v1", "id": manifest["id"], "cohort": "development",
                    "protocolDigest": manifest["protocolDigest"], "evaluatorDigest": manifest["evaluatorDigest"],
                    "referenceDigest": manifest["referenceDigest"], "definitions": [], "profiles": [],
                    "captureOnly": {"metricStatus": "not-evaluated", "words": words, "streams": streams}}
        equal(summary, expected, "Raw summary differs from observed streams")
        accounting = parse_json(relative_file(run, "generation-accounting.json").read_bytes())
        require(accounting["schemaVersion"] == "q09-generation-accounting-v1", "Wrong RNG accounting schema")
        require(integer(accounting["attemptedGenerationCalls"]) == words
                and integer(accounting["completedGenerationCalls"]) == words, "Generation accounting total differs")
        require(len(accounting["streams"]) == len(observed), "Generation accounting streams differ")
        for actual, expected in zip(accounting["streams"], observed):
            require(type(actual["rngBytesSha256"]) is str and re.fullmatch("[a-f0-9]{64}", actual["rngBytesSha256"]), "Invalid RNG byte digest")
            equal({key: value for key, value in actual.items() if key != "rngBytesSha256"}, expected,
                  "Generation accounting boundaries differ")

    def validate_after(self, require_consumed=True):
        require(self._before, "Pre-read authority validation is missing")
        if require_consumed:
            require(self._consumed == set(self.spec["variants"]), "Not all archive variants were fully consumed")
        self._verify_inputs()
        return self.metadata()

    def metadata(self):
        return {"specSha256": self.spec_sha, "freezeSha256": self.spec["freeze"]["sha256"],
                "ownSources": self.spec["ownSources"], "variants": self.spec["variants"],
                "schedule": self.spec["schedule"], "consumedVariants": sorted(self._consumed),
                "python": {"version": sys.version, "executable": sys.executable,
                           "executableSha256": sha(Path(sys.executable).resolve().read_bytes())}}

    def protect_output(self, out):
        roots = [self.frozen["root"], self.frozen["original"]]
        roots.extend(binding["run"] for binding in self.spec["variants"].values())
        files = [self.spec_path, *self._input_bytes, *(record["path"] for record in self.spec["ownSources"])]
        return protect_output(out, roots, files)


def execute_report(authority, out, analyze):
    """Publish success or failure exclusively; construction errors belong to the caller."""
    destination = authority.protect_output(out)
    with destination.open("x", encoding="utf8") as stream:
        try:
            authority.validate_before()
            result = analyze(authority)
            require(type(result) is dict, "Analysis must return a report object")
            metadata = authority.validate_after()
            result = {**result, "passed": True, "authority": metadata}
            data = json.dumps(result, ensure_ascii=False, allow_nan=False) + "\n"
        except Exception as error:
            failed = {"schemaVersion": SCHEMA, "passed": False, "specSha256": authority.spec_sha,
                      "error": {"type": type(error).__name__, "message": str(error)}}
            stream.write(json.dumps(failed, allow_nan=False) + "\n")
            raise
        stream.write(data)
    return result
