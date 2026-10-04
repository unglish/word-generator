"""Run unchanged historical tools with a declared exact-file location map."""
import argparse,hashlib,importlib.util,json,pathlib,runpy,sys
parser=argparse.ArgumentParser();parser.add_argument('registration');parser.add_argument('script');parser.add_argument('receipt');args=parser.parse_args()
OriginalPath=pathlib.Path;config=json.loads(OriginalPath(args.registration).read_text());locations=config['locations'];pins={}
for old,new in locations.items():
 p=OriginalPath(new)
 if p.exists():pins[old]={'path':new,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
original_init=OriginalPath.__init__
def located_init(self,*parts):
 if parts and str(parts[0]) in locations:parts=(locations[str(parts[0])],*parts[1:])
 original_init(self,*parts)
OriginalPath.__init__=located_init
original_spec=importlib.util.spec_from_file_location
def located_spec(name,location,*extra,**kwargs):return original_spec(name,locations.get(str(location),location),*extra,**kwargs)
importlib.util.spec_from_file_location=located_spec
script=OriginalPath(args.script);script_pin=hashlib.sha256(script.read_bytes()).hexdigest();receipt=args.receipt;sys.argv=[str(script)]
try:
 runpy.run_path(str(script),run_name='__main__')
except SystemExit as error:
 if error.code not in (None,0):raise
for old,pin in pins.items():
 p=OriginalPath(pin['path']);assert {'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}==pin,old
assert hashlib.sha256(script.read_bytes()).hexdigest()==script_pin
with OriginalPath(receipt).open('x') as f:json.dump({'scriptSha256':script_pin,'allInitialMappedInputsUnchanged':True,'locations':locations,'initialPins':pins,'scope':'Exact declared file-location substitution only; original operator bytes/code/inputs/mathematics/samples/tolerances/gates unchanged.'},f,indent=2);f.write('\n')
