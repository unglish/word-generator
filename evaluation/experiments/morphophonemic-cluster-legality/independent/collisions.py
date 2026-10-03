"""Reconstruct transformation-created equality; do not equate it with spelling doubling."""
from collections import Counter
import json
import lineage_recount

def morphology_collisions(word):
    counts = Counter({'morphologyCensus/words': 1})
    trace = word['trace']
    morphology = trace.get('morphology')
    ledger = ((morphology or {}).get('realization') or {}).get('phoneAssembly')
    if ledger is None:
        counts['morphologyCensus/noAssemblyEvidence'] += 1
        return counts, []
    stages = [stage for stage in trace['stages'] if stage['name'] == 'assembleMorphology']
    assert len(stages) == 1
    syllables = [{segment: [{'sound': sound} for sound in syllable[segment]]
                  for segment in lineage_recount.SEGMENTS} for syllable in stages[0]['after']]
    lineage_recount.replay_phones(ledger, syllables)
    counts['morphologyCensus/assemblyEvidence'] += 1
    initial = {phone['id']: phone for phone in ledger['initial']}
    ordered = ledger['final']
    position = {phone['id']: index for index, phone in enumerate(ordered)}
    sounds = {identity: phone['initialSound'] for identity, phone in initial.items()}
    events = []
    for change in ledger['changes']:
        identity = change['id']
        assert sounds[identity] == change['before']
        before = sounds[identity]
        sounds[identity] = change['after']
        if not change['rule'].startswith('morphophonemic:'):
            continue
        rule = change['rule'].split(':', 3)[-1]
        counts['morphologyCensus/applied/' + rule] += 1
        for neighbor_index in [position[identity] - 1, position[identity] + 1]:
            if not 0 <= neighbor_index < len(ordered):
                continue
            neighbor = ordered[neighbor_index]
            if sounds[neighbor['id']] != change['after']:
                continue
            left, right = sorted([ordered[position[identity]], neighbor], key=lambda p: position[p['id']])
            left_source, right_source = initial[left['id']]['source'], initial[right['id']]['source']
            parts = [source.get('part', source['kind']) for source in [left_source, right_source]]
            same_syllable = left['syllable'] == right['syllable']
            same_segment = same_syllable and left['segment'] == right['segment']
            created = before != sounds[neighbor['id']]
            event = dict(rule=rule, changedId=identity, leftId=left['id'], rightId=right['id'],
                         sound=change['after'], before=before, created=created,
                         parts=parts, sameSyllable=same_syllable, sameSegment=same_segment,
                         segments=[left['segment'], right['segment']],
                         leftSource=left_source, rightSource=right_source)
            key = json.dumps([rule, created, parts, same_syllable, same_segment, event['segments']], separators=(',', ':'))
            counts['morphologyCensus/equality/' + key] += 1
            counts['morphologyCensus/createdEquality' if created else 'morphologyCensus/preexistingEquality'] += 1
            events.append(event)
    return counts, events
