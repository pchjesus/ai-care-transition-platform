"""Capture the same SYN-002 publication before/after without mutating source baselines."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
import argparse,functools,json,hashlib
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path,required=True);parser.add_argument('--output',type=Path,default=Path('/tmp/a3b-verification/comparison'));args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
roots=[args.baseline,Path(__file__).resolve().parents[3]];servers=[];captures=[]
try:
 for root in roots:
  server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));Thread(target=server.serve_forever,daemon=True).start();servers.append(server)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for label,server in zip(['before','after'],servers):
   for width in [390,1440]:
    ctx=browser.new_context(viewport={'width':width,'height':950});base=f'http://127.0.0.1:{server.server_port}/prototypes/integrated-v10/'
    hospital=ctx.new_page();hospital.goto(base+'a3/index.html?patient=SYN-002');hospital.locator('#request').click();hospital.locator('#actor').select_option('APPROVER');hospital.locator('#approve').click();hospital.locator('#publish').click();expect(hospital.locator('#preview-mark')).to_contain_text('발행')
    patient=ctx.new_page();patient.goto(base+'patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO');patient.locator('#demo-code').fill('CARE2026');patient.locator('#demo-code').press('Enter');expect(patient.locator('.hero-panel')).to_be_visible()
    for screen in ['today','profile']:
     # Baseline mobile omitted the profile menu. Dispatch its existing hidden desktop
     # action for the visual capture only; do not claim mobile usability before repair.
     if screen=='profile':
      if label=='before':patient.locator('.side [data-view="profile"]').evaluate('(b)=>b.click()')
      else:patient.locator('[data-view="profile"]:visible').first.click()
     patient.screenshot(path=str(args.output/f'{label}-{screen}-{width}.png'),full_page=True,animations='disabled')
     captures.append({'label':label,'width':width,'screen':screen,'overflow':patient.evaluate('document.documentElement.scrollWidth>innerWidth')})
    ctx.close()
  browser.close()
 hashes=[hashlib.sha256((root/'prototypes/integrated-v10/patient/styles.css').read_bytes()).hexdigest() for root in roots];assert hashes[0]==hashes[1];assert not any(c['overflow'] for c in captures if c['label']=='after')
 (args.output/'results.json').write_text(json.dumps({'base':'3a572fd76dcb9816deef84129c6528b0949936f6','baseStyleSHA256':hashes,'captures':captures},ensure_ascii=False,indent=2)+'\n');print('PASS: 4 before/after pairs; base B stylesheet identical; no after-page horizontal overflow')
finally:
 for server in servers:server.shutdown();server.server_close()
