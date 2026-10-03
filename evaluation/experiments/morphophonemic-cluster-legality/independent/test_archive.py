"""Archive registration and counter tests; never a reduced corpus acceptance run."""
import copy
import json
from pathlib import Path
import unittest

from eligibility import Runtime, verify_profile_word
from recount_archive import CONTROL_COMMIT, PROTOCOL_SHA256, eligibility_counts, validate_protocol
from test_eligibility import load_fixtures, pin


class ArchiveRegistrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = Path(__file__).parent
        manifest = json.loads((directory / 'fixtures-manifest.json').read_text())
        record = manifest['registeredProtocol']
        cls.protocol_bytes = (directory / record['file']).read_bytes()
        assert pin(cls.protocol_bytes) == {key: record[key] for key in ('bytes', 'sha256')}
        cls.protocol = json.loads(cls.protocol_bytes)
        cls.registration = {'version': 'q11b-morphophonemic-legality-treatment-v1',
                            'arms': ['composed-control', 'candidate'], 'controlCommit': CONTROL_COMMIT,
                            'protocolSha256': PROTOCOL_SHA256, 'cohort': 'development',
                            'profiles': cls.protocol['profiles'], 'wordsPerPolicyPerArm': 200000, 'wordsPerArm': 400000}

    def test_complete_original_protocol(self):
        self.assertEqual(validate_protocol(self.registration, self.protocol_bytes), self.protocol)

    def test_registration_corruptions(self):
        for field, value in [('version', 'different'), ('cohort', 'validation'), ('controlCommit', '0' * 40),
                             ('wordsPerPolicyPerArm', 10000), ('wordsPerArm', 200000),
                             ('arms', ['candidate']), ('protocolSha256', '0' * 64)]:
            with self.subTest(field=field):
                registration = copy.deepcopy(self.registration)
                registration[field] = value
                with self.assertRaises(AssertionError):
                    validate_protocol(registration, self.protocol_bytes)

    def test_rehashed_protocol_cannot_change_seeds_or_samples(self):
        for mutate in (lambda p: p.update(wordsPerReplicate=100),
                       lambda p: p['profiles'][0]['seeds']['development'].reverse(),
                       lambda p: p['profiles'].pop()):
            protocol = copy.deepcopy(self.protocol)
            mutate(protocol)
            raw = json.dumps(protocol).encode()
            registration = copy.deepcopy(self.registration)
            registration.update(profiles=protocol['profiles'], protocolSha256=pin(raw)['sha256'])
            with self.assertRaises(AssertionError):
                validate_protocol(registration, raw)

    def test_proposal_denominators_reconcile(self):
        for row in load_fixtures('transaction'):
            with self.subTest(case=row['id']):
                result = verify_profile_word(row['word'], Runtime(row['configuration']), True)
                counts = eligibility_counts(result)
                self.assertEqual(counts['eligibility/words/affixed'], 1)
                self.assertEqual(counts['eligibility/proposals'], len(result['evaluations']))
                self.assertEqual(sum(value for key, value in counts.items() if key.startswith('eligibility/outcome/')),
                                 counts['eligibility/proposals'])
                self.assertEqual(sum(value for key, value in counts.items() if key.startswith('eligibility/stratum/')),
                                 counts['eligibility/proposals'])
                self.assertEqual(counts['eligibility/acceptedPhoneChanges'], counts['eligibility/outcome/accepted'])

    def test_contradictory_guard_cannot_count_as_accepted(self):
        row = next(r for r in load_fixtures('transaction') if r['id'] == 'atomic-rejection')
        result = verify_profile_word(row['word'], Runtime(row['configuration']), True)
        result['evaluations'][0]['outcome'] = 'accepted'
        with self.assertRaises(AssertionError):
            eligibility_counts(result)


if __name__ == '__main__':
    unittest.main(verbosity=2)
