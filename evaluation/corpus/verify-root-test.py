"""Reject forged root artifacts even when their enclosing digest is repaired."""
from copy import deepcopy
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("verify_root", Path(__file__).with_name("verify-root.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RootVerificationTests(unittest.TestCase):
    def test_full_pinned_reference(self):
        module.validate(envelope, expected)

    def test_rejects_semantically_forged_ledger_and_tables(self):
        def change_step(artifact):
            row = next(row for row in artifact["ledger"] if row["spelling"] == "running")
            row["steps"][0]["stem"] = "runs"

        def promote_irregular(artifact):
            row = next(row for row in artifact["ledger"] if row["spelling"] == "went")
            row.pop("lemmas")
            row.update(status="included", template="bare")

        def move_joint_count(artifact):
            by_final = artifact["tables"]["suffixByFinal"]["s"]["counts"]
            by_final["t"] -= 1
            by_final["d"] += 1

        for corrupt in (change_step, promote_irregular, move_joint_count):
            with self.subTest(corruption=corrupt.__name__):
                artifact = deepcopy(envelope["artifact"])
                corrupt(artifact)
                forged = {"artifact": artifact, "digest": module.joint.digest(artifact)}
                with self.assertRaisesRegex(ValueError, r"artifact\.(ledger|tables)"):
                    module.validate(forged, expected)

    def test_rejects_unpinned_inputs_before_reading(self):
        with tempfile.TemporaryDirectory() as directory:
            substitute = Path(directory) / "substitute"
            substitute.write_bytes(b"another source")
            for original in (module.CMU, module.SCOWL, module.WORDNET):
                with self.subTest(source=original["url"]), self.assertRaisesRegex(ValueError, "SHA-256"):
                    module.pinned(substitute, original)


if __name__ == "__main__":
    args = module.path_args().parse_args()
    expected = module.prepare(args.source, args.scowl, args.wordnet)
    envelope = module.joint.strict_json(args.artifact.read_bytes())
    unittest.main(argv=[__file__], verbosity=2)
