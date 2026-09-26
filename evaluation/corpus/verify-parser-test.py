"""Run rejection checks with explicit, local, pinned corpus/artifact inputs."""
import argparse
import importlib.util
import json
import tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("verify_parser", Path(__file__).with_name("verify-parser.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parser = argparse.ArgumentParser(description=__doc__)
for name in ["source", "audit", "reference", "scores"]:
    parser.add_argument(f"--{name}", required=True)
args = vars(parser.parse_args())
original = {key: Path(value).resolve() for key, value in args.items()}
assert module.verify(*original.values())["frozenScoreRows"] == 400

with tempfile.TemporaryDirectory(prefix="cmu-verifier-") as temporary:
    directory = Path(temporary)
    cases = [
        ("audit", lambda data: data["population"].update(entryDigest="0" * 64)),
        ("audit", lambda data: data["population"].update(units="rounded-percentage")),
        ("audit", lambda data: data["rejections"].pop()),
        ("reference", lambda data: data["model"]["corpus"].update(accepted=117486)),
        ("scores", lambda data: data["studies"][0]["rows"].reverse()),
        ("scores", lambda data: data.update(digest="0" * 64)),
    ]
    for index, (kind, change) in enumerate(cases):
        files = dict(original)
        data = module.read_json(files[kind])
        change(data)
        files[kind] = directory / f"corrupt-{index}.json"
        files[kind].write_text(json.dumps(data))
        try:
            module.verify(*files.values())
        except (AssertionError, module.subprocess.CalledProcessError):
            continue
        raise AssertionError(f"Corrupt {kind} case {index} was accepted")
    truncated = directory / "truncated.dict"
    truncated.write_bytes(original["source"].read_bytes()[:-1])
    try:
        module.verify(truncated, original["audit"], original["reference"], original["scores"])
    except AssertionError:
        pass
    else:
        raise AssertionError("Truncated source was accepted")
print("Verified valid inputs and rejected seven source/artifact corruptions.")
