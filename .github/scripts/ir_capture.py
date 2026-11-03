from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import time
import urllib.request
out=Path('/tmp/ir-screenshots');out.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:8765/prototypes/integrated-v10/'
log=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
 for name,suffix in [
  ('A1-patients','a3/index.html?screen=patients&patient=SYN-002'),
  ('A2-assessment','a3/index.html?screen=assessment&patient=SYN-002'),
  ('A3-plan','a3/index.html?screen=plan&patient=SYN-002')
 ]:
  page=context.new_page()
  problems=[]
  page.on('pageerror',lambda e:problems.append(str(e)))
  page.goto(base+suffix,wait_until='networkidle')
  page.wait_for_timeout(350)
  if page.locator('#patient-select').count()!=1:raise AssertionError('Patient selector missing: '+name)
  page.screenshot(path=str(out/(name+'.png')),full_page=False)
  log.append({'screen':name,'url':suffix,'jsErrors':problems,'width':1440,'height':900})
  page.close()
 # An existing synthetic patient starts with a safely published v1.0 snapshot.
 page=context.new_page()
 page.goto(base+'a3/index.html?screen=plan&patient=SYN-004',wait_until='networkidle')
 page.wait_for_timeout(350)
 page.close()
 mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 # Copy only synthetic local state from hospital to a separate viewport.
 storage=context.new_page()
 storage.goto(base+'a3/index.html?screen=plan&patient=SYN-004',wait_until='networkidle')
 records=storage.evaluate('() => Object.fromEntries(Object.entries(localStorage))')
 storage.close()
 login=mobile.new_page()
 login.goto(base+'patient/index.html?patient=SYN-004&encounter=ENC-SYN-004-DEMO',wait_until='networkidle')
 login.evaluate('(items) => { for(const [k,v] of Object.entries(items)) localStorage.setItem(k,v); }',records)
 login.reload(wait_until='networkidle')
 code=login.locator('#demo-code')
 if code.count():
  code.fill('CARE2026')
  login.locator('#demo-login button[type="submit"]').click()
  login.wait_for_timeout(350)
 log.append({'screen':'B-patient-home','url':'patient/index.html?patient=SYN-004&encounter=ENC-SYN-004-DEMO','width':390,'height':844,'preview':login.locator('body').inner_text()[:600]})
 login.screenshot(path=str(out/'B-patient-home.png'),full_page=False)
 browser.close()
(out/'CAPTURE_INFO.json').write_text(json.dumps(log,ensure_ascii=False,indent=2),encoding='utf-8')
