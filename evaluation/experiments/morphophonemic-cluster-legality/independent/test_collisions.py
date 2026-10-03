import copy
import unittest
from collisions import morphology_collisions

def fixture(before='k', cross_boundary=False):
    coordinates = [(0, 'nucleus', 0), (0, 'coda', 0),
                   (1, 'onset', 0) if cross_boundary else (0, 'coda', 1), (1, 'nucleus', 0)]
    original = ['æ', 's', before, 'ɪ']
    final = ['æ', 's', 's', 'ɪ']
    initial = [dict(id=index, initialSound=sound,
                    source=dict(kind='segment', part='suffix' if index == 3 or (index == 2 and cross_boundary) else 'root',
                                syllable=syllable, segment=segment, index=position))
               for index, (sound, (syllable, segment, position)) in enumerate(zip(original, coordinates))]
    ledger = dict(version=1, initial=initial, changes=[dict(id=2, before=before, after='s',
                  rule='morphophonemic:root-suffix:0:probe')], realization=[],
                  final=[dict(id=index, sound=sound, syllable=syllable, segment=segment, index=position)
                         for index, (sound, (syllable, segment, position)) in enumerate(zip(final, coordinates))])
    after = [dict(onset=[], nucleus=['æ'], coda=['s'] if cross_boundary else ['s','s']),
             dict(onset=['s'] if cross_boundary else [], nucleus=['ɪ'], coda=[])]
    return dict(trace=dict(morphology=dict(realization=dict(phoneAssembly=ledger)),
                          stages=[dict(name='assembleMorphology', after=after)]))

class CollisionTests(unittest.TestCase):
    def test_transformation_created_root_coda_equality(self):
        counts, events = morphology_collisions(fixture())
        self.assertEqual(counts['morphologyCensus/applied/probe'], 1)
        self.assertEqual(counts['morphologyCensus/createdEquality'], 1)
        self.assertTrue(events[0]['sameSegment'])
        self.assertEqual(events[0]['parts'], ['root','root'])

    def test_boundary_repetition_is_classified_separately(self):
        _, events = morphology_collisions(fixture(cross_boundary=True))
        self.assertEqual(events[0]['parts'], ['root','suffix'])
        self.assertFalse(events[0]['sameSyllable'])
        self.assertFalse(events[0]['sameSegment'])

    def test_preexisting_equality_is_not_claimed_created(self):
        counts, events = morphology_collisions(fixture(before='s'))
        self.assertEqual(counts['morphologyCensus/createdEquality'], 0)
        self.assertEqual(counts['morphologyCensus/preexistingEquality'], 1)
        self.assertFalse(events[0]['created'])

    def test_corrupt_phone_or_stage_identity_is_rejected(self):
        for field in ['before', 'id']:
            word = fixture()
            word['trace']['morphology']['realization']['phoneAssembly']['changes'][0][field] = 'wrong' if field=='before' else 99
            with self.assertRaises((AssertionError, KeyError)):
                morphology_collisions(word)
        word = fixture()
        word['trace']['stages'][0]['after'][0]['coda'] = ['s']
        with self.assertRaises(AssertionError):
            morphology_collisions(word)

    def test_missing_evidence_remains_unavailable(self):
        counts, events = morphology_collisions(dict(trace=dict(morphology=dict(realization=None))))
        self.assertEqual(counts['morphologyCensus/noAssemblyEvidence'],1)
        self.assertEqual(events,[])

if __name__ == '__main__':
    unittest.main()
