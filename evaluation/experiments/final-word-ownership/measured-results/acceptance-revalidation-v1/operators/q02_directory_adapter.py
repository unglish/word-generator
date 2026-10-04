"""Run the unchanged historical comparer with one registered directory relocation."""
import argparse,hashlib,json,pathlib,runpy,sys
parser=argparse.ArgumentParser();parser.add_argument('registration');parser.add_argument('script');parser.add_argument('receipt');args=parser.parse_args()
OriginalPath=pathlib.Path;registration=json.loads(OriginalPath(args.registration).read_text());locations=registration['locations'];pins={}
for value in [*locations.values(),*registration['additionalBoundInputs']]:
 path=OriginalPath(value);assert path.exists() and not path.is_symlink()
 files=sorted(path.rglob('*')) if path.is_dir() else [path]
 for file in files:
  assert not file.is_symlink()
  if file.is_file():pins[str(file)]={'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
original_init=OriginalPath.__init__
def located_init(self,*parts):
 if parts and str(parts[0]) in locations:parts=(locations[str(parts[0])],*parts[1:])
 original_init(self,*parts)
OriginalPath.__init__=located_init
script=OriginalPath(args.script);script_pin=hashlib.sha256(script.read_bytes()).hexdigest();receipt=args.receipt;sys.argv=[str(script)]
runpy.run_path(str(script),run_name='__main__')
for value,pin in pins.items():
 path=OriginalPath(value);assert {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}==pin,value
assert hashlib.sha256(script.read_bytes()).hexdigest()==script_pin
with OriginalPath(receipt).open('x') as handle:json.dump({'scriptSha256':script_pin,'allInitialMappedInputsUnchanged':True,'locations':locations,'initialPins':pins,'scope':'Only registereddirectory constructorlocation changes; originalcomparer bytes/mathematics/guards/fullcounts/inputs unchanged. All initialdirectoryfiles and additionalcontrolreport are authenticated before/after; createdoutput remainsdistinct.'},handle,indent=2);handle.write('\n')
