"""Make a review index from retained first witnesses, never population estimates."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).parent
raw = gzip.decompress((root / 'control-inventory-v1.json.gz').read_bytes())
report = json.loads(raw)
rows = []
for group in report['groups']:
    witness = group['firstWitness']
    base = witness['word']['trace']['baseSpelling']
    edit = next(e for e in base['edits'] if e['id'] == witness['editId'])
    if edit['rule'] != 'spellingRule:magic-e':
        continue
    unit_ids = set()
    for cell in edit['input']:
        origin = cell['origin']
        if 'unitId' in origin:
            unit_ids.add(origin['unitId'])
        else:
            unit_ids.update(origin.get('sourceUnitIds', []))
    units = [u for u in base['units'] if u['id'] in unit_ids]
    phone_ids = {p for unit in units for p in unit['phoneIds']}
    phones = [p for p in base['phones'] if p['id'] in phone_ids]
    rows.append({
        'coordinate': witness['coordinate'], 'editId': edit['id'],
        'before': edit['before'], 'after': edit['after'],
        'sourcePhones': [{'id': p['id'], 'sound': p['soundAtSpelling'],
                          'segment': p['segment'], 'syllable': p['syllableIndex']} for p in phones],
        'sourceUnits': [{k: u[k] for k in ('id', 'selected', 'afterDoubling')} for u in units],
    })
index = {
    'purpose': 'First-witness review index only; not prevalence or complete live ownership reconstruction',
    'sourceReportSha256': hashlib.sha256(raw).hexdigest(),
    'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'witnesses': rows,
}
(root / 'magic-e-witness-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
print(f'Indexed {len(rows)} first witnesses')
