import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parent/'evidence'
index=json.loads((root/'index.json').read_text())
for entry in index['artifacts']:
 data=(root/entry['file']).read_bytes()
 assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],entry['file']
print(f"Authenticated {len(index['artifacts'])} artifact files; byte integrity only")
