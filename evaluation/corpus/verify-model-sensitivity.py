"""Independent fixed-table sensitivity reconstruction; no JS scoring or generator execution.

An externally reviewed freeze SHA and output report SHA anchor authority. The JS
canonical report digest is retained as a producer identifier, not recomputed with
Python's different binary64 JSON rendering. All numerical fields are reconstructed.
"""
import argparse
from collections import Counter
import copy
import gzip
import hashlib
import importlib.util
import json
import math
import re
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
BASE = 'evaluation/experiments/cmu-model-sensitivity'
PROTOCOL_SHA = '1932ff66670bc0315636c648d06240f3ad517a857943d169f30f460e01ea1411'
RAW_SHA = '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22'
MANIFEST_SHA = '1e31ad59251eb5fbe8863bae988539062845f081e2597589669343f50e5452e7'
MANIFEST_DIGEST = 'a23414ae34d3611c4367d07ad677afb99e7d89a4be7886e6ed95018c2ff3f3da'
# Literal reviewed source contract; never execute the external observer.
IDENTITY_SHA = 'f3f9077fed9237deaadf5212e908abbd5669a8675609482d51453d1bde7d372c'
IDENTITY_REPORT_SHA = '0e8367a1193d8700129e4b8f82548bbfaab270523433e344a722a653a30ec292'
ABS, REL = 1e-10, 1e-12
NEW_PATHS = [
    'evaluation/corpus/model-sensitivity.ts', 'evaluation/corpus/model-sensitivity-integrity.ts',
    'evaluation/corpus/model-sensitivity-acceptance.ts', 'evaluation/corpus/model-sensitivity-runner.ts', 'evaluation/corpus/model-sensitivity-cli.ts',
    'evaluation/corpus/verify-model-sensitivity.py', 'evaluation/corpus/verify-model-sensitivity-test.py',
    'evaluation/review/cmu-model-sensitivity.test.ts', *[f'{BASE}/{name}' for name in
    ['design.md', 'protocol.json', 'parent-files.json', 'fixtures-plan.md', 'README.md']]]
SOUNDS = ['i:', 'ɪ', 'ɛ', 'ə', 'ɜ', 'ɚ', 'æ', 'ɑ', 'ɔ', 'ʊ', 'u', 'ʌ', 'eɪ', 'aɪ', 'əʊ', 'ɔɪ', 'aʊ',
          'j', 'w', 'l', 'r', 'm', 'n', 'ŋ', 'f', 'θ', 'h', 'v', 'ð', 'z', 'ʒ', 's', 'ʃ', 'tʃ', 'dʒ', 'p', 't', 'k', 'b', 'd', 'g']
