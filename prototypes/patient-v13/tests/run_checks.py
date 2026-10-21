"""Run patient v1.3 checks without writing into the v1.2 baseline."""
from pathlib import Path
import subprocess,tempfile,shutil,json,hashlib,os,sys
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
OUT=Path(os.environ.get('PATIENT_ARTIFACTS','/tmp/patient-v13-artifacts'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
def run(name,args,extra=None,allow_blocked=False):
 env=os.environ.copy();env.update(extra or {});env['PATIENT_ARTIFACTS']=str(OUT/name)
 p=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True)
 (OUT/(name+'.log')).write_text(p.stdout+p.stderr)
 status='PASS' if p.returncode==0 else 'NOT RUN' if allow_blocked and 'ERR_BLOCKED_BY_ADMINISTRATOR' in p.stderr else 'FAIL'
 results.append({'check':name,'status':status,'exit':p.returncode});print(json.dumps(results[-1]),flush=True)
run('node',['node','--test',*map(str,sorted((ROOT/'tests').glob('*.test.js')))])
for mode in ['source','http','injection','file']:
 run(mode+'-legacy',['python3','-u','test_v12.py'],{'PATIENT_MODE':mode},allow_blocked=mode=='file')
for entry in ['index.source.html','index.html']:
 run(entry+'-safety',['python3','-u','tests/http_regression.py'],{'PATIENT_ENTRY':entry})
run('visual',['python3','-u','tests/visual_compare.py'])
manifest=json.loads((REPO/'docs/patient-v1.3/baseline-sha256.json').read_text())
base=ROOT.parent/'patient-v12'
actual={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(base.rglob('*')) if p.is_file()}
results.append({'check':'v12-original-hashes','status':'PASS' if actual==manifest['files'] else 'FAIL'})
for folder in ['patient-v12','patient-v13']:
 base=ROOT.parent/folder
 with tempfile.TemporaryDirectory(prefix='patient-build-') as tmp:
  for p in base.iterdir():
   if p.is_file() and p.suffix in ['.py','.js','.css','.html']:shutil.copy2(p,Path(tmp)/p.name)
  p=subprocess.run(['python3','build_standalone.py'],cwd=tmp,capture_output=True,text=True)
  same=p.returncode==0 and all((Path(tmp)/n).read_bytes()==(base/n).read_bytes() for n in ['index.html','preview.html'])
  results.append({'check':folder+'-standalone-build','status':'PASS' if same else 'FAIL'})
# Hospital source must match the starting main exactly.
p=subprocess.run(['git','diff','--exit-code',manifest['main'],'--','prototypes/hospital-a2'],cwd=REPO,capture_output=True,text=True)
results.append({'check':'hospital-a2-unchanged','status':'PASS' if p.returncode==0 else 'FAIL'})
(OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
sys.exit(1 if any(r['status']=='FAIL' for r in results) else 0)
