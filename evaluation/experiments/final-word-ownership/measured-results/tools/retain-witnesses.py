"""First archived witnesses per operation stratum, with full unmodified Word records."""
import gzip
import hashlib
import json
from pathlib import Path

archive = Path('/private/tmp/q02-final-word-provenance-v1')
manifest_raw = (archive / 'manifest.json').read_bytes()
assert hashlib.sha256(manifest_raw).hexdigest() == '8dedab2241a1fe1155c0aa2259a3b34487e0031dca2c0f2b8961bc83e4fa8028'
manifest = json.loads(manifest_raw)['manifest']
wanted = {'prefix-only', 'suffix-only', 'both-affixes', 'planned-bare', 'no-morphology-plan',
          'gap-overridden', 'final-cleanup-edited', 'final-nucleus-repaired', 'affix-phone-in-root', 'bridge'}
witnesses = {}
counts = {name: 0 for name in wanted}
total = 0
for profile in manifest['protocol']['profiles']:
    for seed in profile['seeds']['development']:
        path = archive / f"words/{profile['id']}-{seed}.jsonl.gz"
        with gzip.open(path, 'rt') as stream:
            for line in stream:
                row = json.loads(line)
                total += 1
                word = row['word']
                trace = word['trace']
                template = trace.get('morphology', {}).get('template', 'no-morphology-plan')
                labels = {'prefixed': {'prefix-only'}, 'suffixed': {'suffix-only'}, 'both': {'both-affixes'},
                          'bare': {'planned-bare'}, 'no-morphology-plan': {'no-morphology-plan'}}[template]
                final = trace['finalWord']
                if any(e['phase'] == 'gap' for e in trace['baseSpelling']['edits']):
                    labels.add('gap-overridden')
                if any(e['rule'] == 'repairConsonantLetters' for e in final['spelling']['events']):
                    labels.add('final-cleanup-edited')
                if trace.get('finalNucleus', {}).get('repairs'):
                    labels.add('final-nucleus-repaired')
                origins = {p['id']: p['source'] for p in final['phones']['initial']}
                start = word.get('lexical', {}).get('rootSyllableStart', 0)
                end = start + len(word.get('lexical', {}).get('root', []))
                if any(origins[p['id']].get('part') in ('prefix', 'suffix') and start <= p['syllable'] < end for p in final['phones']['final']):
                    labels.add('affix-phone-in-root')
                if any(s['kind'] == 'bridge' for s in origins.values()):
                    labels.add('bridge')
                for label in labels:
                    counts[label] += 1
                for label in sorted(labels - witnesses.keys()):
                    witnesses[label] = dict(archiveFile=path.relative_to(archive).as_posix(), profile=row['profile'],
                        seed=row['seed'], drawIndex=row['drawIndex'], archivedLineSha256=hashlib.sha256(line.encode()).hexdigest(), word=word)
        print(f"{profile['id']}/{seed}: scanned; {len(witnesses)} strata observed", flush=True)
assert total == 200000
assert set(witnesses) <= wanted
output = Path(__file__).with_name('witnesses.json.gz')
raw = (json.dumps(dict(manifestSha256=hashlib.sha256(manifest_raw).hexdigest(), selection='First encountered archived word in each observed operation stratum; illustrative, not a preference sample.', wordsScanned=total, stratumCounts=counts, absentStrata=sorted(wanted - witnesses.keys()), witnesses=witnesses), ensure_ascii=True, indent=2) + '\n').encode()
with output.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
print(json.dumps({label: {k: v for k, v in witness.items() if k != 'word'} for label, witness in witnesses.items()}, indent=2))
