"""Reproducible validation; outputs stay outside either baseline checkout."""
from pathlib import Path
import subprocess,os,json,shutil,tempfile,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
OUT=Path(os.environ.get('A3_ARTIFACTS','/tmp/hospital-a3-v04-artifacts'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
def run(name,args,env=None):
 p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True,env=env)
 (OUT/(name+'.log')).write_text(p.stdout+p.stderr)
 results.append({'check':name,'status':'PASS' if p.returncode==0 else 'FAIL','exit':p.returncode})
 print(json.dumps(results[-1]),flush=True)
run('node',['node','--test',*map(str,sorted((ROOT/'tests').glob('*.test.js')))])
for mode in ['http','standalone']:
 for script in ['browser_smoke.py','v03_features.py','v03_full_case.py','pdf_export_smoke.py']:
  env=os.environ.copy();env['A3_MODE']=mode;env['A3_ARTIFACTS']=str(OUT/mode)
  run(mode+'-'+script,['python3','-u','tests/'+script],env)
run('http-safety',['python3','-u','tests/http_regression.py'])
run('a2-current-http',['python3','-u','tests/a2_http.py'])
run('visual-comparison',['python3','-u','tests/visual_compare.py'])
# All baseline paths, including tests, documentation and binaries, stay untouched.
manifest=json.loads((REPO/'docs/hospital-refactor/baseline-sha256.json').read_text())
for label,folder in [('a2-v0.5','hospital-a2'),('a3-v0.3','hospital-a3')]:
 base=ROOT.parent/folder
 actual={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(base.rglob('*')) if p.is_file()}
 results.append({'check':label+'-hashes','status':'PASS' if actual==manifest['files'][label] else 'FAIL'})
for folder in ['hospital-a2','hospital-a3','hospital-a3-v04']:
 base=ROOT.parent/folder
 with tempfile.TemporaryDirectory(prefix='hospital-build-') as tmp:
  for name in ['build_standalone.py','index.html','styles.css',*[p.name for p in base.glob('*.js')]]:shutil.copy2(base/name,Path(tmp)/name)
  p=subprocess.run(['python3','build_standalone.py'],cwd=tmp,capture_output=True,text=True)
  same=p.returncode==0 and (Path(tmp)/'preview.html').read_bytes()==(base/'preview.html').read_bytes()
  results.append({'check':folder+'-standalone-build','status':'PASS' if same else 'FAIL'})
(OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
sys.exit(0 if all(r['status']=='PASS' for r in results) else 1)
