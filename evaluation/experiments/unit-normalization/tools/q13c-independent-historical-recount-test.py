import copy
import importlib.util
import json
import unittest

spec = importlib.util.spec_from_file_location('audit', '/private/tmp/q13c-independent-historical-recount.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def fixture(forms, operations):
    phones, units, cells = [], [], []
    for uid, (sound, form) in enumerate(forms):
        ids = list(range(len(cells), len(cells)+len(form)))
        phones.append({'id': uid, 'syllableIndex': 0, 'segment': 'onset', 'soundAtSpelling': sound})
        units.append({'id': uid, 'choiceId': uid, 'phoneIds': [uid], 'selected': form,
                      'afterDoubling': form, 'sourceCellIds': ids})
        cells.extend({'id': cid, 'text': char, 'origin': {'kind': 'selection', 'unitId': uid, 'offset': offset}}
                     for offset, (cid, char) in enumerate(zip(ids, form)))
    next_id, edits = len(cells), []
    for start, size, after, rule in operations:
        before = copy.deepcopy(cells[start:start+size])
        owners = list(dict.fromkeys(uid for cell in before for uid in audit.ledger.owners(cell)))
        output = [{'id': next_id+offset, 'text': char, 'origin': {
            'kind': 'rewrite', 'editId': len(edits), 'ownership': 'unresolved', 'sourceUnitIds': owners}}
            for offset, char in enumerate(after)]
        edits.append({'id': len(edits), 'start': start, 'input': before, 'output': output,
                      'before': ''.join(c['text'] for c in before), 'after': after, 'rule': rule})
        next_id += len(output)
        cells[start:start+size] = output
    return {'version': 1, 'phones': phones, 'units': units, 'cells': cells, 'edits': edits,
            'surface': ''.join(c['text'] for c in cells),
            'unresolvedCells': sum(c['origin']['kind'] == 'rewrite' for c in cells)}


class Tests(unittest.TestCase):
    def test_whole_unit_and_multiplicity(self):
        d = audit.independent_counts(fixture([('a','a')]*3, [
            (1,1,'','deduplicateAdjacentLetters'), (1,1,'','deduplicateAdjacentLetters')]))
        self.assertEqual((d['legacyDedupEvents'], d['legacyWholeUnitEvents'], d['legacySameSoundEvents'],
                          d['dedupAttributedNoLineageUnits'], d['wordsWithDedupNoLineage']), (2,2,2,2,1))

    def test_partial_th(self):
        d = audit.independent_counts(fixture([('t','t'),('θ','th')], [(1,1,'','deduplicateSyllableJoin')]))
        self.assertEqual((d['legacyPartialUnitEvents'], d['legacyDifferentSoundsEvents'],
                          d['dedupAttributedPartialSourceUnits'],d['dedupAttributedPartialThUnits'],
                          d['wordsWithDedupPartialTh']), (1,1,1,1,1))

    def test_later_replacement_excludes_partial(self):
        d = audit.independent_counts(fixture([('t','t'),('θ','th')], [
            (1,1,'','deduplicateSyllableJoin'), (1,1,'x','laterRewrite')]))
        self.assertEqual((d['legacyPartialUnitEvents'],d['dedupAttributedPartialSourceUnits'],
                          d['dedupAttributedNoLineageUnits']), (1,0,0))

    def test_last_consumer_attribution(self):
        d = audit.independent_counts(fixture([('t','t'),('θ','th')], [
            (1,1,'','deduplicateSyllableJoin'), (1,1,'','laterRewrite')]))
        self.assertEqual((d['legacyPartialUnitEvents'],d['dedupAttributedPartialSourceUnits'],
                          d['dedupAttributedNoLineageUnits']), (1,0,0))

    def test_comparator_rejects_schema_and_value_forgery(self):
        for actual in ({'a': True}, {'a': 2}, {}, {'a': 1,'b':0}):
            with self.assertRaises(AssertionError): audit.compare({'a':1},actual)


if __name__ == '__main__': unittest.main()
