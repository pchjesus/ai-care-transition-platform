"""Same-browser comparisons of untouched v1.2 and v1.3 source entries."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import functools,os,json
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('PATIENT_ARTIFACTS','/tmp/patient-v13-artifacts'))/'visual';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
results=[]
def nav(page,screen):
 if page.locator('.side').is_visible():page.locator(f'.side [data-nav="{screen}"]').click()
 elif screen=='profile':page.locator('.top-profile').click()
 else:page.locator(f'.bottom-nav [data-nav="{screen}"]').click()
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [320,390,768,1024,1440]:
   for screen in ['login','today','schedule','help','profile','detail','quiz','large-today','large-profile','pdf','save-modal']:
    images=[]
    for folder in ['patient-v12','patient-v13']:
     ctx=b.new_context(viewport={'width':width,'height':930},device_scale_factor=1,timezone_id='Asia/Seoul')
     page=ctx.new_page();entry='index.html' if folder=='patient-v12' else 'index.source.html'
     page.goto(f'http://127.0.0.1:{server.server_port}/{folder}/{entry}')
     if screen!='login':
      page.locator('#demo-code').fill('CARE2026');page.locator('#demo-code').press('Enter')
      if screen in ['schedule','help','profile']:nav(page,screen)
      if screen=='large-today':page.locator('.top-font').click()
      if screen=='large-profile':nav(page,'profile');page.locator('.top-font').click()
      if screen in ['detail','quiz','pdf']:
       page.locator('[data-detail="mobility"]').first.click()
       if screen=='quiz':page.locator('[data-action="quiz-start"]').click()
       if screen=='pdf':page.locator('[data-action="pdf-open"]').click()
      if screen=='save-modal':
       nav(page,'profile');page.locator('[data-action="edit-start"]').click();page.locator('#address').fill('서울시 가상구 비교주소 17 (가상)');page.locator('#profile-form button[type="submit"]').click()
     page.evaluate('document.fonts.ready');page.wait_for_timeout(40)
     path=OUT/f'{folder}-{screen}-{width}.png';page.screenshot(path=str(path),full_page=True,animations='disabled',caret='hide');images.append(path)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(folder,screen,width)
     ctx.close()
    first,second=[Image.open(p).convert('RGB') for p in images]
    same=first.size==second.size and ImageChops.difference(first,second).getbbox() is None
    result={'width':width,'screen':screen,'identical':same};results.append(result);print(json.dumps(result),flush=True)
    if not same and first.size==second.size:ImageChops.difference(first,second).save(OUT/f'diff-{screen}-{width}.png')
  b.close()
finally:server.shutdown();server.server_close()
(OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
assert all(r['identical'] for r in results),'Inspect reported visual differences'
