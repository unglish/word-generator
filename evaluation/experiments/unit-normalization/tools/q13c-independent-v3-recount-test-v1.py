"""Synthetic only: no generation, saved corpus execution, or reading proof."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import ModuleType
import unittest

PATH = Path(__file__).with_name('q13c-independent-v3-recount-v1.py')
v = ModuleType('q13c_v3'); v.__file__ = str(PATH)
exec(compile(PATH.read_bytes(), str(PATH), 'exec'), v.__dict__)


def fixture(forms=('a','b'), parts=(0,0), outcome=None):
    phones, units, cells, checks = [], [], [], []
    segment = 0
    for uid, (form, part) in enumerate(zip(forms, parts)):
        segment = segment+1 if uid and part == parts[uid-1] else 0
        phones.append({'id':uid,'part':'root','syllableIndex':part,'segment':'onset','segmentIndex':segment,
                       'soundAtSpelling':f'p{uid}','boundary':{'phoneme':{'sound':f'p{uid}'}}})
        ids = []
        for offset, char in enumerate(v.utf16(form)):
            cid=len(cells); ids.append(cid); cells.append({'id':cid,'text':char,'origin':{'kind':'selection','unitId':uid,'offset':offset},'partId':part})
        units.append({'id':uid,'choiceId':uid,'phoneIds':[uid],'selected':form,'afterDoubling':form,'sourceCellIds':ids,'inventoryIndex':uid,'doublingIncrement':0})
        checks.append({'site':'adjacent-choice','cursor':{'lastAppendedUnitId':uid,'nextEditId':0}})
        if uid+1 == len(forms) or part != parts[uid+1]: checks.append({'site':'syllable-join','cursor':{'lastAppendedUnitId':uid,'nextEditId':0}})
    base={'version':3,'scope':'root-before-morphology','capabilities':{'exactParts':1,'licensedOrigins':1,'writerBoundary':1,'unitNormalization':1},
          'phones':phones,'units':units,'cells':cells,'surface':v.joined(cells),'edits':[],'unresolvedCells':0,'certificates':[], 'normalizationCertificates':[],
          'normalization':{'version':1,'checks':checks,'comparisons':{'adjacent-choice':0,'syllable-join':0},'collisions':{'adjacent-choice':0,'syllable-join':0},'episodes':[]}}
    # Hand-complete two-unit fixture; other cases set their small counts explicitly.
    if len(forms)==2 and forms[0] and forms[1]:
        site='adjacent-choice' if parts[0]==parts[1] else 'syllable-join'
        base['normalization']['comparisons'][site]=1
        if v.utf16(forms[0])[-1]==v.utf16(forms[1])[0]:
            base['normalization']['collisions'][site]=1
            cursor={'lastAppendedUnitId':1,'nextEditId':0}
            left=units[0]['sourceCellIds'][-1]; right=units[1]['sourceCellIds'][0]
            ep={'version':1,'id':0,'site':site,'cursor':cursor,'predecessorCellId':left,'rightCellId':right,'rightUnitId':1,
                'outcome':{'status':'retained','reason':'unknown-reading'}}
            base['normalization']['episodes']=[ep]
            if outcome=='normalized':
                remainder=v.utf16(forms[1])[1:]; assert remainder
                after=b''.join(x.encode('utf-16-le','surrogatepass') for x in remainder).decode('utf-16-le','surrogatepass')
                cert={'version':1,'kind':'local-unit-normalization','id':0,'site':site,'cursor':cursor,'editId':0,'unitId':1,'phoneIds':[1],'partId':parts[1],
                      'predecessorCellId':left,'inputCellIds':units[1]['sourceCellIds'],'before':forms[1],'after':after,'originalInventoryIndex':1,
                      'preUnitState':{'previousForm':forms[0],'doublingCount':0,'nucleusForm':'','previousNucleusForm':''},
                      'support':{'pool':'ordinary','quotaRelaxed':False},'targetReading':{'kind':'single-phone'},'checkedNeighbors':[]}
                produced=[{'id':len(cells)+i,'text':char,'partId':parts[1], 'origin':{'kind':'normalized','unitId':1,'offset':i,'editId':0,'certificateId':0,'sourceUnitIds':[1]}} for i,char in enumerate(remainder)]
                start=len(v.utf16(forms[0])); original=copy.deepcopy(cells[start:]); cells[start:]=produced
                base['edits']=[{'id':0,'phase':'selection' if site=='adjacent-choice' else 'syllable','rule':'unitNormalization:'+site,'start':start,
                                'input':original,'output':produced,'before':forms[1],'after':after,'partId':parts[1]}]
                base['normalizationCertificates']=[cert]; ep['outcome']={'status':'normalized','certificateId':0}
                if site=='adjacent-choice': checks[-1]['cursor']['nextEditId']=1
                base['surface']=v.joined(cells)
    return {'trace':{'baseSpelling':base,'attempts':0,'spellingBudgets':[]},'written':{'clean':base['surface']}}


def generic_edit(word, start, count, text, phase='syllable', part=0):
    b=word['trace']['baseSpelling']; cells=b['cells']; original=copy.deepcopy(cells[start:start+count])
    eid=len(b['edits']); next_id=1+max([c['id'] for c in cells]+[c['id'] for e in b['edits'] for c in e['output']],default=-1)
    ancestry=list(dict.fromkeys(uid for c in original for uid in v.owners(c)))
    output=[{'id':next_id+i,'text':char,'partId':part,'origin':{'kind':'rewrite','editId':eid,'sourceUnitIds':ancestry,'ownership':'unresolved'}} for i,char in enumerate(v.utf16(text))]
    b['edits'].append({'id':eid,'phase':phase,'rule':'fixtureRegex','start':start,'input':original,'output':output,'before':v.joined(original),'after':text,'partId':part})
    cells[start:start+count]=output; b['surface']=v.joined(cells); b['unresolvedCells']=sum(c['origin']['kind']=='rewrite' for c in cells);word['written']['clean']=b['surface']


class StructuralTests(unittest.TestCase):
    def test_append_guard_replay_and_retained_collision(self):
        for parts in [(0,0),(0,1)]:
            word=fixture(('t','th'),parts); saved=copy.deepcopy(word); counts=v.observe(word)
            self.assertEqual(counts['actualSiteComparisons'],1);self.assertEqual(counts['actualCollisions'],1)
            self.assertEqual(counts['wordsWithRetainedOutcome'],1);self.assertEqual(counts['uncertifiedDedupDeletions'],0)
            self.assertEqual(v.replay_summary(counts),{'status':'not-applicable','fraction':None,'emitted':0,'verified':0})
            self.assertEqual(word,saved)

    def test_complete_local_replacement_preserves_one_phone_at_both_sites(self):
        for parts in [(0,0),(0,1)]:
            word=fixture(('t','th'),parts,'normalized'); counts=v.observe(word)
            self.assertEqual(counts['emittedNormalizationCertificates'],1);self.assertEqual(counts['verifiedNormalizationCertificates'],1)
            self.assertEqual(counts['normalizationPhoneMultiplicityViolations'],0);self.assertEqual(counts['partialSourceUnits'] if 'partialSourceUnits' in counts else 0,0)
            self.assertEqual(counts['wordsWithNormalizedOutcome'],1)
            self.assertEqual(v.replay_summary(counts)['fraction'],1)

    def test_empty_previous_unit_and_empty_syllable_are_not_skipped_backward(self):
        for word in [fixture(('t','','th'),(0,0,0)),fixture(('a','','a'),(0,1,2)),fixture(('',),(0,))]:
            counts=v.observe(word);self.assertEqual(counts['actualSiteComparisons'],0);self.assertEqual(counts['actualCollisions'],0)

    def test_generic_syllable_edit_cannot_move_adjacent_guard_later(self):
        word=fixture(('t','th'),(0,0));generic_edit(word,0,1,'');b=word['trace']['baseSpelling']; b['normalization']['checks'][-1]['cursor']['nextEditId']=1
        v.observe(word)
        b['normalization']['checks'][1]['cursor']['nextEditId']=1
        with self.assertRaises(AssertionError):v.observe(word)

    def test_join_must_follow_generic_syllable_edits_and_can_skip_emptied_part(self):
        word=fixture(('a','b'),(0,1));generic_edit(word,1,1,'',part=1);b=word['trace']['baseSpelling']
        b['normalization']['checks'][-1]['cursor']['nextEditId']=1;b['normalization']['comparisons']['syllable-join']=0
        v.observe(word)
        b['normalization']['checks'][-1]['cursor']['nextEditId']=0
        with self.assertRaises(AssertionError):v.observe(word)

    def test_utf16_surrogate_cells_and_code_unit_shortening(self):
        word=fixture(('🙂','a'),(0,0));self.assertEqual(v.observe(word)['letters'],3)
        self.assertEqual(len(word['trace']['baseSpelling']['units'][0]['sourceCellIds']),2)
        word=fixture(('\ud83d','🙂'),(0,0),'normalized');self.assertEqual(v.observe(word)['letters'],2)
        self.assertEqual(v.compact(['\ud83d']), '["\\ud83d"]')

    def test_dropped_noncollision_guard_and_within_bound_count_forgery_fail(self):
        for mutate in [lambda b:b['normalization']['checks'].pop(0),
                       lambda b:b['normalization']['checks'].reverse(),
                       lambda b:b['normalization']['comparisons'].update({'adjacent-choice':0}),
                       lambda b:b['normalization']['checks'][1]['cursor'].update(lastAppendedUnitId=True),
                       lambda b:b['normalization']['episodes'].append({'version':1})]:
            word=fixture();mutate(word['trace']['baseSpelling'])
            with self.assertRaises((AssertionError,KeyError,IndexError)):v.observe(word)

    def test_omitted_retained_collision_and_forged_episode_are_rejected(self):
        for mutate in [lambda b:b['normalization']['episodes'].clear(),
                       lambda b:b['normalization']['episodes'][0].update(predecessorCellId=2),
                       lambda b:b['normalization']['episodes'][0]['cursor'].update(nextEditId=1),
                       lambda b:b['normalization']['episodes'][0].update(rightUnitId=False),
                       lambda b:b['normalization']['collisions'].update({'syllable-join':0})]:
            word=fixture(('t','th'),(0,1));mutate(word['trace']['baseSpelling'])
            with self.assertRaises((AssertionError,KeyError,IndexError)):v.observe(word)

    def test_certificate_cell_phone_multiplicity_corruptions_fail(self):
        for mutate in [lambda b:b['normalizationCertificates'][0].update(phoneIds=[1,1]),
                       lambda b:b['normalizationCertificates'][0].update(inputCellIds=[1]),
                       lambda b:b['normalizationCertificates'][0].update(after=''),
                       lambda b:b['normalizationCertificates'][0]['preUnitState'].update(previousForm='forged'),
                       lambda b:b['edits'][0]['output'][0]['origin'].update(unitId=0),
                       lambda b:b['edits'][0]['output'][0]['origin'].update(offset=True),
                       lambda b:b['normalizationCertificates'].append(copy.deepcopy(b['normalizationCertificates'][0])),
                       lambda b:b['units'][1].update(sourceCellIds=[0,2])]:
            word=fixture(('t','th'),(0,1),'normalized');mutate(word['trace']['baseSpelling'])
            with self.assertRaises((AssertionError,KeyError,IndexError)):v.observe(word)

    def test_historical_capabilities_are_not_invented_and_null_semantics_are_preserved(self):
        for version in (1,2,4,True):
            word=fixture();word['trace']['baseSpelling']['version']=version
            with self.assertRaises(AssertionError):v.observe(word)
        self.assertEqual(v.replay_summary({'normalizationEpisodesUnavailableWords':1}),{'status':'unavailable','fraction':None,'emitted':None,'verified':None})
        self.assertEqual(v.morphology({'trace':{'morphology':{'realization':{'prefix':{'resolved':{'written':''}}}}}}),'prefix')

    def test_budget_incidence_is_distinct_from_episode_counts(self):
        word=fixture();m={'values':{'consonantLetters':6},'exceeded':['consonantLetters']}
        e={'scope':'base-after-word-rules','status':'infeasible','reason':'normalization-context-unavailable','before':m,'after':m,
           'visitedAssignments':0,'legalOptions':0,'changedUnits':[],'unresolvedCells':0,'refusals':{}}
        word['trace']['spellingBudgets']=[e,copy.deepcopy(e)];out=v.observe(word)
        self.assertEqual(out['normalizationContextCapRefusalEpisodes'],2);self.assertEqual(out['wordsWithNormalizationContextCapRefusal'],1)
        self.assertEqual(out['wordsWithOverBudgetEpisode'],1);self.assertEqual(out['overBudgetEpisodes'],2)
        self.assertEqual(out['wordsWithInfeasibleBudget'],1)

    def test_legacy_deletion_and_unknown_output_ownership_fail(self):
        word=fixture();generic_edit(word,0,1,'x');b=word['trace']['baseSpelling'];b['normalization']['checks'][-1]['cursor']['nextEditId']=1
        v.observe(word)
        b['edits'][0]['rule']='deduplicateAdjacentLetters'
        with self.assertRaises(AssertionError):v.observe(word)

    def test_exclusive_output_and_directory_alias_protection(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'source').mkdir();(p/'source/a').write_text('old');(p/'alias').symlink_to(p/'source',target_is_directory=True)
            with self.assertRaises(AssertionError):v.protect_output(p/'alias/new',[p/'source'])
            with self.assertRaises(AssertionError):v.protect_output(p/'source/a',[])
            with self.assertRaises(AssertionError):v.regular(p,'alias/a')
            with self.assertRaises(AssertionError):v.pinned(p/'source/a','0'*64)
            self.assertEqual((p/'source/a').read_text(),'old')

    def test_complete_archive_artifact_schedule_and_corruption_checks(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'words').mkdir();(p/'manifest.json').write_text('{}')
            protocol={'profiles':[{'id':f'p{i}','seeds':{'development':list(range(i*5,i*5+5))}} for i in range(4)]}
            pins=[]
            for profile in protocol['profiles']:
                for seed in profile['seeds']['development']:
                    name=f'words/{profile["id"]}-{seed}.jsonl.gz';data=gzip.compress(b'{}\n');(p/name).write_bytes(data)
                    pins.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
            manifest={'protocol':protocol,'artifacts':pins};self.assertEqual(len(v.archive_files(p,manifest)),20)
            (p/'extra').write_text('unexpected')
            with self.assertRaises(AssertionError):v.archive_files(p,manifest)
            (p/'extra').unlink();original=(p/pins[0]['file']).read_bytes();(p/pins[0]['file']).write_bytes(b'corrupt')
            with self.assertRaises(AssertionError):v.archive_files(p,manifest)
            (p/pins[0]['file']).write_bytes(original);manifest['artifacts'].append(copy.deepcopy(pins[0]))
            with self.assertRaises(AssertionError):v.archive_files(p,manifest)

    def test_whole_unit_cap_certificate_bijection_and_forged_claims(self):
        word=fixture(('ph','a'),(0,0));b=word['trace']['baseSpelling'];original=copy.deepcopy(b['cells'][:2])
        replacement={'unitId':0,'phoneIds':[0],'partId':0,'inputCellIds':[0,1],'before':'ph','after':'f','reading':{'kind':'single-phone'}}
        cert={'version':1,'id':0,'inputCellIds':[0,1,2],'before':'pha','after':'fa','replacements':[replacement],
              'phoneIds':[0],'contexts':[{},{}], 'choices':[{'unitId':0,'pool':'ordinary','quotaRelaxed':False},{'unitId':1,'pool':'ordinary','quotaRelaxed':False}]}
        output=[{'id':3,'text':'f','partId':0,'origin':{'kind':'licensed','unitId':0,'offset':0,'editId':0,'certificateId':0,'sourceUnitIds':[0]}}]
        b['certificates']=[cert];b['edits']=[{'id':0,'phase':'word','rule':'spellingBudget:respell','start':0,'input':original,'output':output,'before':'ph','after':'f','partId':0}]
        b['cells'][:2]=output;b['surface']='fa';word['written']['clean']='fa'
        counts=v.observe(word);self.assertEqual(counts['verifiedCertificates'],1);self.assertEqual(counts['changedPhoneIdsInCertificates'],1)
        self.assertEqual(counts['replayedPool:ordinary'],2)
        for mutate in [lambda x:x['certificates'][0].update(inputCellIds=[0,2]),
                       lambda x:x['certificates'][0].update(phoneIds=[0,0]),
                       lambda x:x['certificates'][0].update(after='wrong'),
                       lambda x:x['certificates'][0]['replacements'][0].update(phoneIds=[1]),
                       lambda x:x['edits'][0]['output'][0]['origin'].update(sourceUnitIds=[0,1])]:
            forged=copy.deepcopy(word);mutate(forged['trace']['baseSpelling'])
            with self.assertRaises((AssertionError,KeyError,IndexError)):v.observe(forged)

    def test_stream_coordinates_boolean_alias_missing_duplicate_and_extra_rows(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'rows.gz'
            rows=[{'profile':'fixture','seed':1,'drawIndex':i,'word':{}} for i in range(2)]
            def save(values, suffix='\n'):path.write_bytes(gzip.compress(('\n'.join(json.dumps(x) for x in values)+suffix).encode()))
            save(rows);self.assertEqual(len(list(v.read_stream(path,'fixture',1,2))),2)
            cases=[rows[:1],rows+[rows[0]],list(reversed(rows)),[rows[0],rows[0]],
                   [dict(rows[0],seed=True),rows[1]],[dict(rows[0],drawIndex=False),rows[1]]]
            for values in cases:
                save(values)
                with self.assertRaises(AssertionError):list(v.read_stream(path,'fixture',1,2))
            save(rows,'')
            with self.assertRaises(AssertionError):list(v.read_stream(path,'fixture',1,2))

    def test_non_normalization_partial_th_and_cap_attribution_are_counted(self):
        word=fixture(('th','a'),(0,0));generic_edit(word,0,1,'',phase='word');word['trace']['baseSpelling']['edits'][0]['rule']='repairConsonantLetters'
        counts=v.observe(word)
        self.assertEqual(counts['partialThUnits'],1);self.assertEqual(counts['capPartialThUnits'],1)
        self.assertEqual(counts['dedupAttributedPartialThUnits'],0);self.assertEqual(counts['capWords'],1)
        self.assertEqual(counts['partialThRule:repairConsonantLetters'],1)

    def test_contract_source_pins_require_all_reviewed_files_and_exact_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);records=[]
            for name in v.CONTRACT_FILES:
                file=root/name;file.parent.mkdir(parents=True,exist_ok=True);data=name.encode();file.write_bytes(data)
                records.append({'path':name,'sha256':hashlib.sha256(data).hexdigest()})
            tool={'observedContracts':records};v.check_contracts(tool,root)
            omitted=copy.deepcopy(tool);omitted['observedContracts'].pop()
            with self.assertRaises(AssertionError):v.check_contracts(omitted,root)
            (root/v.CONTRACT_FILES[0]).write_text('changed')
            with self.assertRaises(AssertionError):v.check_contracts(tool,root)

    def test_optimized_python_is_not_a_verifier(self):
        r=subprocess.run([sys.executable,'-O',str(PATH)],capture_output=True,text=True)
        self.assertNotEqual(r.returncode,0);self.assertIn('assertions enabled',r.stderr)


if __name__=='__main__':unittest.main()
