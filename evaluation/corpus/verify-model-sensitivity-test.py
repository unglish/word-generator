"""Synthetic/adversarial fixtures only; no full corpus scoring or generator calls."""
import copy
import gzip
import importlib.util
import json
import math
from fractions import Fraction
from pathlib import Path
import tempfile
import unittest
import sys
import subprocess
import os
sys.dont_write_bytecode = True
path = Path(__file__).with_name('verify-model-sensitivity.py')
spec = importlib.util.spec_from_file_location('sensitivity', path)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


def table():
    # Synthetic complete fixed vocabulary; one event in each permitted edge per row.
    counts = {a: {b: 1 for b in m.VOCABULARY if (a, b) != ('#', '#')} for a in m.VOCABULARY}
    totals = {a: sum(v.values()) for a, v in counts.items()}
    return {'counts': counts, 'rowTotals': totals, 'total': sum(totals.values()), 'vocabulary': m.VOCABULARY}


def word(nucleus, onset=(), coda=(), stress=None):
    s = {slot: [{'sound': p} for p in values] for slot, values in [('onset', onset), ('nucleus', nucleus), ('coda', coda)]}
    if stress is not None:
        s['stress'] = stress
    return {'syllables': [s], 'written': {'clean': 'synthetic'}, 'trace': {'sentinel': 'retained'}}


