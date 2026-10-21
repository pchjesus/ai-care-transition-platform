"""Compare approved v0.3 and v0.4 candidate screenshots with frozen fixture time."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import functools,json,os
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('A3_ARTIFACTS','/tmp/hospital-a3-v04-artifacts'))/'visual';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [320,390,800,801,1024,1440]:
   for screen in ['plan','assessment','learn','practice']:
    paths=[]
    for folder in ['hospital-a3','hospital-a3-v04']:
     context=b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,timezone_id='Asia/Seoul')
     context.add_init_script("""{const RealDate=Date;class FixedDate extends RealDate{constructor(...a){super(...(a.length?a:['2026-10-21T03:00:00Z']));}static now(){return 1792551600000;}}window.Date=FixedDate;}""")
     page=context.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/{folder}/index.html')
     if screen!='plan':page.locator('[data-nav="'+('learn' if screen=='practice' else screen)+'"]').click()
     if screen=='practice':page.locator('[data-learn-unit="practice"]').click()
     page.evaluate('document.fonts.ready');page.wait_for_timeout(60)
     path=OUT/f'{folder}-{screen}-{width}.png';page.screenshot(path=str(path),full_page=True,animations='disabled');paths.append(path)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(folder,screen,width)
     context.close()
    diff=ImageChops.difference(Image.open(paths[0]).convert('RGB'),Image.open(paths[1]).convert('RGB'))
    equal=diff.getbbox() is None
    if not equal:diff.save(OUT/f'diff-{screen}-{width}.png')
    results.append({'screen':screen,'width':width,'identical':equal})
    print(json.dumps(results[-1]),flush=True)
  b.close()
finally:server.shutdown();server.server_close()
(OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
assert all(r['identical'] for r in results),'Unexpected visual difference; inspect artifacts'
