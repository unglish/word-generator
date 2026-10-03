import copy
import unittest
from category_recount import eligible_paths, enumerate_paths, recount

class CategoryReconstructionTests(unittest.TestCase):
    def setUp(self):
        self.model=dict(stems=[dict(id='noun',weight=2),dict(id='verb',weight=3),dict(id='adjective',weight=5)],order='suffix-then-prefix',senses=[
            dict(id='negative',affix=dict(type='prefix',index=0),weight=7,transitions=[dict(input='adjective',output='adjective')]),
            dict(id='reversal',affix=dict(type='prefix',index=0),weight=11,transitions=[dict(input='verb',output='verb')]),
            dict(id='nominal',affix=dict(type='suffix',index=0),weight=13,transitions=[dict(input='adjective',output='noun')]),
            dict(id='adjectival',affix=dict(type='suffix',index=1),weight=17,transitions=[dict(input='verb',output='adjective')])])
        self.morphology=dict(enabled=True,categories=self.model,prefixes=[dict(written='un',frequency=18,syllableCount=1)],
                            suffixes=[dict(written='ness',frequency=13,syllableCount=1),dict(written='able',frequency=17,syllableCount=1)])
    def test_hand_counted_order_and_mass(self):
        paths=enumerate_paths(self.model,'both',self.morphology)
        self.assertEqual(len(paths),1)
        self.assertEqual(paths[0]['weight'],357)
        self.assertEqual([step['sense'] for step in paths[0]['steps']],['adjectival','negative'])
    def test_projected_path_recomputed_from_original_stem(self):
        paths,excluded=eligible_paths(self.model,'both',self.morphology,1)
        self.assertEqual(excluded,0)
        self.assertEqual(paths[0]['template'],'suffixed')
        self.assertEqual(paths[0]['retained']['steps'],[dict(sense='adjectival',input='verb',output='adjective')])
        self.assertNotIn('prefixSense',paths[0]['retained'])
    def test_prefix_first_incompatible_projection_excluded(self):
        self.model['order']='prefix-then-suffix'
        self.model['senses'][0]['transitions']=[dict(input='noun',output='adjective')]
        paths,excluded=eligible_paths(self.model,'both',self.morphology,1)
        self.assertEqual(excluded,1)
        self.assertEqual(len(paths),1)
        self.assertEqual(paths[0]['retained']['stem'],'verb')
    def test_trace_corruption_detected(self):
        paths,excluded=eligible_paths(self.model,'both',self.morphology)
        path=paths[0]
        decision=dict(requestedTemplate='both',eligiblePaths=1,excludedProjections=excluded,totalWeight=357,planned=path['planned'],retained=path['retained'])
        trace={key:path[key] for key in ('template','prefix','suffix','syllableReduction')}
        trace['categories']=decision
        word=dict(trace=dict(morphology=trace))
        pools={'both':(paths,excluded)}
        counts=recount(word,{'morphology':self.morphology},{},pools)
        self.assertEqual(counts['category/assigned'],1)
        changed=copy.deepcopy(word);changed['trace']['morphology']['categories']['retained']['final']='noun'
        with self.assertRaises(AssertionError):recount(changed,{'morphology':self.morphology},{},pools)
        changed=copy.deepcopy(word);changed['trace']['morphology']['categories']['totalWeight']=358
        with self.assertRaises(AssertionError):recount(changed,{'morphology':self.morphology},{},pools)
    def test_disabled_morphology_has_no_category_assignment(self):
        counts=recount({'trace':{}},{'morphology':self.morphology},{'morphology':False},{})
        self.assertEqual(counts['category/unassigned'],1)

if __name__=='__main__':unittest.main()
