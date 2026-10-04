"""Exact original study identities and publication evidence locations."""
from pathlib import Path

MAIN = Path(__file__).resolve().parents[1]
TEMP = Path('/private/tmp')
SPECS = {
    'Q22': {
        'base': 'auditory-study',
        'registration': 'calibration-v1/registration-v1.json',
        'native': 'q22-auditory-calibration-v1',
        'oracle': 'q22-auditory-independent-v1',
        'decisions': 'q22-auditory-decisions-v1',
        'source': 'be7401bc4bc30eb81501f52eb3540a2a17bbe9ae',
        'control': '5796cb441e9eb806266406becfcea2f822103e95',
        'controlBranch': 'depatched/auditory-study-control-5796cb4',
        'contrasts': 122277600, 'dimensions': 6, 'reportContexts': 102, 'registeredContexts': 28,
        'historical': ('inference-retained-local-v1', 'calibration-preflight-retained-local-v1', 'history-retained-local-v1'),
    },
    'Q23': {
        'base': 'read-aloud-study',
        'registration': 'categorical-calibration-v1/registration-v1.json',
        'native': 'q23-categorical-calibration-v1',
        'oracle': 'q23-categorical-independent-v1',
        'decisions': 'q23-categorical-decisions-v1',
        'source': '65c6b76179b9b5067128e69a489ba7debb949230',
        'control': '37e9054591bd9c54ec3b3d144ae11d3122e049c0',
        'controlBranch': 'depatched/read-aloud-control-37e9054',
        'contrasts': 244555200, 'dimensions': 12, 'reportContexts': 204, 'registeredContexts': 60,
        'historical': ('retained-local-v1', 'collector-retained-local-v1', 'browser-retained-local-v1',
                       'inference-retained-local-v1', 'calibration-core-retained-local-v1', 'categorical-preflight-retained-local-v1'),
    },
}


def bindings(entry):
    spec = SPECS[entry]
    base = MAIN / spec['base']
    return {
        'entry': entry,
        'registration': str(base / spec['registration']),
        'native': str(TEMP / spec['native']),
        'oracle': str(TEMP / spec['oracle']),
        'decisions': str(TEMP / spec['decisions']),
        'archiveIndex': str(base / 'full-calibration-retained-local-v1/index.json'),
        'retention': str(TEMP / (entry.lower() + '-full-retention-driver-v1')),
        'recount': str(TEMP / (entry.lower() + '-summary-publication-driver-v2')),
        'portableGates': str(TEMP / (entry.lower() + '-portable-gates-driver-v1')),
        'gateRegistration': str(MAIN / 'study-publication-gates-v3' / (entry.lower() + '-registration-v3.json')),
        'gateVerifier': str(MAIN / 'study-publication-gates-v3/verify-gates.py'),
        'controlPublication': str(TEMP / 'study-control-branch-publication-v1/complete.json'),
    }
