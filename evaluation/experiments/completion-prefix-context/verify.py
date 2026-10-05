from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parent / "evidence"
index = json.loads((root / "index.json").read_text())
for row in index["artifacts"]:
    path = root / row["path"]
    assert path.resolve().is_relative_to(root.resolve()), row["path"]
    data = path.read_bytes()
    assert len(data) == row["bytes"], row["path"]
    assert hashlib.sha256(data).hexdigest() == row["sha256"], row["path"]
print(f"Authenticated {len(index['artifacts'])} packaged artifacts")
