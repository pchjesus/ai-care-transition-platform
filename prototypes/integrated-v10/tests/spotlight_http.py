"""Real DOM spotlight, read-only invariants and both patient surfaces via Chromium HTTP."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
import functools,unittest,json
ROOT=Path(__file__).resolve().parents[3]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
class Spotlight(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));Thread(target=cls.server.serve_forever,daemon=True).start();cls.base=f'http://127.0.0.1:{cls.server.server_port}/'
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':1440,'height':950},reduced_motion='reduce');self.page=self.ctx.new_page();self.page.set_default_timeout(6000);self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.page.on('console',lambda m:self.errors.append(m.text) if m.type=='error' else None);self.page.on('dialog',lambda d:d.accept())
 def tearDown(self):self.ctx.close();self.assertEqual(self.errors,[])
 def open(self):
  self.page.goto(self.base+'prototypes/integrated-v10/a3/index.html?screen=learn&patient=SYN-002');expect(self.page.locator('[data-learn-guided-tour]')).to_be_visible()
 def stores(self):return self.page.evaluate('JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))')
 def start(self):self.page.locator('[data-learn-guided-tour]').click();expect(self.page.locator('#patient-learning-tour')).to_be_visible()
 def next(self,n=1):
  for _ in range(n):self.page.locator('[data-tour-control="next"]').click()
 def layout(self):
  self.page.wait_for_timeout(50)
  data=self.page.evaluate('''()=>{const tip=document.querySelector('.spot-tip').getBoundingClientRect(),ring=document.querySelector('.spot-ring'),r=ring.getBoundingClientRect(),v=visualViewport;return {x:tip.x,y:tip.y,w:tip.width,h:tip.height,vx:v.offsetLeft,vy:v.offsetTop,vw:v.width,vh:v.height,hidden:ring.hidden,rx:r.x,ry:r.y,rw:r.width,rh:r.height}}''')
  self.assertGreaterEqual(data['x'],data['vx']-1);self.assertGreaterEqual(data['y'],data['vy']-1);self.assertLessEqual(data['x']+data['w'],data['vx']+data['vw']+1);self.assertLessEqual(data['y']+data['h'],data['vy']+data['vh']+1)
  if not data['hidden']:
   dx=max(0,min(data['x']+data['w'],data['rx']+data['rw'])-max(data['x'],data['rx']));dy=max(0,min(data['y']+data['h'],data['ry']+data['rh'])-max(data['y'],data['ry']));self.assertLessEqual(dx*dy,2)
 def test_all_ten_real_steps_at_four_widths_preserve_storage_context_and_route(self):
  self.open();out=Path('/tmp/spotlight-verification/screenshots');out.mkdir(parents=True,exist_ok=True)
  for width in [390,768,1024,1440]:
   self.page.set_viewport_size({'width':width,'height':950});before=self.stores();url=self.page.url;self.start()
   for step in range(1,11):
    expect(self.page.locator('#patient-learning-tour')).to_have_attribute('data-step',str(step));self.layout();expect(self.page.locator('.spot-ring')).to_be_visible();expect(self.page.locator('.tour-scene')).to_have_count(0)
    if step<=2:expect(self.page.locator('#aux-screen .patient-list')).to_be_visible()
    elif step<=4:expect(self.page.locator('#a2-domain-tabs')).to_be_visible()
    else:expect(self.page.locator('#a3-screen')).to_be_visible()
    self.assertEqual(self.stores(),before);self.assertEqual(self.page.url,url)
    if step in [1,4,6,9]:self.page.screenshot(path=str(out/f'tour-{width}-step-{step}.png'))
    if step<10:self.next()
   expect(self.page.locator('#tour-open-demo')).to_have_attribute('href','../../../patient/index.html');self.page.keyboard.press('Escape');expect(self.page.locator('[data-learn-guided-tour]')).to_be_focused();self.assertEqual(self.stores(),before)
 def test_study_mode_role_context_reentry_and_skip_are_read_only(self):
  self.open();self.page.locator('[data-learn-unit="practice"]').click();self.page.locator('[data-study-start="SYN-004"]').click();self.page.locator('#actor').select_option('PHARMACIST');self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-learn-unit="practice"]').click();before=self.stores();url=self.page.url
  for _ in range(3):
   self.start();self.next(7);self.page.locator('#actor').evaluate("e=>{e.value='APPROVER';e.dispatchEvent(new Event('change',{bubbles:true}))}");self.page.locator('#revoke').evaluate('e=>e.click()');self.assertEqual(self.stores(),before);self.next();expect(self.page.locator('#actor')).to_have_value('PHARMACIST');self.page.locator('[data-tour-control="skip"]').click();expect(self.page.locator('[data-learn-guided-tour]')).to_be_focused();self.assertEqual(self.stores(),before);self.assertEqual(self.page.url,url)
  self.start();self.next();expect(self.page.locator('#patient-learning-tour')).to_have_attribute('data-step','2');self.page.locator('[data-tour-control="previous"]').click();expect(self.page.locator('#patient-learning-tour')).to_have_attribute('data-step','1');self.page.keyboard.press('Escape')
 def test_missing_anchor_scroll_resize_and_keyboard_focus(self):
  self.open();before=self.stores();self.start();self.page.locator('#aux-screen .patient-list').evaluate('(e)=>e.remove()');self.page.wait_for_timeout(60);expect(self.page.locator('#patient-learning-tour')).to_have_attribute('data-fallback','true');expect(self.page.locator('#tour-fallback')).to_be_visible();self.next(3)
  before_scroll=self.page.evaluate('scrollY');self.page.mouse.move(2,100);self.page.mouse.wheel(0,-150);self.page.wait_for_timeout(60);self.assertNotEqual(self.page.evaluate('scrollY'),before_scroll);self.layout();self.page.set_viewport_size({'width':390,'height':650});self.layout();self.page.locator('[data-tour-control="locate"]').click();self.layout()
  self.page.locator('[data-tour-control="skip"]').focus();self.page.keyboard.press('Tab');expect(self.page.locator('[data-tour-control="close"]')).to_be_focused();self.page.keyboard.press('Shift+Tab');expect(self.page.locator('[data-tour-control="skip"]')).to_be_focused();self.page.keyboard.press('Escape');self.assertEqual(self.stores(),before)
 def test_two_hundred_percent_visual_zoom_keeps_controls_visible(self):
  self.open();self.start();session=self.ctx.new_cdp_session(self.page);session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':2});self.page.wait_for_timeout(80);self.layout()
  # CDP uses visual-viewport-relative CSS coordinates at page scale. Avoid
  # locator auto-scroll moving the fixed tooltip between measurement and click.
  for step in [2,3,4]:
   point=self.page.locator('[data-tour-control="next"]').evaluate('(e)=>{const r=e.getBoundingClientRect(),v=visualViewport;return {x:r.x+r.width/2-v.offsetLeft,y:r.y+r.height/2-v.offsetTop}}')
   for kind in ['mousePressed','mouseReleased']:session.send('Input.dispatchMouseEvent',{'type':kind,**point,'button':'left','clickCount':1})
   expect(self.page.locator('#patient-learning-tour')).to_have_attribute('data-step',str(step));self.layout()
  self.page.keyboard.press('Escape');session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1})

 def test_finish_opens_independent_example_and_restores_learning(self):
  self.open();before=self.stores();self.start();self.next(9)
  with self.page.expect_popup() as event:self.page.locator('#tour-open-demo').click()
  popup=event.value;popup.wait_for_load_state();self.assertIn('/patient/index.html',popup.url);self.assertNotIn('/integrated-v10/patient',popup.url);expect(self.page.locator('[data-learn-guided-tour]')).to_be_focused();self.assertEqual(self.stores(),before)
 def login_b(self,standalone=False):
  if standalone:self.page.goto(self.base+'patient/index.html')
  else:
   self.page.goto(self.base+'prototypes/integrated-v10/a3/index.html?screen=plan&patient=SYN-002');self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');self.page.locator('#approve').click();self.page.locator('#publish').click();expect(self.page.locator('#preview-mark')).to_contain_text('발행');self.page.goto(self.base+'prototypes/integrated-v10/patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO')
  if self.page.locator('#demo-code').is_visible():self.page.locator('#demo-code').fill('CARE2026');self.page.locator('#demo-code').press('Enter')
  expect(self.page.locator('.home-top-grid')).to_be_visible()
 def b_nav(self,view,standalone=False):
  attribute='nav' if standalone else 'view'
  mobile=self.page.locator(f'.bottom-nav [data-{attribute}="{view}"]')
  if mobile.count() and mobile.is_visible():mobile.click()
  else:self.page.locator(f'[data-{attribute}="{view}"]:visible').first.click()
 def test_both_patient_home_hierarchy_large_font_and_four_widths(self):
  out=Path('/tmp/spotlight-verification/screenshots');out.mkdir(parents=True,exist_ok=True)
  for standalone in [True,False]:
   self.page.set_viewport_size({'width':1440,'height':950});self.login_b(standalone);expect(self.page.locator('.hero-panel')).to_contain_text('이정희님' if standalone else '윤미경님')
   panels=self.page.locator('.home-top-grid').evaluate('e=>[...e.children].map(x=>({x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y}))');self.assertGreater(panels[1]['x'],panels[0]['x']);self.assertEqual(panels[0]['y'],panels[1]['y'])
   self.page.locator('button.top-font[data-action="font"]:visible').first.click()
   for width in [390,768,1024,1440]:
    self.page.set_viewport_size({'width':width,'height':950});self.page.wait_for_timeout(80)
    for view in ['today','schedule','help','profile']:
     self.b_nav(view,standalone);self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width,f'B {standalone} {view} {width}')
     if view=='today':expect(self.page.locator('.home-top-grid>.appointment')).to_have_count(1);expect(self.page.locator('.aside-stack>.insight-strip')).to_have_count(1);self.page.screenshot(path=str(out/f'B-{ "independent" if standalone else "connected" }-{width}.png'),full_page=True)

    if self.page.locator('[data-comfort=menu]').is_visible():self.page.locator('[data-comfort=menu]').click()
    self.page.locator('[data-action="patient-home"], [data-action="home"]').first.click();self.assertTrue(self.page.locator('body').evaluate('e=>e.classList.contains("large-font")'))
 def test_independent_patient_history_profile_pdf_and_keyboard_preserved(self):
  self.login_b(True);expect(self.page.locator('[data-action="patient-back"]')).to_be_disabled();self.b_nav('schedule',True);self.b_nav('help',True);self.b_nav('profile',True);self.page.locator('[data-action="patient-back"]').click();expect(self.page.locator('.service-title')).to_be_visible();self.page.locator('[data-action="patient-next"]').click();expect(self.page.get_by_role('heading',name='내 정보',exact=True)).to_be_visible()
  self.page.locator('[data-action="edit-start"]').click();address='합성주소'+'가나다'*30;self.page.locator('#address').fill(address);self.page.locator('#contact').fill('DEMO-UX');self.page.locator('#profile-form button[type="submit"]').click();expect(self.page.locator('.modal-panel')).to_be_visible();self.page.keyboard.press('Escape');expect(self.page.locator('#profile-form button[type="submit"]')).to_be_focused();self.page.locator('#profile-form button[type="submit"]').click();self.page.locator('[data-action="modal-save"]').click();expect(self.page.locator('.profile-layout')).to_contain_text(address)
  self.page.locator('[data-action="patient-home"]').click();self.page.locator('[data-detail="mobility"]').click();self.page.locator('[data-action="pdf-open"]').click();expect(self.page.locator('.pdf-panel')).to_be_visible();self.page.wait_for_function('document.querySelector(".pdf-image").naturalWidth>0')
  with self.page.expect_download() as event:self.page.get_by_role('link',name='PDF 파일 저장').click()
  self.assertTrue(Path(event.value.path()).read_bytes().startswith(b'%PDF-'));self.page.keyboard.press('Escape');expect(self.page.locator('[data-action="pdf-open"]')).to_be_focused();self.page.reload();self.page.locator('#demo-code').fill('CARE2026');self.page.locator('#demo-code').press('Enter');self.b_nav('profile',True);expect(self.page.locator('.profile-layout')).to_contain_text(address)
 def test_published_and_revoked_records_remain_byte_identical_during_tour(self):
  self.login_b(False);self.page.goto(self.base+'prototypes/integrated-v10/a3/index.html?screen=plan&patient=SYN-002');self.page.locator('#actor').select_option('APPROVER')
  for revoked in [False,True]:
   if revoked:self.page.locator('[data-nav="plan"]').click();self.page.locator('#revoke').click()
   self.page.locator('[data-nav="learn"]').click();before=self.stores();self.start()
   for step in range(10):
    self.assertEqual(self.stores(),before)
    if step<9:self.next()
   self.page.keyboard.press('Escape');self.assertEqual(self.stores(),before)
 def test_short_viewport_explanation_scrolls_by_keyboard(self):
  self.open();self.page.set_viewport_size({'width':390,'height':250});self.start();self.layout();copy=self.page.locator('.spot-copy');self.assertGreater(copy.evaluate('e=>e.scrollHeight-e.clientHeight'),0);copy.focus();self.page.keyboard.press('End');self.page.wait_for_timeout(80)
  self.assertGreater(copy.evaluate('e=>e.scrollTop'),0);self.layout();self.page.keyboard.press('Escape');expect(self.page.locator('[data-learn-guided-tour]')).to_be_focused()
 def test_mobile_touch_tour_keeps_workflow_unchanged(self):
  self.ctx.close();self.ctx=self.browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);self.page=self.ctx.new_page();self.page.set_default_timeout(6000);self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  self.open();before=self.stores();self.page.locator('[data-learn-guided-tour]').tap();self.page.locator('[data-tour-control="next"]').tap();self.page.locator('[data-tour-control="skip"]').tap();self.assertEqual(self.stores(),before);expect(self.page.locator('[data-learn-guided-tour]')).to_be_focused()

if __name__=='__main__':unittest.main(verbosity=2)
