"""Lossless literal POS/count extraction from the pinned official workbook."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
WORKBOOK_SHA = '3a8cb93a4e28988c2ce722a63f6b8d394acdc42ebe2ab6e1f0e484ee0d4167a7'
LICENSE_SHA = '1c96df5fcc840ebf7e2147ea7f13820fcda223ef78eb55cb505972dfed43248b'

def pin(data):
    return dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())

def extract(workbook, license_bytes):
    assert pin(workbook)['sha256'] == WORKBOOK_SHA
    assert pin(license_bytes)['sha256'] == LICENSE_SHA
    import io
    with zipfile.ZipFile(io.BytesIO(workbook)) as archive:
        strings = [''.join(node.text or '' for node in item.findall('.//s:t', NS))
                   for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rows = ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//s:row', NS)
    assert len(rows) == 74287
    result = []
    seen = set()
    for index, row in enumerate(rows):
        cells = {}
        for cell in row.findall('s:c', NS):
            column = re.sub(r'\d+$', '', cell.attrib['r'])
            if column not in {'A', 'B', 'D', 'M', 'N'}:
                continue
            assert cell.find('s:f', NS) is None, 'Literal input cell unexpectedly contains a formula'
            value = cell.find('s:v', NS)
            if value is not None:
                cells[column] = strings[int(value.text)] if cell.get('t') == 's' else value.text
        if index == 0:
            assert cells == dict(A='Word', B='FREQcount', D='FREQlow', M='All_PoS_SUBTLEX', N='All_freqs_SUBTLEX')
            continue
        label = cells['A']
        spelling = label.lower()
        assert re.fullmatch('[a-z]+', spelling) and spelling not in seen
        seen.add(spelling)
        for column in ['B', 'D']:
            assert re.fullmatch(r'\d+', cells[column])
        count, lower = int(cells['B']), int(cells['D'])
        assert 0 < count <= 9007199254740991 and 0 <= lower <= count
        result.append(dict(line=index+1, label=label, spelling=spelling, count=count, lowercaseCount=lower,
                           rawPosTags=cells.get('M'), rawPosCounts=cells.get('N')))
    return dict(version='subtlex-pos-literal-export-v1', source=pin(workbook),
                license=dict(**pin(license_bytes), text=license_bytes.decode('utf8')), rows=result)

if __name__ == '__main__':
    if not __debug__:
        raise RuntimeError('Source extraction requires assertion checks; do not use -O')
    parser = argparse.ArgumentParser()
    parser.add_argument('workbook', type=Path)
    parser.add_argument('license', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    workbook, license_bytes = args.workbook.read_bytes(), args.license.read_bytes()
    result = extract(workbook, license_bytes)
    assert args.workbook.read_bytes() == workbook and args.license.read_bytes() == license_bytes
    result['implementation'] = dict(script=pin(Path(__file__).read_bytes()),
                                    python=platform.python_version(), executable=pin(Path(sys.executable).read_bytes()))
    with args.output.open('x') as stream:
        json.dump(result, stream, separators=(',', ':'))
        stream.write('\n')
    print(json.dumps(dict(passed=True, rows=len(result['rows']), output=pin(args.output.read_bytes()))))
