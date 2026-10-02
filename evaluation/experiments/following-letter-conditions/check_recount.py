"""Compare a producer-authenticated pilot export with the independent reader."""
import gzip
import hashlib
import json
import sys
from pathlib import Path
from recount_following import compare


def main():
    path = Path(sys.argv[1])
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    configurations = {}
    words = events = integers = 0
    with gzip.open(path, 'rt') as source:
        for line in source:
            row = json.loads(line)
            if row['kind'] == 'configuration':
                if row['name'] in configurations:
                    raise ValueError('duplicate configuration')
                configurations[row['name']] = row['config']
                continue
            if row['kind'] != 'observation':
                raise ValueError('unknown record')
            try:
                checked_events, checked_integers = compare(row['word'], configurations[row['name']], row['observation'])
            except Exception as error:
                raise ValueError(f"{row['name']} {row['coordinate']}: {error}") from error
            words += 1
            events += checked_events
            integers += checked_integers
    if hashlib.sha256(path.read_bytes()).hexdigest() != before:
        raise ValueError('input changed during recount')
    print(json.dumps(dict(status='passed', scope='pilot; producer authenticates semantic licenses',
                         sha256=before, words=words, events=events, integerComparisons=integers,
                         configurations=len(configurations)), indent=2))


if __name__ == '__main__':
    main()