CODES = 'IY IH EH AH ER ER AE AA AO UH UW AH EY AY OW OY AW Y W L R M N NG F TH HH V DH Z ZH S SH CH JH P T K B D G'.split()
MAPPING = dict(zip(SOUNDS, CODES))
VOCABULARY = sorted(set(CODES) | {'#'})
REFERENCES = {
    'transitions': {'path': 'evaluation/experiments/cmu-transition-builder/artifact.json.gz', 'compressed': 'a1bad741aff421b5f87d014ba9bc0e39c15b696dbe9add3d97bb42ba82b29e59', 'raw': '1b5360bf7a6d378fe09892199820a607580a5d2bf980fd4088608b0eafb8dcb2', 'digest': '45da904ae1eb33db2f1bb85c8eb1721cfde6251213a6fd6487e2b6186a95d067'},
    'scores': {'path': 'evaluation/experiments/cmu-score-reference/reference.json.gz', 'compressed': '82ff2305a36d2807a2a8423a9b43842cd04a6d890aed1a190cd72db068d5be78', 'raw': 'ab9702442d1d3ca78610b3f9d90b91e431964b911f7c7e9b556e457dfc2a799f', 'digest': 'efeb3a9a94d37b477c31633281044adbd6a3074b19c147954ee119f9e4fceeb4'},
    'joint': {'path': 'evaluation/experiments/cmu-matched-reference/reference.json.gz', 'compressed': 'd7b32d1c6f49edf8211f96db14139086172288f138328d37b41ae144b685a118', 'digest': 'f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862'},
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


class NumberToken(str):
    """Original JSON number spelling, used only for producer digest checks."""


def strict_json(data, lexical_numbers=False):
    def unique(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Duplicate JSON key')
            result[key] = value
        return result
    def invalid(_):
        raise ValueError('Nonfinite JSON value')
    options = {'object_pairs_hook': unique, 'parse_constant': invalid}
    if lexical_numbers:
        options.update(parse_int=NumberToken, parse_float=NumberToken)
    return json.loads(data, **options)


def js_canonical(value):
    """Match canonical object construction followed by JSON.stringify ordering."""
    if isinstance(value, NumberToken):
        return str(value)
    if value is None or type(value) in (str, bool, int):
        return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
    if type(value) is list:
        return '[' + ','.join(js_canonical(item) for item in value) + ']'
    if type(value) is not dict:
        raise ValueError('Producer digest requires original JSON number lexemes')
    def order(key):
        index = re.fullmatch(r'0|[1-9][0-9]*', key) and int(key) < 2**32 - 1
        return (0, int(key)) if index else (1, key.encode('utf-16-be'))
    return '{' + ','.join(js_canonical(key) + ':' + js_canonical(value[key]) for key in sorted(value, key=order)) + '}'


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()


def regular(path, directory=False):
    path = Path(path).absolute()
    for index, item in enumerate([path, *path.parents]):
        if item.is_symlink() or (not item.is_dir() if index or directory else not item.is_file()):
            raise ValueError(f'Nonregular or aliased input: {item}')
    return path


def pin(path):
    path = regular(path)
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk); size += len(chunk)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def exact(actual, expected, path='value'):
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or actual.keys() != expected.keys():
            raise ValueError(f'{path}: fields differ')
        for key in expected:
            exact(actual[key], expected[key], f'{path}.{key}')
    elif isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            raise ValueError(f'{path}: length differs')
        for index, (a, b) in enumerate(zip(actual, expected)):
            exact(a, b, f'{path}[{index}]')
    elif type(actual) is not type(expected) or actual != expected:
        raise ValueError(f'{path}: exact value/type differs')


class Numeric:
    def __init__(self):
        self.comparisons = 0
        self.worst_absolute = None
        self.worst_relative = None
        self.sign_disagreements = []

    def compare(self, actual, expected, path='value'):
        if isinstance(expected, float):
            if type(actual) not in (int, float) or not math.isfinite(actual) or not math.isfinite(expected):
                raise ValueError(f'{path}: nonfinite or nonnumeric score')
            error = abs(actual - expected)
            relative = error / abs(expected) if expected else None
            event = {'path': path, 'actual': actual, 'reference': expected, 'absolute': error, 'relative': relative}
            self.comparisons += 1
            if self.worst_absolute is None or error > self.worst_absolute['absolute']:
                self.worst_absolute = event
            if relative is not None and (self.worst_relative is None or relative > self.worst_relative['relative']):
                self.worst_relative = event
            if error > ABS + REL * abs(expected):
                raise ValueError(f'{path}: numerical tolerance exceeded: {event}')
        elif isinstance(expected, dict):
            if not isinstance(actual, dict) or actual.keys() != expected.keys():
                raise ValueError(f'{path}: fields differ')
            for key in expected:
                self.compare(actual[key], expected[key], f'{path}.{key}')
        elif isinstance(expected, list):
            if not isinstance(actual, list) or len(actual) != len(expected):
                raise ValueError(f'{path}: length differs')
            for index, (a, b) in enumerate(zip(actual, expected)):
                self.compare(a, b, f'{path}[{index}]')
        else:
            exact(actual, expected, path)


DECOMPOSITION_ARITHMETIC = {
    'version': 'compensated-signed-terms-v2',
    'terms': 'binary64 occurrence*transition-delta and per-word B-A',
    'accumulation': 'TS floating expansion; independent Python math.fsum',
    'residual': 'compensated sum(weighted terms, negated row terms); not subtraction of rounded totals',
}


def decomposition(weighted_terms, row_terms):
    if any(not math.isfinite(value) for terms in (weighted_terms, row_terms) for value in terms):
        raise ValueError('Nonfinite decomposition term')
    def signed_terms():
        yield from weighted_terms
        for value in row_terms:
            yield -value
    return {'arithmetic': DECOMPOSITION_ARITHMETIC['version'],
            'weightedDelta': math.fsum(weighted_terms), 'rowDelta': math.fsum(row_terms),
            'residual': math.fsum(signed_terms())}


def sequential(values):
    total = 0.0
    for value in values:
        total += value
    return total


def stats(values):
    if not values:
        return None
    ordered = sorted(values)
    return {'mean': sequential(ordered) / len(ordered), 'median': ordered[len(ordered) // 2], 'min': ordered[0], 'max': ordered[-1]}


def signs(values):
    return {'negative': sum(x < 0 for x in values), 'zero': sum(x == 0 for x in values),
            'positive': sum(x > 0 for x in values), 'nearZero': sum(abs(x) <= ABS for x in values)}


def log(table, first, second):
    return math.log2((table['counts'][first].get(second, 0) + 1) / (table['rowTotals'][first] + 40))


def score(tokens, table):
    if not tokens or any(t == '#' or t not in VOCABULARY for t in tokens):
        raise ValueError('Incomplete vector cannot be scored')
    sequence = ['#', *tokens, '#']
    total = sequential(log(table, a, b) for a, b in zip(sequence, sequence[1:]))
    return {'total': total, 'perTransition': total / (len(tokens) + 1)}


def paired(tokens, A, B):
    a, b = score(tokens, A), score(tokens, B)
    return {'A': a, 'B': b, 'delta': {unit: b[unit] - a[unit] for unit in a}}


def contribution(a, b, A, B):
    ca, cb = A['counts'][a].get(b, 0), B['counts'][a].get(b, 0)
    da, db = A['rowTotals'][a] + 40, B['rowTotals'][a] + 40
    la, lb = log(A, a, b), log(B, a, b)
    return {'first': a, 'second': b, 'countA': ca, 'countB': cb, 'denominatorA': da, 'denominatorB': db,
            'support': ('seen' if ca else 'unseen') + '-' + ('seen' if cb else 'unseen'),
            'logA': la, 'logB': lb, 'delta': lb - la,
            'numeratorDelta': math.log2(cb + 1) - math.log2(ca + 1),
            'denominatorDelta': math.log2(da) - math.log2(db)}


def recorded(phone, key):
    return {'status': 'recorded', 'value': phone[key]} if key in phone else {'status': 'unknown'}


def observe(word):
    """Independent literal #318 contract; taxonomy not imported from TS output."""
    syllables, segments, items = [], [], []
    for si, syllable in enumerate(word['syllables']):
        raw = syllable.get('stress')
        mark = 'unmarked' if raw is None else {'ˈ': 'primary', 'ˌ': 'secondary'}.get(raw, 'invalid')
        stress = {'mark': mark, 'raw': raw}
        syllables.append({'stress': stress, 'nucleusSize': len(syllable['nucleus'])})
        for slot in ['onset', 'nucleus', 'coda']:
            for index, phone in enumerate(syllable[slot]):
                raw_sound = phone['sound']; aspiration = raw_sound.endswith('ʰ')
                stripped = raw_sound[:-1] if aspiration else raw_sound
                base = {'iː': 'i:', 'ɡ': 'g'}.get(stripped, stripped)
                known = base in MAPPING
                status = 'ambiguous' if base == 'ɜ' else 'resolved' if known else 'unknown'
                kind = ('vowel' if base in SOUNDS[:17] else 'consonant') if known else None
                segment = {'coordinates': {'syllable': si, 'slot': slot, 'index': index},
                           'rawSound': raw_sound, 'baseSound': base, 'notationAlias': stripped != base,
                           'symbolAspiration': aspiration, 'identity': {'status': status,
                           'id': 'english-legacy:' + '-'.join(format(ord(c), 'x') for c in base) if known else None, 'kind': kind},
                           'stress': stress, 'slotCompatible': known and ((slot == 'nucleus') == (kind == 'vowel')),
                           'recorded': {'aspiration': recorded(phone, 'aspirated'), 'reduction': recorded(phone, 'reduced'), 'legacyTense': recorded(phone, 'tense')},
                           'underlyingIdentity': {'status': 'unknown'}}
                segments.append(segment)
                token = MAPPING.get(raw_sound.replace('ʰ', ''), {'e': 'EH', 'o': 'OW'}.get(raw_sound.replace('ʰ', '')))
                items.append({'sourceIndex': len(items), 'token': token, 'losses': {'aspiration': 'ʰ' in raw_sound or phone.get('aspirated', False),
                              'stress': slot == 'nucleus', 'mergedIdentity': token in ('AH', 'ER', 'EH', 'OW'), 'unresolvedIdentity': status != 'resolved'}})
    observation = {'contractVersion': 'phoneme-identity-v1', 'sourceProfile': 'english-legacy-v1', 'layer': 'surface', 'syllables': syllables, 'segments': segments}
    projection = {'projection': 'legacy-arpabet-v1', 'complete': all(i['token'] is not None for i in items), 'boundaries': 'erased', 'items': items}
    return observation, projection


def generated_row(draw, shard_sha, A, B):
    observation, projection = observe(draw['word'])
    tokens = [i['token'] for i in projection['items']]
    reason = 'empty' if not tokens else 'missing' if None in tokens else 'outside-vocabulary' if any(t == '#' or t not in VOCABULARY for t in tokens) else None
    return {'identity': {'kind': 'generated', **{k: draw[k] for k in ['profile', 'seed', 'drawIndex']}},
            'tokens': tokens, 'phoneCount': len(tokens), 'transitionCount': len(tokens) + 1 if reason is None else None,
            'identityComplete': all(s['identity']['status'] == 'resolved' for s in observation['segments']), 'unavailable': reason,
            'source': {'archiveSha256': shard_sha, 'written': draw['word']['written']['clean'], 'observation': observation, 'projection': projection},
            'scores': paired(tokens, A, B) if reason is None else None}


def english_row(entry, ordinal, A, B):
    tokens = [t[:-1] if t[-1:] in '012' else t for t in entry['tokens']]
    return {'identity': {'kind': 'english', 'ordinal': ordinal, 'line': entry['line'], 'spelling': entry['spelling']},
            'tokens': tokens, 'phoneCount': len(tokens), 'transitionCount': len(tokens) + 1, 'identityComplete': None,
            'unavailable': None, 'source': {'native': entry['tokens']}, 'scores': paired(tokens, A, B)}


def new_loss():
    return {'segments': 0, 'identities': {'resolved': 0, 'ambiguous': 0, 'unknown': 0}, 'mapped': 0, 'missing': 0,
            'sourceCounts': {}, 'coarsePreimages': {}, 'stressByNucleus': {}, 'recordedAspiration': {}, 'recordedReduction': {},
            'reductionByNucleus': {'true': 0, 'false': 0, 'unknown': 0}, 'symbolAspiration': 0, 'notationAliases': 0,
            'potentialMergerSegments': 0, 'aspirationLoss': 0, 'wordsAffected': {}, 'overlappingLossMaskWords': {}}


def add(counts, key, n=1):
    counts[key] = counts.get(key, 0) + n


def count_loss(target, row):
    if 'observation' not in row['source']:
        return
    flags = set()
    for s, item in zip(row['source']['observation']['segments'], row['source']['projection']['items']):
        target['segments'] += 1; target['identities'][s['identity']['status']] += 1
        add(target['sourceCounts'], s['rawSound'])
        if item['token'] is None:
            target['missing'] += 1; flags.add('missing')
        else:
            target['mapped'] += 1; add(target['coarsePreimages'].setdefault(item['token'], {}), s['rawSound'])
        if s['identity']['status'] != 'resolved':
            flags.add(s['identity']['status'])
        target['symbolAspiration'] += int(s['symbolAspiration'])
        if s['notationAlias']:
            target['notationAliases'] += 1; flags.add('notationAlias')
        if item['losses']['mergedIdentity']:
            target['potentialMergerSegments'] += 1; flags.add('potentialMerger')
        if item['losses']['aspiration']:
            target['aspirationLoss'] += 1; flags.add('aspiration')
        for field, destination in [('aspiration', 'recordedAspiration'), ('reduction', 'recordedReduction')]:
            r = s['recorded'][field]
            add(target[destination], 'unknown' if r['status'] == 'unknown' else str(r['value']).lower())
        r = s['recorded']['reduction']
        if r.get('value') is True:
            flags.add('recordedReduction')
        if s['coordinates']['slot'] == 'nucleus':
            add(target['stressByNucleus'].setdefault(s['rawSound'], {}), s['stress']['mark'])
            flags.add('nucleusStress:' + s['stress']['mark'])
            target['reductionByNucleus']['unknown' if r['status'] == 'unknown' else str(r['value']).lower()] += 1
    for flag in flags:
        add(target['wordsAffected'], flag)
    add(target['overlappingLossMaskWords'], '|'.join(sorted(flags)) or 'none')


class Group:
    def __init__(self, observes_surface=True):
        self.observes_surface = observes_surface
        self.phone_events = self.scoreable_phone_events = self.transition_events = 0
        self.rows = self.scoreable = self.identity_complete = self.identity_unavailable = 0
        self.unavailable = {}; self.loss = new_loss(); self.pairs = Counter()
        self.values = {m: {u: [] for u in ['total', 'perTransition']} for m in ['A', 'B', 'delta']}
        self.producer_delta = {u: [] for u in ['total', 'perTransition']}

    def add(self, row, actual):
        self.rows += 1; self.phone_events += row['phoneCount']; self.identity_complete += row['identityComplete'] is True
        self.identity_unavailable += row['identityComplete'] is None
        count_loss(self.loss, row)
        if row['scores'] is None:
            add(self.unavailable, row['unavailable']); return
        self.scoreable += 1; self.scoreable_phone_events += row['phoneCount']; self.transition_events += row['transitionCount']
        for m in self.values:
            for u in self.values[m]:
                self.values[m][u].append(row['scores'][m][u])
        for u in self.producer_delta:
            self.producer_delta[u].append(actual['scores']['delta'][u])
        seq = ['#', *row['tokens'], '#']
        self.pairs.update(' '.join(pair) for pair in zip(seq, seq[1:]))

    def finish(self, A, B):
        transitions = []
        for pair, n in sorted(self.pairs.items()):
            c = contribution(*pair.split(), A, B)
            transitions.append({**c, 'occurrences': n, 'weightedDelta': n * c['delta'],
                                'weightedNumerator': n * c['numeratorDelta'], 'weightedDenominator': n * c['denominatorDelta']})
        totals = decomposition([t['weightedDelta'] for t in transitions], self.values['delta']['total'])
        return {'rows': self.rows, 'phoneEvents': self.phone_events, 'scoreablePhoneEvents': self.scoreable_phone_events, 'transitionEvents': self.transition_events, 'scoreable': self.scoreable, 'unavailable': self.unavailable, 'identityComplete': self.identity_complete,
                'identityUnavailable': self.identity_unavailable, 'loss': self.loss if self.observes_surface else None,
                'observedMultiPreimageTokens': {t: pre for t, pre in self.loss['coarsePreimages'].items() if len(pre) > 1} if self.observes_surface else None,
                'scores': {m: {u: stats(v) for u, v in values.items()} for m, values in self.values.items()},
                'signs': {u: signs(v) for u, v in self.producer_delta.items()},
                'transitions': transitions, 'decomposition': totals}


def group_for(groups, key, observes_surface):
    if key not in groups:
        groups[key] = Group(observes_surface)
    return groups[key]


def add_groups(groups, row, actual):
    identity = row['identity']
    parents = ['english'] if identity['kind'] == 'english' else ['generated', f"profile/{identity['profile']}", f"stream/{identity['profile']}/{identity['seed']}"]
    for parent in parents:
        for view in ['all', 'identity-complete']:
            if view == 'identity-complete' and row['identityComplete'] is None:
                continue
            group_for(groups, f'{parent}/{view}', identity['kind'] == 'generated')
            if view == 'identity-complete' and row['identityComplete'] is not True:
                continue
            for key in [f'{parent}/{view}', f"{parent}/{view}/phoneCount/{row['phoneCount']}"]:
                group_for(groups, key, identity['kind'] == 'generated').add(row, actual)


def gaps(groups):
    result = {}; e = groups['english/all']
    for key, group in groups.items():
        if key.startswith('english/'):
            continue
        result[key] = {}
        for unit in ['total', 'perTransition']:
            cells = [e['scores']['A'][unit], e['scores']['B'][unit], group['scores']['A'][unit], group['scores']['B'][unit]]
            if any(cell is None for cell in cells):
                result[key][unit] = None; continue
            ea, eb, ga, gb = [cell['mean'] for cell in cells]
            a, b = ea - ga, eb - gb
            result[key][unit] = {'EnglishRows': e['scoreable'], 'generatedRows': group['scoreable'], 'EA': ea, 'EB': eb, 'GA': ga, 'GB': gb,
                                 'A': a, 'B': b, 'delta': b - a, 'pairedMeanDifference': (eb - ea) - (gb - ga)}
    return result


def reconcile_identity(groups, prior):
    exact(prior['observer']['digest'], '476aeca7b45c1b7c9fc8bdd6481354c1c05543fd3b1f72c6726123cbbe3408f6')
    def quoted(values):
        return {json.dumps(k, ensure_ascii=False): v for k, v in values.items()}
    def check(key, expected):
        group = groups[key]; loss = group['loss']
        exact([group['rows'], loss['segments'], loss['identities'], loss['mapped'], loss['missing'], group['scoreable'],
               loss['potentialMergerSegments'], loss['aspirationLoss'], group['identityComplete']],
              [expected['words'], expected['segments'], expected['identities'], expected['coarse']['mapped'], expected['coarse']['missing'],
               expected['coarse']['completeWords'], expected['coarse']['mergeCapable'], expected['coarse']['aspirationLoss'], expected['strict']['identityCompleteWords']])
        exact(quoted(loss['sourceCounts']), expected['sourceCounts'])
        exact({t: quoted(v) for t, v in loss['coarsePreimages'].items()}, expected['coarsePreimages'])
        exact(quoted({s: quoted(v) for s, v in loss['stressByNucleus'].items()}), expected['stressByNucleus'])
        exact(loss['reductionByNucleus'], expected['reductionFlags'])
        exact(loss['segments'], expected['underlyingIdentityUnknown'])
        exact(loss['notationAliases'], sum(expected['notationAliases'].values()))
    for profile in prior['profiles']:
        check(f"profile/{profile['id']}/all", profile['totals'])
        for replicate in profile['replicates']:
            check(f"stream/{profile['id']}/{replicate['seed']}/all", replicate['counts'])


def add_witnesses(witnesses, row, actual, word, A, B):
    # Selection is defined by JS score magnitudes. Those values have already passed the independent numeric check.
    seq = ['#', *row['tokens'], '#']
    cs = [contribution(a, b, A, B) for a, b in zip(seq, seq[1:])] if row['scores'] else []
    categories = {c['support'] for c in cs if c['support'] in ['seen-unseen', 'unseen-seen']}
    if row['unavailable']:
        categories.add(row['unavailable'])
    if 'observation' in row['source']:
        categories.update(s['identity']['status'] for s in row['source']['observation']['segments'] if s['identity']['status'] != 'resolved')
    def save(key):
        witnesses[key] = {'row': copy.deepcopy(row), 'originalWord': copy.deepcopy(word), 'contributions': cs,
                          '_magnitude': abs(actual['scores']['delta']['total']) if actual['scores'] else None}
    for category in categories:
        key = row['identity']['kind'] + '/' + category
        if key not in witnesses:
            save(key)
    key = row['identity']['kind'] + '/maximum-absolute-total-delta'
    if actual['scores'] and (key not in witnesses or abs(actual['scores']['delta']['total']) > witnesses[key]['_magnitude']):
        save(key)


def verified_rows(path, expected_pin):
    exact(pin(path), {k: expected_pin[k] for k in ['bytes', 'sha256']}, 'compressed stream')
    raw_hash = hashlib.sha256(); count = 0
    with gzip.open(path, 'rb') as handle:
        for line in handle:
            if not line.endswith(b'\n'):
                raise ValueError('Truncated output row newline')
            raw_hash.update(line); count += 1; yield strict_json(line)
    exact(count, expected_pin['rows'], 'row count')
    exact(raw_hash.hexdigest(), expected_pin['rawSha256'], 'uncompressed row bytes')


def require_end(iterator):
    try:
        next(iterator)
    except StopIteration:
        return
    raise ValueError('Extra row in complete stream')


def source_authority(freeze_path, expected_sha):
    path = regular(freeze_path); raw = path.read_bytes(); exact(sha(raw), expected_sha, 'externally expected freeze SHA')
    freeze = strict_json(raw); root = regular(freeze['root'], True)
    exact(freeze['version'], 'cmu-model-sensitivity-source-freeze-v1')
    exact(freeze['protocolSha256'], PROTOCOL_SHA)
    protocol_bytes = regular(root / BASE / 'protocol.json').read_bytes(); exact(sha(protocol_bytes), PROTOCOL_SHA)
    protocol = strict_json(protocol_bytes)
    exact(sha(regular(root / BASE / 'design.md').read_bytes()), protocol['designSha256'])
    parent_bytes = regular(root / BASE / 'parent-files.json').read_bytes(); exact(sha(parent_bytes), protocol['parentFilesSha256'])
    parent = strict_json(parent_bytes)
    exact(set(freeze['sources']), set(parent) | set(NEW_PATHS), 'complete source closure')
    for name, expected in freeze['sources'].items():
        exact(pin(root / name), expected, 'reviewed source ' + name)
        if name in parent:
            exact(expected['sha256'], parent[name], 'unchanged parent ' + name)
    for directory in ['evaluation/corpus', 'evaluation/review', BASE]:
        for file in (root / directory).iterdir():
            if directory != BASE and 'model-sensitivity' not in file.name:
                continue
            if directory == BASE and file.name == 'outcomes' and file.is_dir() and not file.is_symlink():
                continue
            if str(file.relative_to(root)) not in freeze['sources']:
                raise ValueError('Unregistered study source')
            regular(file)
    inputs = freeze['inputs']; archive = regular(inputs['archive'], True)
    manifest_bytes = regular(archive / 'manifest.json').read_bytes(); exact(sha(manifest_bytes), MANIFEST_SHA)
    envelope = strict_json(manifest_bytes); manifest = envelope['manifest']
    lexical = strict_json(manifest_bytes, lexical_numbers=True)['manifest']
    exact(envelope['digest'], MANIFEST_DIGEST)
    exact(sha(js_canonical(lexical).encode('utf8')), MANIFEST_DIGEST)
    exact(sha(js_canonical(lexical['protocol']).encode('utf8')), manifest['protocolDigest'])
    expected_files = {'manifest.json', *(a['file'] for a in manifest['artifacts'])}
    actual_files = set()
    for file in archive.iterdir():
        if file.name == 'words':
            regular(file, True)
            for child in file.iterdir():
                regular(child); actual_files.add('words/' + child.name)
        else:
            regular(file); actual_files.add(file.name)
    exact(actual_files, expected_files, 'complete archive filesystem')
    expected_pins = {str(archive / 'manifest.json'): {'bytes': len(manifest_bytes), 'sha256': MANIFEST_SHA}}
    for a in manifest['artifacts']:
        expected_pins[str(archive / a['file'])] = {k: a[k] for k in ['bytes', 'sha256']}
    for key, digest in [('source', RAW_SHA), ('identity', IDENTITY_SHA), ('identityReport', IDENTITY_REPORT_SHA)]:
        p = pin(inputs[key]); exact(p['sha256'], digest, 'external input'); expected_pins[inputs[key]] = p
    exact(freeze['inputFiles'], expected_pins, 'all external input pins')
    for name, expected in expected_pins.items():
        exact(pin(name), expected, 'stable archive/source input')
    return freeze, manifest


def load_reference(root, key):
    reference = REFERENCES[key]
    compressed = regular(root / reference['path']).read_bytes(); exact(sha(compressed), reference['compressed'])
    raw = gzip.decompress(compressed)
    if 'raw' in reference:
        exact(sha(raw), reference['raw'])
    envelope = strict_json(raw); exact(envelope['digest'], reference['digest'])
    return envelope['artifact']


def load_dependencies(root):
    path = root / 'evaluation/corpus/verify-score-reference.py'
    exact(pin(path)['sha256'], '9da4fdf64886d14b189e79d4eb0413fb4561db8cadbf32944bd01a0cfd7d944b', 'unchanged independent old-table parser')
    spec = importlib.util.spec_from_file_location('sensitivity_score_reference', path)
    score_module = importlib.util.module_from_spec(spec); spec.loader.exec_module(score_module)
    io, joint = score_module.dependencies(root)
    return score_module, io, joint


def output_path(destination, protected):
    path = Path(destination).absolute(); output = path.parent.resolve(strict=True) / path.name
    if output.exists() or output.is_symlink():
        raise ValueError('Output must be fresh')
    for source in protected:
        source = Path(source).resolve()
        if output == source or source in output.parents:
            raise ValueError('Output overlaps protected input')
    return output


def verify(freeze_path, freeze_sha, directory, report_sha):
    frozen, manifest = source_authority(freeze_path, freeze_sha)
    root = Path(frozen['root']); inputs = frozen['inputs']; directory = regular(directory, True)
    report_bytes = regular(directory / 'report.json').read_bytes(); exact(sha(report_bytes), report_sha, 'externally expected report SHA')
    envelope = strict_json(report_bytes); report = envelope['report']
    if set(envelope) != {'report', 'digest'} or not isinstance(envelope['digest'], str) or len(envelope['digest']) != 64:
        raise ValueError('Invalid report envelope')
    exact(report['authority'], {'freezeSha256': freeze_sha, 'frozen': frozen}, 'reviewed report authority')
    exact(set(report), {'version', 'interpretation', 'authority', 'models', 'references', 'population', 'units', 'projection', 'artifacts', 'groups', 'gaps', 'witnesses', 'sourceBundle', 'externalIdentitySource', 'limitations'}, 'report fields')
    exact(report['version'], 'cmu-model-sensitivity-v1')
    exact(report['interpretation'], 'paired count-table sensitivity only; no changed generated words or held-out quality claim')
    exact(report['units'], {'total': 'log2 conditional probability sum', 'perTransition': 'total/(phoneCount+1)', 'aggregate': 'equal word weights; sorted sequential binary64; upper-middle median', 'decomposition': DECOMPOSITION_ARITHMETIC})
    exact(report['projection'], {'sourceProfile': 'english-legacy-v1', 'layer': 'surface', 'completeVectorsOnly': True, 'identityEligibility': 'all segment identities resolved, independent of recorded stress'})
    exact(report['limitations'], ['B English is in-sample; historical A population overlap unresolved', 'Count magnitude and smoothing strength change with table; alpha remains one', 'Source identity is not phonological acceptability; ɜ remains ambiguous', 'Saved bare roots and forced monosyllables are not a matched dictionary-stem population', 'No token frequency, POS, familiarity or human preference inference', 'Exact sign counts describe JS binary64; near-zero count is separate'])
    exact(report['references'], REFERENCES)
    source_files = [p for p in frozen['sources'] if p.startswith('evaluation/corpus/') and p.endswith(('.ts', '.py')) or p.startswith('src/phonotactic/') and not p.endswith('.test.ts')]
    exact(report['sourceBundle'], [{'path': p, 'content': regular(root / p).read_text()} for p in source_files], 'source bundle')
    exact(report['externalIdentitySource'], regular(inputs['identity']).read_text())
    score_module, io, joint = load_dependencies(root)
    old = score_module.audit_model(root, io, joint)
    A = {'counts': old['counts'], 'rowTotals': old['totals'], 'total': sum(old['totals'].values()), 'vocabulary': sorted(old['vocabulary'])}
    entries, _, excluded, _ = joint.parser.count_source(regular(inputs['source']).read_text())
    exact(len(entries), 117485); exact(excluded, {'alternate_pronunciation': 9114, 'non_ascii_spelling': 8559, 'no_vowel': 8})
    pairs = io.transitions(joint, entries); B = pairs['base']
    reference = load_reference(root, 'transitions'); exact(reference['transitions'], pairs, 'every independently reconstructed transition bin')
    prior = load_reference(root, 'scores'); load_reference(root, 'joint')
    exact(report['models'], {'A': A, 'B': B}, 'all model bins and denominators')
    numeric = Numeric(); groups = {}; witnesses = {}; counts = {'english': 0, 'generated': 0}
    expected_outputs = ['english.jsonl.gz'] + [f"{p['id']}-{s}.jsonl.gz" for p in manifest['protocol']['profiles'] for s in p['seeds']['development']]
    exact(set(report['artifacts']), set(expected_outputs)); exact({p.name for p in directory.iterdir()}, {'report.json', *expected_outputs})
    def accept(actual, expected, word):
        numeric.compare(actual, expected, f"row/{expected['identity']}")
        if actual['scores']:
            for unit in ['total', 'perTransition']:
                if actual['scores']['delta'][unit] != actual['scores']['B'][unit] - actual['scores']['A'][unit]:
                    raise ValueError('Producer delta arithmetic differs')
                a, b = actual['scores']['delta'][unit], expected['scores']['delta'][unit]
                if (a > 0) - (a < 0) != (b > 0) - (b < 0) or (abs(a) <= ABS) != (abs(b) <= ABS):
                    numeric.sign_disagreements.append({'identity': expected['identity'], 'unit': unit, 'actual': a, 'reference': b})
        add_groups(groups, expected, actual); add_witnesses(witnesses, expected, actual, word, A, B)
        counts[expected['identity']['kind']] += 1
    actual_rows = iter(verified_rows(directory / 'english.jsonl.gz', report['artifacts']['english.jsonl.gz']))
    for ordinal, entry in enumerate(entries):
        expected = english_row(entry, ordinal, A, B)
        legacy = prior['scores']['rows'][ordinal]
        numeric.compare(legacy, {'ordinal': ordinal, 'line': entry['line'], 'spelling': entry['spelling'], 'arpabet': ' '.join(expected['tokens']),
                                'phoneCount': expected['phoneCount'], 'transitionCount': expected['transitionCount'], **expected['scores']['A']}, 'published English score')
        accept(next(actual_rows), expected, None)
    require_end(actual_rows); exact(len(prior['scores']['rows']), len(entries))
    archive = Path(inputs['archive']); pins = {a['file']: a for a in manifest['artifacts']}
    for profile in manifest['protocol']['profiles']:
        for seed in profile['seeds']['development']:
            file = f"{profile['id']}-{seed}.jsonl.gz"; p = pins['words/' + file]
            actual_rows = iter(verified_rows(directory / file, report['artifacts'][file]))
            with gzip.open(archive / 'words' / file, 'rb') as handle:
                index = 0
                for line in handle:
                    draw = strict_json(line)
                    exact([draw['profile'], draw['seed'], draw['drawIndex']], [profile['id'], seed, index], 'raw archive coordinate')
                    if index >= manifest['protocol']['wordsPerReplicate']:
                        raise ValueError('Extra archived row')
                    accept(next(actual_rows), generated_row(draw, p['sha256'], A, B), draw['word']); index += 1
                exact(index, manifest['protocol']['wordsPerReplicate'])
            require_end(actual_rows)
    expected_groups = {k: v.finish(A, B) for k, v in sorted(groups.items())}
    reconcile_identity(expected_groups, strict_json(regular(inputs['identityReport']).read_bytes()))
    numeric.compare(report['groups'], expected_groups, 'groups')
    numeric.compare(report['gaps'], gaps(expected_groups), 'paired gaps')
    for key, witness in witnesses.items():
        exact(report['witnesses'][key]['originalWord'], witness['originalWord'], 'unmodified original trace witness')
    numeric.compare(report['witnesses'], {k: {f: v for f, v in w.items() if f != '_magnitude'} for k, w in witnesses.items()}, 'witnesses')
    exact(counts, {'english': 117485, 'generated': 200000})
    exact(report['population'], {'English': 117485, 'generated': 200000, 'identityCompleteGenerated': expected_groups['generated/identity-complete']['rows']})
    exact(report['population']['identityCompleteGenerated'], 196552)
    numeric.compare(expected_groups['english/all']['scores']['A'], prior['scores']['summary'], 'published English summary')
    exact(source_authority(freeze_path, freeze_sha), (frozen, manifest), 'before/after full authority')
    exact(pin(directory / 'report.json')['sha256'], report_sha, 'stable report')
    for file, p in report['artifacts'].items():
        exact(pin(directory / file), {k: p[k] for k in ['bytes', 'sha256']}, 'stable result stream')
    return {'version': 'cmu-model-sensitivity-independent-verification-v1', 'passed': True, 'counts': counts,
            'freezeSha256': freeze_sha, 'reportSha256': report_sha, 'producerDeclaredDigest': envelope['digest'],
            'floatTolerance': {'absolute': ABS, 'relative': REL}, 'numericComparisons': numeric.comparisons,
            'worstAbsolute': numeric.worst_absolute, 'worstRelative': numeric.worst_relative,
            'nearZeroSignDisagreements': numeric.sign_disagreements,
            'scope': 'Independent raw English/generated vectors, all table bins, aligned source identities/losses, scores, groups, gaps, transitions and witness selection; producer canonical digest is not a cross-language rendering claim.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--freeze', required=True); parser.add_argument('--freeze-sha256', required=True)
    parser.add_argument('--run', required=True); parser.add_argument('--report-sha256', required=True); parser.add_argument('--out', required=True)
    args = parser.parse_args()
    frozen = strict_json(regular(args.freeze).read_bytes())
    destination = output_path(args.out, [frozen['root'], args.freeze, args.run, *frozen['inputs'].values()])
    result = verify(args.freeze, args.freeze_sha256, args.run, args.report_sha256)
    with destination.open('x') as handle:
        json.dump(result, handle, ensure_ascii=False, allow_nan=False, indent=2); handle.write('\n')


if __name__ == '__main__':
    if not __debug__:
        raise RuntimeError('Optimized Python is not supported')
    main()