class Checks(unittest.TestCase):
    def setUp(self):
        self.A = table(); self.B = copy.deepcopy(self.A)
        self.B['counts']['#']['AA'] += 1; self.B['rowTotals']['#'] += 1; self.B['total'] += 1

    def test_boundaries_repeat_absent_and_denominators(self):
        a = m.score(['AA'], self.A)
        self.assertEqual(a['total'], m.log(self.A, '#', 'AA') + m.log(self.A, 'AA', '#'))
        self.assertEqual(a['perTransition'], a['total'] / 2)
        self.assertEqual(m.score(['AA', 'AA'], self.A)['total'], m.log(self.A, '#', 'AA') + m.log(self.A, 'AA', 'AA') + m.log(self.A, 'AA', '#'))
        c = m.contribution('#', 'P', self.A, self.B)
        self.assertEqual(c['numeratorDelta'], 0); self.assertNotEqual(c['denominatorDelta'], 0)
        self.assertAlmostEqual(c['delta'], c['numeratorDelta'] + c['denominatorDelta'], places=12)
        del self.B['counts']['AA']['P']; self.B['rowTotals']['AA'] -= 1; self.B['total'] -= 1
        self.assertEqual(m.contribution('AA', 'P', self.A, self.B)['support'], 'seen-unseen')

    def test_empty_invalid_vector(self):
        for value in [[], ['#'], [None], ['AA0'], ['ZZ']]:
            with self.assertRaises(ValueError):
                m.score(value, self.A)

    def test_identity_projection_and_aspiration(self):
        obs, projection = m.observe(word(['ɜ', 'ɚ', 'ə', 'ʌ'], ['pʰ']))
        self.assertEqual([s['identity']['status'] for s in obs['segments']], ['resolved', 'ambiguous', 'resolved', 'resolved', 'resolved'])
        self.assertEqual([i['token'] for i in projection['items']], ['P', 'ER', 'ER', 'AH', 'AH'])
        self.assertTrue(projection['items'][0]['losses']['aspiration'])
        self.assertEqual(obs['segments'][1]['stress']['mark'], 'unmarked')
        w = word(['ə']); w['syllables'][0]['nucleus'][0]['reduced'] = True
        o, _ = m.observe(w); self.assertEqual(o['segments'][0]['underlyingIdentity'], {'status': 'unknown'})

    def test_aliases_unknowns_and_multiple_nuclei(self):
        obs, p = m.observe(word(['iː', 'e', 'o'], ['ɡ', 'unknown'], stress='?'))
        self.assertEqual([i['token'] for i in p['items']], [None, None, None, 'EH', 'OW'])
        self.assertTrue(obs['segments'][0]['notationAlias']); self.assertEqual(obs['syllables'][0]['nucleusSize'], 3)
        self.assertEqual(obs['segments'][2]['identity']['status'], 'resolved'); self.assertEqual(obs['segments'][2]['stress']['mark'], 'invalid')
        draw = {'profile': 'p', 'seed': 2, 'drawIndex': 0, 'word': word(['ə'], ['unknown'], ['t'])}
        row = m.generated_row(draw, 'pin', self.A, self.B)
        self.assertEqual(row['tokens'], [None, 'AH', 'T']); self.assertIsNone(row['scores']); self.assertEqual(row['unavailable'], 'missing')

    def test_groups_exact_strata_loss_masks_and_null_subset(self):
        groups = {}
        for i, sound in enumerate(['ə', 'ʌ', 'ɜ']):
            r = m.generated_row({'profile': 'p', 'seed': 1, 'drawIndex': i, 'word': word([sound])}, 'pin', self.A, self.B)
            m.add_groups(groups, r, r)
        all_group = groups['generated/all'].finish(self.A, self.B)
        self.assertEqual(all_group['rows'], 3); self.assertEqual(all_group['identityComplete'], 2)
        self.assertEqual(all_group['observedMultiPreimageTokens'], {'AH': {'ə': 1, 'ʌ': 1}})
        self.assertEqual(sum(all_group['loss']['overlappingLossMaskWords'].values()), 3)
        self.assertEqual(groups['generated/all/phoneCount/1'].rows, 3)
        one = {}; r = m.generated_row({'profile': 'p', 'seed': 1, 'drawIndex': 0, 'word': word(['ɜ'])}, 'pin', self.A, self.B)
        m.add_groups(one, r, r); self.assertIsNone(one['generated/identity-complete'].finish(self.A, self.B)['scores']['A']['total'])

    def test_stats_sign_and_numeric_failures(self):
        self.assertIsNone(m.stats([])); self.assertEqual(m.stats([-3.0, -1.0])['median'], -1.0)
        self.assertEqual(m.signs([-1e-12, 0, 1e-12, 1]), {'negative': 1, 'zero': 1, 'positive': 2, 'nearZero': 3})
        for actual, expected in [(True, 1), (True, 1.0), (float('nan'), 1.0), (float('inf'), 1.0), (2, 1), ({'x': 1, 'extra': 0}, {'x': 1})]:
            with self.assertRaises(ValueError):
                m.Numeric().compare(actual, expected)
        numeric = m.Numeric(); numeric.compare(1.0 + 1e-11, 1.0, 'retained-error')
        self.assertEqual(numeric.worst_absolute['path'], 'retained-error'); self.assertGreater(numeric.worst_relative['relative'], 0)

    def test_same_total_wrong_loss_mask_and_swapped_rows_reject(self):
        draw = {'profile': 'p', 'seed': 1, 'drawIndex': 0, 'word': word(['ɜ'])}
        expected = m.generated_row(draw, 'pin', self.A, self.B)
        altered = copy.deepcopy(expected); altered['source']['observation']['segments'][0]['identity']['status'] = 'resolved'
        with self.assertRaises(ValueError):
            m.Numeric().compare(altered, expected)
        for key, value in [('drawIndex', 1), ('seed', True), ('profile', 'other')]:
            bad = copy.deepcopy(expected); bad['identity'][key] = value
            with self.assertRaises(ValueError):
                m.Numeric().compare(bad, expected)
        group = m.Group(); group.add(expected, expected); summary = group.finish(self.A, self.B)
        forged = copy.deepcopy(summary); forged['loss']['wordsAffected']['ambiguous'] = 0
        with self.assertRaises(ValueError):
            m.Numeric().compare(forged, summary)

    def test_marginal_preserving_swap_is_not_complete_table_proof(self):
        bad = copy.deepcopy(self.A)
        for a, b, n in [('AA', 'P', 1), ('AA', 'T', -1), ('AE', 'P', -1), ('AE', 'T', 1)]:
            bad['counts'][a][b] += n
        self.assertEqual(bad['rowTotals'], self.A['rowTotals']); self.assertEqual(bad['total'], self.A['total'])
        with self.assertRaises(ValueError):
            m.exact(bad, self.A)

    def test_ordered_stream_integrity_and_every_byte(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d).resolve() / 'rows.gz'; rows = [{'i': 0}, {'i': 1}]
            raw = b''.join((json.dumps(r) + '\n').encode() for r in rows); path.write_bytes(gzip.compress(raw, mtime=0))
            pinned = {**m.pin(path), 'rows': 2, 'rawSha256': m.sha(raw)}
            self.assertEqual(list(m.verified_rows(path, pinned)), rows)
            for raw_bad in [b'{"i": 0}\n', b'{"i": 1}\n{"i": 0}\n', b'{"i": 0}\n{"i": 0}\n', raw + b'\n', raw[:-1]]:
                path.write_bytes(gzip.compress(raw_bad, mtime=0))
                with self.assertRaises(ValueError):
                    list(m.verified_rows(path, pinned))
            with self.assertRaises(ValueError):
                m.require_end(iter([1]))
            m.require_end(iter([]))

    def test_fresh_output_source_aliases_and_hardlinks(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d).resolve(); source = directory / 'source'; source.mkdir(); (source / 'input').write_text('pin')
            alias = directory / 'alias'; alias.symlink_to(source, target_is_directory=True)
            (directory / 'hard').hardlink_to(source / 'input'); (directory / 'dangling').symlink_to(directory / 'missing')
            for path in [directory / 'hard', directory / 'dangling', alias / 'new']:
                with self.assertRaises(ValueError):
                    m.output_path(path, [source])
            for path in [alias / 'input', alias]:
                with self.assertRaises(ValueError):
                    m.regular(path, path == alias)
            self.assertEqual(m.output_path(directory / 'fresh', [source]), directory / 'fresh')

    def test_compensated_decomposition_and_unchanged_sorted_summary(self):
        terms = [1e16, 1.0, -1e16]
        self.assertEqual(m.sequential(terms), 0.0)
        self.assertEqual(m.decomposition(terms, [1.0]), {'arithmetic': m.DECOMPOSITION_ARITHMETIC['version'],
                         'weightedDelta': 1.0, 'rowDelta': 1.0, 'residual': 0.0})
        self.assertEqual(m.stats(terms)['mean'], 0.0)
        result = m.decomposition([1e16, 1.0], [1e16])
        self.assertEqual(result['weightedDelta'] - result['rowDelta'], 0.0)
        self.assertEqual(result['residual'], 1.0)
        self.assertEqual(m.decomposition([], [])['residual'], 0.0)
        for value in [math.nan, math.inf, -math.inf]:
            with self.assertRaises(ValueError):
                m.decomposition([1.0], [value])

    def test_one_ulp_does_not_weaken_fixed_residual_tolerance(self):
        next_value = math.nextafter(1e6, math.inf)
        m.Numeric().compare(next_value, 1e6)
        residual = m.decomposition([next_value], [1e6])['residual']
        self.assertEqual(residual, 2.0 ** -33)
        with self.assertRaisesRegex(ValueError, 'numerical tolerance exceeded'):
            m.Numeric().compare(residual, 0.0)

    def test_tiny_ts_decomposition_matches_fsum_and_exact_binary64_term_sum(self):
        fixtures = [([1e16, 1.0, -1e16], [1.0]), ([1e16, 1.0], [1e16]),
                    ([1e6, 2.0 ** -34], [1e6]), ([math.nextafter(1e6, math.inf)], [1e6]),
                    ([1.0, 2.0 ** -53, 2.0 ** -1074], [1.0]),
                    ([-1.0, -(2.0 ** -53), -(2.0 ** -1074)], [-1.0]),
                    ([1e16, 2.0 ** -1074, -1e16], []), ([], [])]
        script = r"""
import { decomposition, DECOMPOSITION_ARITHMETIC } from './evaluation/corpus/model-sensitivity.ts';
const fixtures = JSON.parse(process.env.Q15_DECOMPOSITION_FIXTURES);
console.log(JSON.stringify({arithmetic: DECOMPOSITION_ARITHMETIC, values: fixtures.map(([w,r]) => decomposition(w,r))}));
"""
        completed = subprocess.run(['node', '--import', 'tsx', '--input-type=module', '-e', script], cwd=path.parents[2],
                                   env={**os.environ, 'Q15_DECOMPOSITION_FIXTURES': json.dumps(fixtures)}, capture_output=True, text=True)
        self.assertEqual(completed.returncode, 0, completed.stderr + completed.stdout)
        result = m.strict_json(completed.stdout)
        self.assertEqual(result['arithmetic'], m.DECOMPOSITION_ARITHMETIC)
        for actual, (weighted, rows) in zip(result['values'], fixtures):
            expected = m.decomposition(weighted, rows)
            self.assertEqual(actual, expected)
            for field, terms in [('weightedDelta', weighted), ('rowDelta', rows), ('residual', [*weighted, *(-v for v in rows)])]:
                exact_sum = sum((Fraction.from_float(v) for v in terms), Fraction())
                self.assertEqual(actual[field], float(exact_sum))
        self.assertEqual(len(result['values']), len(fixtures))

    def test_manifest_canonicalization_preserves_js_numbers_and_index_order(self):
        raw = '{"z":{"10":10,"2":2,"1":1},"4294967295":5,"01":1,"0":0,"4294967294":4,"-1":-1,"tiny":1e-7,"huge":1e+21,"decimal":0.000001,"😀":1,"\ue000":2}'
        expected = '{"0":0,"4294967294":4,"-1":-1,"01":1,"4294967295":5,"decimal":0.000001,"huge":1e+21,"tiny":1e-7,"z":{"1":1,"2":2,"10":10},"😀":1,"\ue000":2}'
        self.assertEqual(m.js_canonical(m.strict_json(raw, lexical_numbers=True)), expected)
        with self.assertRaises(ValueError):
            m.js_canonical({'unpreserved': 0.5})

    def test_source_hash_changes_duplicate_json_and_boolean_ids(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d).resolve() / 'source'; path.write_text('a'); original = m.pin(path); path.write_text('b')
            with self.assertRaises(ValueError):
                m.exact(m.pin(path), original)
        for data in ['{"a":1,"a":2}', '{"score":NaN}', '{"score":Infinity}']:
            with self.assertRaises(ValueError):
                m.strict_json(data)
        with self.assertRaises(ValueError):
            m.exact([True], [1])

    def test_complete_synthetic_ts_rows_groups_and_witnesses_against_independent_math(self):
        root = path.parents[2]
        module = os.environ.get('Q15_IDENTITY_MODULE', '/private/tmp/q16-files/identity.ts')
        script = r"""
import { model, StudyGroups, gaps } from './evaluation/corpus/model-sensitivity.ts';
import { oldTable, generatedRow, englishRow, Witnesses } from './evaluation/corpus/model-sensitivity-runner.ts';
import { loadIdentity } from './evaluation/corpus/model-sensitivity-integrity.ts';
const identity = await loadIdentity(process.env.Q15_IDENTITY_MODULE);
const a = oldTable(), b = structuredClone(a); b.counts['#'].AA++; b.rowTotals['#']++; b.total++;
const A = model(a), B = model(b), groups = new StudyGroups(), witnesses = new Witnesses(), rows = [];
const entry = { line: 1, spelling: 'fixture', tokens: ['AA0'], phones: [{base:'AA'}] };
const erow = englishRow(entry, 0, A, B); groups.add(erow); witnesses.add(erow,A,B); rows.push({row:erow,word:null});
const specifications = [ ['ə','ʌ'], ['ɜ','ɚ'], ['iː','e','o'], [], ['ɪ'], ['unknown'], ['ɑ','ɑ'], ['i:','ɪ','ɛ','ə','ɜ','ɚ','æ','ɑ','ɔ','ʊ','u','ʌ','eɪ','aɪ','əʊ','ɔɪ','aʊ'] ];
const allConsonants = ['j','w','l','r','m','n','ŋ','f','θ','h','v','ð','z','ʒ','s','ʃ','tʃ','dʒ','p','t','k','b','d','g'];
for (const [index,nucleus] of specifications.entries()) {
 const word = {syllables:[{onset:index===7?allConsonants.map(sound=>({sound})):[{sound:index===4?'pʰ':'t',aspirated:index===4}], nucleus:nucleus.map(sound=>({sound,reduced:false})), coda:[{sound:'s'}], ...(index===4?{stress:'?'}:{})}], written:{clean:'fixture'+index}, trace:{sentinel:'original'}};
 const row = generatedRow({profile:'fixture',seed:9,drawIndex:index,word},'fixture-pin',identity,A,B);
 groups.add(row);witnesses.add(row,A,B,word); rows.push({row,word});
}
const result = groups.finish(A,B); console.log(JSON.stringify({rows,groups:result,gaps:gaps(result),witnesses:witnesses.finish(),models:{A:a,B:b}}));
"""
        environment = {**os.environ, 'Q15_IDENTITY_MODULE': module}
        completed = subprocess.run(['node', '--import', 'tsx', '--input-type=module', '-e', script], cwd=root,
                                   env=environment, capture_output=True, text=True)
        self.assertEqual(completed.returncode, 0, completed.stderr + completed.stdout)
        fixture = m.strict_json(completed.stdout)
        score_module, io, joint = m.load_dependencies(root)
        old = score_module.audit_model(root, io, joint)
        A = {'counts': old['counts'], 'rowTotals': old['totals'], 'total': sum(old['totals'].values()), 'vocabulary': sorted(old['vocabulary'])}
        B = copy.deepcopy(A); B['counts']['#']['AA'] += 1; B['rowTotals']['#'] += 1; B['total'] += 1
        m.exact(fixture['models'], {'A': A, 'B': B})
        groups, witnesses, numeric = {}, {}, m.Numeric()
        for index, pair in enumerate(fixture['rows']):
            if index == 0:
                expected = m.english_row({'line': 1, 'spelling': 'fixture', 'tokens': ['AA0']}, 0, A, B)
            else:
                expected = m.generated_row({'profile': 'fixture', 'seed': 9, 'drawIndex': index - 1, 'word': pair['word']}, 'fixture-pin', A, B)
            numeric.compare(pair['row'], expected, f'synthetic row {index}')
            m.add_groups(groups, expected, pair['row']); m.add_witnesses(witnesses, expected, pair['row'], pair['word'], A, B)
        finished = {k: v.finish(A, B) for k, v in sorted(groups.items())}
        numeric.compare(fixture['groups'], finished, 'synthetic groups')
        numeric.compare(fixture['gaps'], m.gaps(finished), 'synthetic gaps')
        numeric.compare(fixture['witnesses'], {k: {f: v for f, v in w.items() if f != '_magnitude'} for k, w in witnesses.items()}, 'synthetic witnesses')
        self.assertGreater(numeric.comparisons, 1000)

    def test_witnesses_do_not_alias_mutable_inputs(self):
        w = word(['ɜ']); r = m.generated_row({'profile': 'p', 'seed': 1, 'drawIndex': 0, 'word': w}, 'pin', self.A, self.B)
        witnesses = {}; m.add_witnesses(witnesses, r, r, w, self.A, self.B)
        w['syllables'].clear(); r['tokens'].clear()
        self.assertEqual(witnesses['generated/ambiguous']['row']['tokens'], ['ER'])
        self.assertEqual(len(witnesses['generated/ambiguous']['originalWord']['syllables']), 1)


if __name__ == '__main__':
    unittest.main()
