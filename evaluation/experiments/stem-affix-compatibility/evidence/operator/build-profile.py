import json
from pathlib import Path

prefixes = ['un','re','dis','pre','over','out','mis','in']
suffixes = ['ing','tion','sion','ly','ed','ness','er','est','ment','able','ful','less','ous','ive','al','ity','s','ist','ize','ism','ary','ory','ery','ian','ial']
contracts = {
 'un': [('negative', [('adjective','adjective')]), ('reversal',[('verb','verb')])],
 're': [('repetition',[('verb','verb'),('noun','noun')])],
 'dis': [('opposition',[('verb','verb'),('noun','noun'),('adjective','adjective')])],
 'pre': [('anterior',[('noun','noun'),('verb','verb'),('adjective','adjective')])],
 'over': [('excess',[('verb','verb'),('noun','noun'),('adjective','adjective')])],
 'out': [('verbal',[('verb','verb')]),('external',[('noun','noun')])],
 'mis': [('incorrect',[('verb','verb'),('noun','noun')])],
 'in': [('negative',[('noun','noun'),('adjective','adjective')])],
 'ing': [('verbal',[('verb','verb')]),('nominal',[('verb','noun')])],
 'tion': [('nominal',[('verb','noun')])], 'sion': [('nominal',[('verb','noun')])],
 'ly': [('adverbial',[('adjective','adverb')]),('adjectival',[('noun','adjective')])],
 'ed': [('verbal',[('verb','verb')]),('participial',[('verb','adjective')])],
 'ness': [('nominal',[('adjective','noun')])],
 'er': [('agent',[('verb','noun')]),('inhabitant',[('noun','noun')]),('comparative',[('adjective','adjective')])],
 'est': [('superlative',[('adjective','adjective')])],
 'ment': [('nominal',[('verb','noun')])], 'able': [('adjectival',[('verb','adjective')])],
 'ful': [('adjectival',[('noun','adjective')]),('quantity',[('noun','noun')])],
 'less': [('adjectival',[('noun','adjective')])], 'ous': [('adjectival',[('noun','adjective')])],
 'ive': [('adjectival',[('verb','adjective'),('noun','adjective')])],
 'al': [('adjectival',[('noun','adjective')]),('nominal',[('verb','noun')])],
 'ity': [('nominal',[('adjective','noun')])],
 's': [('plural',[('noun','noun')]),('verbal',[('verb','verb')])],
 'ist': [('nominal',[('noun','noun'),('adjective','noun')])],
 'ize': [('verbal',[('noun','verb'),('adjective','verb')])],
 'ism': [('nominal',[('noun','noun'),('adjective','noun')])],
 'ary': [('adjectival',[('noun','adjective')]),('nominal',[('noun','noun')])],
 'ory': [('adjectival',[('verb','adjective'),('noun','adjective')])],
 'ery': [('nominal',[('noun','noun'),('verb','noun'),('adjective','noun')])],
 'ian': [('nominal',[('noun','noun')]),('adjectival',[('noun','adjective')])],
 'ial': [('adjectival',[('noun','adjective')])],
}
senses=[]
for role, pool in [('prefix',prefixes),('suffix',suffixes)]:
 for index, written in enumerate(pool):
  for name, pairs in contracts[written]:
   senses.append(dict(id=f'{role}/{written}/{name}', affix=dict(type=role,index=index),weight=1,
                      transitions=[dict(input=left,output=right) for left,right in pairs]))
profile=dict(version='q18-experimental-category-profile-draft-v1',
             inventory=dict(prefixes=prefixes,suffixes=suffixes),
             model=dict(stems=[dict(id=category,weight=1) for category in ['noun','verb','adjective','adverb']],
                        order='suffix-then-prefix',senses=senses),
             assumptions=['Authored coarse lexical-category model; not a corpus-derived grammar.',
                          'Uniform stem weights and equal sense shares are experimental assumptions, not estimated frequencies.',
                          'Inflectional features, semantics, stem phonology and productivity are not proven by category legality.',
                          'The full configured inventory is covered. Individual lexical exceptions are not exhaustively modeled.',
                          'Construction order is declared; written order alone is not evidence for morphological bracketing.',
                          'Draft requires linguistic/table review and path enumeration before preregistration and generator integration.'])
Path(__file__).with_name('experimental-profile-draft.json').write_text(json.dumps(profile,indent=2)+'\n')
print(json.dumps(dict(affixes=len(prefixes)+len(suffixes),senses=len(senses),transitions=sum(len(s['transitions']) for s in senses))))
