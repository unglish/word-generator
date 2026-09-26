"""Miniature fixtures only: no real archive verification or production imports."""
import gzip
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


HELPER = Path(__file__).with_name("q09-supplement-authority-v1.py")
SPEC = importlib.util.spec_from_file_location("supplement_authority", HELPER)
authority = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(authority)


def encode(value):
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode()


def digest(value):
    return authority.digest(authority.parse_json(encode(value), lexical_numbers=True))


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = encode(value)
    path.write_bytes(gzip.compress(data, mtime=0) if path.suffix == ".gz" else data)


def pin(path, relative=None):
    data = path.read_bytes()
    return {"path": relative or str(path), "bytes": len(data), "sha256": authority.sha(data)}


class Fixture:
    def __init__(self, root):
        self.root = root
        self.candidate = root / "candidate"
        self.original = root / "original"
        self.own = [str(HELPER), str(Path(__file__))]
        self.freeze_path = root / "freeze.json"
        self.spec_path = root / "spec.json"
        self.schedule = {"schemaVersion": 1, "id": "mini", "wordsPerReplicate": 2,
                         "reviewDrawsPerReplicate": 1,
                         "profiles": [{"id": "mini", "options": {}, "seeds": {"development": [17, 29]}}]}
        self.frozen = {"schemaVersion": "q09-configured-capture-freeze-v1", "root": str(self.candidate),
                       "original": str(self.original), "schedule": self.schedule,
                       "configs": {"control": {"numeric": 0.0000001}, "active": {"numeric": 0.0000001, "active": True}}}
        for name, directory in (("candidateSources", self.candidate), ("originalSources", self.original)):
            records = []
            for relative in ("src/index.ts", "package.json", "package-lock.json", "tsconfig.json"):
                path = directory / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("// " + name if relative.endswith(".ts") else "{}\n")
                records.append(pin(path, relative))
            self.frozen[name] = sorted(records, key=lambda record: record["path"])
        for name, relative in (("tools", authority.TOOL_DIRECTORY + "/capture.mjs"),
                               ("evaluator", "evaluation/quality/metrics.ts"),
                               ("references", "data/cmu/reference.json"),
                               ("dependencies", "evaluation/shared.ts"),
                               ("immutablePublishedFiles", "docs/published.md")):
            path = self.candidate / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// tiny " + name + "\n")
            self.frozen[name] = [pin(path, relative)]
        engine = root / "frozen-node"
        engine.write_bytes(b"not executable; pinned fixture only")
        self.frozen["engine"] = {"executable": str(engine), "sha256": authority.sha(engine.read_bytes()),
                                 "version": "mini", "platform": "fixture", "arch": "fixture"}
        save(self.freeze_path, self.frozen)
        self.spec = {"schemaVersion": authority.SCHEMA, "ownSources": [pin(Path(path)) for path in self.own],
                     "freeze": pin(self.freeze_path), "variants": {}, "evidence": [],
                     "schedule": {"wordsPerReplicate": 2, "streams": 2, "wordsPerVariant": 4}}
        self.manifests = {}
        for variant in ("control", "active"):
            self.make_archive(variant)
        self.save_spec()

    def make_archive(self, variant):
        run = self.root / (variant + "-raw")
        run.mkdir()
        records = self.frozen["originalSources" if variant == "control" else "candidateSources"]
        generator_root = self.original if variant == "control" else self.candidate
        def contents(root, records):
            return [{"path": record["path"], "content": (root / record["path"]).read_text()} for record in records]
        sources = {"generator": contents(generator_root, [r for r in records if r["path"].startswith("src/")]),
                   "evaluator": contents(self.candidate, self.frozen["tools"] + self.frozen["evaluator"] + self.frozen["dependencies"]),
                   "references": contents(self.candidate, self.frozen["references"]),
                   "packageFiles": contents(generator_root, [r for r in records if r["path"] in ("package.json", "package-lock.json")])}
        save(run / "sources.json.gz", sources)
        streams = []
        accounting = []
        for seed in (17, 29):
            draws = [{"profile": "mini", "seed": seed, "drawIndex": index,
                      "rng": {"before": 2 * index, "after": 2 * index + 2},
                      "word": {"written": "mini", "trace": {"fixture": True}}} for index in range(2)]
            path = run / f"words/mini-{seed}.jsonl.gz"
            path.parent.mkdir(exist_ok=True)
            path.write_bytes(gzip.compress(b"".join(encode(draw) for draw in draws), mtime=0))
            streams.append({"profile": "mini", "seed": seed, "words": 2})
            boundary = b"".join(encode({"drawIndex": d["drawIndex"], **d["rng"]}) for d in draws)
            accounting.append({"profile": "mini", "seed": seed, "generationRngCalls": 4,
                               "boundariesSha256": authority.sha(boundary), "rngBytesSha256": "a" * 64})
        producer = {"kind": "configured-public-api-capture-v1", "rawSummarySchema": "q09-raw-capture-v1",
                    "metricStatus": "not-evaluated", "variant": variant,
                    "sourceFreezeSha256": self.spec["freeze"]["sha256"], "engine": self.frozen["engine"],
                    "configurationDigest": digest(self.frozen["configs"][variant]),
                    "scheduleDigest": digest(self.schedule), "adapterSourceDigest": digest(self.frozen["tools"])}
        summary = {"schemaVersion": "q09-raw-capture-v1", "id": variant + "-mini", "cohort": "development",
                   "protocolDigest": digest(self.schedule), "evaluatorDigest": digest({"files": sources["evaluator"], "definitions": []}),
                   "referenceDigest": digest(sources["references"]), "definitions": [], "profiles": [],
                   "captureOnly": {"metricStatus": "not-evaluated", "words": 4, "streams": streams}}
        save(run / "summary.json", summary)
        save(run / "generation-accounting.json", {"schemaVersion": "q09-generation-accounting-v1",
                                                  "attemptedGenerationCalls": 4, "completedGenerationCalls": 4, "streams": accounting})
        self.manifests[variant] = {"schemaVersion": 1, "id": variant + "-mini", "cohort": "development", "protocol": self.schedule,
                                   "protocolDigest": summary["protocolDigest"], "evaluatorDigest": summary["evaluatorDigest"],
                                   "referenceDigest": summary["referenceDigest"], "producer": producer,
                                   "generator": {"sourceDigest": digest(sources["generator"]), "effectiveConfig": self.frozen["configs"][variant]},
                                   "environment": {"node": "mini", "platform": "fixture", "arch": "fixture", "packageLockDigest": digest("{}\n")}}
        self.spec["variants"][variant] = {"run": str(run), "manifest": {}, "report": {}}
        self.repin_archive(variant)

    def repin_archive(self, variant):
        binding = self.spec["variants"][variant]
        run = Path(binding["run"])
        manifest = self.manifests[variant]
        artifacts = []
        for path in sorted(run.rglob("*")):
            if path.is_file() and path.name != "manifest.json":
                record = pin(path)
                artifacts.append({"file": path.relative_to(run).as_posix(), "bytes": record["bytes"], "sha256": record["sha256"]})
        manifest["artifacts"] = artifacts
        self.repin_metadata(variant)

    def repin_metadata(self, variant):
        binding = self.spec["variants"][variant]
        run = Path(binding["run"])
        manifest = self.manifests[variant]
        save(run / "manifest.json", {"manifest": manifest, "digest": digest(manifest)})
        binding["manifest"] = {key: value for key, value in pin(run / "manifest.json").items() if key != "path"}
        report_path = self.root / (variant + "-report.json")
        report = {"schemaVersion": "q09-runtime-observation-v1", "passed": True, "variant": variant,
                  "sourceFreezeSha256": self.spec["freeze"]["sha256"], "archiveManifestSha256": binding["manifest"]["sha256"],
                  "generatorSourceDigest": manifest["generator"]["sourceDigest"], "completedWords": 4, "contexts": []}
        save(report_path, report)
        binding["report"] = pin(report_path)
        self.save_spec()

    def save_spec(self):
        save(self.spec_path, self.spec)

    def authority(self):
        return authority.Authority(str(self.spec_path), authority.sha(self.spec_path.read_bytes()), self.own)

    def mutate_draws(self, mutation):
        run = Path(self.spec["variants"]["active"]["run"])
        path = run / "words/mini-17.jsonl.gz"
        draws = [json.loads(line) for line in gzip.decompress(path.read_bytes()).splitlines()]
        mutation(draws)
        path.write_bytes(gzip.compress(b"".join(encode(draw) for draw in draws), mtime=0))
        self.repin_archive("active")


class AuthorityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="q09-authority-fixture-", dir="/private/tmp")
        self.fixture = Fixture(Path(self.temporary.name))
        self.addCleanup(self.temporary.cleanup)

    def consume(self, checked):
        for variant in ("control", "active"):
            self.assertEqual(len(list(checked.iter_draws(variant))), 4)

    def test_valid_authority_and_exclusive_success(self):
        checked = self.fixture.authority()
        result = authority.execute_report(checked, str(self.fixture.root / "result.json"),
                                          lambda current: {"counts": {variant: len(list(current.iter_draws(variant)))
                                                                     for variant in ("control", "active")}})
        self.assertTrue(result["passed"])
        self.assertEqual(result["counts"], {"control": 4, "active": 4})
        with self.assertRaisesRegex(authority.AuthorityError, "already exists"):
            authority.execute_report(checked, str(self.fixture.root / "result.json"), lambda current: {})

    def test_external_spec_pin_and_complete_own_allowlist(self):
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            authority.Authority(str(self.fixture.spec_path), "0" * 64, self.fixture.own)
        self.fixture.spec["ownSources"].pop()
        self.fixture.save_spec()
        with self.assertRaisesRegex(authority.AuthorityError, "allowlist differs"):
            self.fixture.authority()

    def test_own_source_wrong_hash_is_not_omitted(self):
        self.fixture.spec["ownSources"][0]["sha256"] = "0" * 64
        self.fixture.save_spec()
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            self.fixture.authority().validate_before()

    def test_duplicate_json_and_nonfinite_rejected(self):
        for data in ('{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}'):
            with self.subTest(data=data), self.assertRaises(authority.AuthorityError):
                authority.parse_json(data)

    def test_canonical_lexemes_and_utf16_order(self):
        value = authority.parse_json('{"z":1e-7,"a":1e+21,"b":0.000001,"x":"é","😀":1,"\ue000":2}', True)
        self.assertEqual(authority.canonical(value), '{"a":1e+21,"b":0.000001,"x":"é","z":1e-7,"😀":1,"\ue000":2}')
        with self.assertRaises(authority.AuthorityError):
            authority.canonical({"number": 1.2})

    def test_wrong_frozen_config_or_report_binding(self):
        self.fixture.manifests["active"]["generator"]["effectiveConfig"] = {"different": True}
        self.fixture.repin_archive("active")
        with self.assertRaisesRegex(authority.AuthorityError, "config differs"):
            self.fixture.authority()

    def test_report_variant_binding(self):
        binding = self.fixture.spec["variants"]["control"]
        path = Path(binding["report"]["path"])
        report = json.loads(path.read_bytes())
        report["variant"] = "active"
        save(path, report)
        binding["report"] = pin(path)
        self.fixture.save_spec()
        with self.assertRaisesRegex(authority.AuthorityError, "variant differs"):
            self.fixture.authority()

    def test_archive_unmanifested_extra_shard(self):
        checked = self.fixture.authority()
        run = Path(self.fixture.spec["variants"]["active"]["run"])
        (run / "words/extra.jsonl.gz").write_bytes(b"extra")
        with self.assertRaisesRegex(authority.AuthorityError, "filesystem set differs"):
            checked.validate_before()

    def test_archive_compressed_size_and_hash(self):
        checked = self.fixture.authority()
        run = Path(self.fixture.spec["variants"]["active"]["run"])
        (run / "words/mini-17.jsonl.gz").write_bytes(b"invalid compressed bytes")
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            checked.validate_before()

    def test_archive_artifact_size_and_duplicate_pin(self):
        artifact = self.fixture.manifests["active"]["artifacts"][0]
        artifact["bytes"] += 1
        self.fixture.repin_metadata("active")
        with self.assertRaisesRegex(authority.AuthorityError, "size differs"):
            self.fixture.authority().validate_before()
        artifact["bytes"] -= 1
        self.fixture.manifests["active"]["artifacts"].append(dict(artifact))
        self.fixture.repin_metadata("active")
        with self.assertRaisesRegex(authority.AuthorityError, "artifact set differs"):
            self.fixture.authority().validate_before()

    def test_embedded_source_bytes(self):
        run = Path(self.fixture.spec["variants"]["active"]["run"])
        sources = json.loads(gzip.decompress((run / "sources.json.gz").read_bytes()))
        sources["generator"][0]["content"] = "corrupted"
        save(run / "sources.json.gz", sources)
        self.fixture.repin_archive("active")
        with self.assertRaisesRegex(authority.AuthorityError, "Embedded source hash differs"):
            self.fixture.authority().validate_before()

    def test_changed_source_and_extra_source_closure(self):
        checked = self.fixture.authority()
        source = self.fixture.candidate / "src/extra.ts"
        source.write_text("new source")
        with self.assertRaisesRegex(authority.AuthorityError, "source closure differs"):
            checked.validate_before()
        source.unlink()
        (self.fixture.candidate / "src/index.ts").write_text("changed")
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            checked.validate_before()

    def test_input_and_ancestor_aliases(self):
        root = self.fixture.root
        (root / "alias").symlink_to(self.fixture.candidate, target_is_directory=True)
        with self.assertRaises(authority.AuthorityError):
            authority.regular(root / "alias/src/index.ts")
        source = self.fixture.candidate / "src/index.ts"
        target = root / "real-source.ts"
        source.rename(target)
        source.symlink_to(target)
        with self.assertRaises(authority.AuthorityError):
            self.fixture.authority().validate_before()

    def test_exact_draw_coordinates_and_rng_accounting(self):
        self.fixture.mutate_draws(lambda draws: draws[1].update(drawIndex=0))
        checked = self.fixture.authority().validate_before()
        with self.assertRaisesRegex(authority.AuthorityError, "coordinate differs"):
            list(checked.iter_draws("active"))

    def test_short_or_extra_draw_stream(self):
        self.fixture.mutate_draws(lambda draws: draws.pop())
        checked = self.fixture.authority().validate_before()
        with self.assertRaisesRegex(authority.AuthorityError, "Incomplete archive stream"):
            list(checked.iter_draws("active"))

    def test_extra_draw_stream(self):
        self.fixture.mutate_draws(lambda draws: draws.append(draws[-1]))
        checked = self.fixture.authority().validate_before()
        with self.assertRaisesRegex(authority.AuthorityError, "Extra archive draw"):
            list(checked.iter_draws("active"))

    def test_final_newline_required(self):
        path = Path(self.fixture.spec["variants"]["active"]["run"]) / "words/mini-17.jsonl.gz"
        path.write_bytes(gzip.compress(gzip.decompress(path.read_bytes()).rstrip(b"\n"), mtime=0))
        self.fixture.repin_archive("active")
        checked = self.fixture.authority().validate_before()
        with self.assertRaisesRegex(authority.AuthorityError, "Incomplete or empty JSONL"):
            list(checked.iter_draws("active"))

    def test_noncontiguous_rng_boundary(self):
        self.fixture.mutate_draws(lambda draws: draws[1]["rng"].update(before=3))
        checked = self.fixture.authority().validate_before()
        with self.assertRaisesRegex(authority.AuthorityError, "RNG boundary differs"):
            list(checked.iter_draws("active"))

    def test_summary_and_accounting_reconciled_after_iteration(self):
        run = Path(self.fixture.spec["variants"]["active"]["run"])
        path = run / "generation-accounting.json"
        accounting = json.loads(path.read_bytes())
        accounting["streams"][0]["boundariesSha256"] = "0" * 64
        save(path, accounting)
        self.fixture.repin_archive("active")
        checked = self.fixture.authority().validate_before()
        with self.assertRaisesRegex(authority.AuthorityError, "accounting boundaries differ"):
            list(checked.iter_draws("active"))

    def test_partial_consumption_and_repeated_iterator_rejected(self):
        checked = self.fixture.authority().validate_before()
        iterator = checked.iter_draws("active")
        next(iterator)
        iterator.close()
        with self.assertRaisesRegex(authority.AuthorityError, "fully consumed"):
            checked.validate_after()
        with self.assertRaisesRegex(authority.AuthorityError, "partially consumed"):
            list(checked.iter_draws("active"))

    def test_after_checks_archive_and_source_mutations(self):
        checked = self.fixture.authority().validate_before()
        self.consume(checked)
        (self.fixture.original / "src/index.ts").write_text("changed after reading")
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            checked.validate_after()

    def test_after_checks_archive_and_external_input_mutations(self):
        checked = self.fixture.authority().validate_before()
        self.consume(checked)
        path = Path(self.fixture.spec["variants"]["active"]["run"]) / "words/mini-17.jsonl.gz"
        original = path.read_bytes()
        path.write_bytes(original + b"changed after reading")
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            checked.validate_after()
        path.write_bytes(original)
        self.fixture.freeze_path.write_bytes(self.fixture.freeze_path.read_bytes() + b"\n")
        with self.assertRaisesRegex(authority.AuthorityError, "Pinned input changed"):
            checked.validate_after()

    def test_in_memory_authority_objects_cannot_be_modified(self):
        checked = self.fixture.authority().validate_before()
        self.consume(checked)
        checked.frozen["candidateSources"] = []
        with self.assertRaisesRegex(authority.AuthorityError, "Loaded freeze was modified"):
            checked.validate_after()

    def test_failure_report_after_partial_analysis(self):
        checked = self.fixture.authority()
        out = self.fixture.root / "partial.json"
        def partial(current):
            list(current.iter_draws("control"))
            return {"counts": 4}
        with self.assertRaisesRegex(authority.AuthorityError, "fully consumed"):
            authority.execute_report(checked, str(out), partial)
        self.assertIs(json.loads(out.read_bytes())["passed"], False)

    def test_failure_is_retained_exclusively(self):
        checked = self.fixture.authority()
        (self.fixture.candidate / "src/index.ts").write_text("changed before validation")
        out = self.fixture.root / "failed.json"
        with self.assertRaisesRegex(authority.AuthorityError, "SHA256 differs"):
            authority.execute_report(checked, str(out), lambda current: {})
        self.assertIs(json.loads(out.read_bytes())["passed"], False)
        initial = out.read_bytes()
        with self.assertRaisesRegex(authority.AuthorityError, "already exists"):
            authority.execute_report(checked, str(out), lambda current: {})
        self.assertEqual(out.read_bytes(), initial)

    def test_output_is_forbidden_inside_inputs_or_through_alias(self):
        checked = self.fixture.authority()
        targets = [self.fixture.candidate / "fresh.json", self.fixture.original / "fresh.json", self.fixture.spec_path,
                   Path(self.fixture.spec["variants"]["active"]["run"]) / "fresh.json"]
        alias = self.fixture.root / "alias"
        alias.symlink_to(self.fixture.candidate, target_is_directory=True)
        targets.append(alias / "fresh.json")
        for target in targets:
            with self.subTest(target=target), self.assertRaises(authority.AuthorityError):
                checked.protect_output(str(target))


if __name__ == "__main__":
    unittest.main()
