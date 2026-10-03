"""Source accounting only: no target fitting or held-out evaluation."""
import collections
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

BASE = Path('/private/tmp')
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def pin(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def text_rows(name):
    with zipfile.ZipFile(BASE / name) as archive:
        assert len(archive.namelist()) == 1
        data = archive.read(archive.namelist()[0])
    # Preserve every byte; only ASCII spellings are interpreted for joining.
    text = data.decode('latin1')
    assert text.encode('latin1') == data
    return list(csv.DictReader(io.StringIO(text), delimiter='\t'))

def workbook_rows():
    with zipfile.ZipFile(BASE / 'q19-subtlexus-pos.xlsx') as archive:
        strings = [''.join(t.text or '' for t in item.findall('.//s:t', NS))
                   for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rows = ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//s:row', NS)
    values = []
    for row in rows:
        cells = {}
        for cell in row.findall('s:c', NS):
            value = cell.find('s:v', NS)
            if value is None:
                continue
            column = re.sub(r'\d+$', '', cell.attrib['r'])
            assert cell.find('s:f', NS) is None or column in {'F', 'G', 'H', 'I', 'L', 'O'}, 'Input count is a formula'
            cells[re.sub(r'\d+$', '', cell.attrib['r'])] = strings[int(value.text)] if cell.get('t') == 's' else value.text
        values.append(cells)
    header, *body = values
    assert [header.get(chr(65 + i)) for i in range(15)] == [
        'Word', 'FREQcount', 'CDcount', 'FREQlow', 'Cdlow', 'SUBTLWF', 'Lg10WF',
        'SUBTLCD', 'Lg10CD', 'Dom_PoS_SUBTLEX', 'Freq_dom_PoS_SUBTLEX',
        'Percentage_dom_PoS', 'All_PoS_SUBTLEX', 'All_freqs_SUBTLEX', 'Zipf-value']
    return [{header[key]: value for key, value in row.items()} for row in body]

def compatible_cmu():
    vowels = set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
    consonants = set('B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH'.split())
    selected = {}
    for line in (BASE / 'q17-cmudict-74790861.dict').read_text().splitlines():
        if not line.strip() or line.lstrip().startswith(';;;'):
            continue
        label, *phones = re.split(r'\s+', re.split(r'\s+#', line.strip())[0])
        spelling = label.lower()
        if not re.fullmatch('[a-z]+', spelling) or spelling in selected or not phones:
            continue
        if any(p not in consonants and not (re.fullmatch('[A-Z]+[012]', p) and p[:-1] in vowels) for p in phones):
            continue
        if not any(p[:-1] in vowels and p[-1:] in '012' for p in phones):
            continue
        selected[spelling] = phones
    assert len(selected) == 117485
    return selected

def account(rows, cmu):
    seen = set()
    total = joined = missing = 0
    joined_types = 0
    identity = []
    for row in rows:
        spelling = row['Word'].lower()
        assert re.fullmatch('[a-z]+', spelling) and spelling not in seen
        seen.add(spelling)
        count = int(row['FREQcount'])
        assert count > 0 and 0 <= int(row['FREQlow']) <= count
        total += count
        if spelling in cmu:
            joined += count
            joined_types += 1
            identity.append([spelling, count, cmu[spelling]])
        else:
            missing += count
    assert joined + missing == total
    digest = hashlib.sha256(json.dumps(identity, separators=(',', ':')).encode()).hexdigest()
    return {'types': len(rows), 'tokens': total, 'joinedTypes': joined_types,
            'orderedJoinedSpellingCountPhoneDigest': digest,
            'joinedTokens': joined, 'missingTypes': len(rows) - joined_types, 'missingTokens': missing}

def main():
    cmu = compatible_cmu()
    text = text_rows('q19-subtlexus2.zip')
    raw = text_rows('q19-subtlexus5.zip')
    pos = workbook_rows()
    assert len(text) == len(pos) == 74286 and len(raw) == 282170
    reference = {r['Word'].lower(): r for r in text}
    mismatches = collections.Counter()
    tags = collections.Counter()
    tag_totals = collections.Counter()
    missing_pos = greater = smaller = 0
    delta = 0
    for row in pos:
        prior = reference[row['Word'].lower()]
        for key in ['FREQcount', 'CDcount', 'FREQlow', 'Cdlow']:
            if int(row[key]) != int(prior[key]):
                mismatches[key] += 1
        labels = row.get('All_PoS_SUBTLEX', '').split('.')
        counts = row.get('All_freqs_SUBTLEX', '').split('.')
        if not all(re.fullmatch(r'\d+', n) for n in counts):
            missing_pos += 1
            continue
        assert len(labels) == len(counts) and len(set(labels)) == len(labels)
        mass = sum(map(int, counts))
        word_mass = int(row['FREQcount'])
        greater += mass > word_mass
        smaller += mass < word_mass
        delta += word_mass - mass
        for label, count in zip(labels, counts):
            assert label
            tags[label] += 1
            tag_totals[label] += int(count)
    output = {
        'scope': 'Authenticated source/coverage audit; no target fitting, generator change or human preference measurement.',
        'files': {name: pin(BASE / name) for name in [
            'q19-subtlexus2.zip', 'q19-subtlexus5.zip', 'q19-subtlexus-pos.xlsx',
            'q19-subtlexus-license.txt', 'q17-cmudict-74790861.dict']},
        'originalFrequencyTable': account(text, cmu), 'posFrequencyTable': account(pos, cmu),
        'orderedSelectedCmuDigest': hashlib.sha256(json.dumps(list(cmu.items()), separators=(',', ':')).encode()).hexdigest(),
        'rawLetterStringTokens': sum(int(r['FREQcount']) for r in raw),
        'textVsPosIntegerMismatches': dict(mismatches),
        'pos': {'missingOrNonintegerRows': missing_pos, 'massGreaterThanWordCountRows': greater,
                'massLessThanWordCountRows': smaller, 'wordMinusTaggedTokenMass': delta,
                'typesPerTag': dict(sorted(tags.items())), 'tokensPerTag': dict(sorted(tag_totals.items()))},
        'license': (BASE / 'q19-subtlexus-license.txt').read_text(),
        'textProjection': 'Latin1 byte-preserving projection for old text; selected spelling policy is ASCII letters only.',
    }
    destination = Path(__file__).with_name('source-accounting.json')
    destination.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps(output, indent=2))

if __name__ == '__main__':
    main()
