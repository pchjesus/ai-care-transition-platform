"""Chromium HTTP acceptance for synthetic A3 -> actual integrated patient B.
NOT executed by authoring chat; run with Python Playwright + Chromium before deploy."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect
import functools, unittest

ROOT=Path(__file__).resolve().parents[3]
KEY='care-transition-integrated-v10-a3-synthetic-only'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

class PatientIntegration(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  Thread(target=cls.server.serve_forever,daemon=True).start()
  cls.base=f'http://127.0.0.1:{cls.server.server_port}/prototypes/integrated-v10/'
  cls.p=sync_playwright().start()
  cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':1440,'height':950})
  self.a3=self.ctx.new_page();self.b=self.ctx.new_page()
  self.errors=[]
  for page in [self.a3,self.b]:
   page.set_default_timeout(6000)
   page.on('pageerror',lambda e:self.errors.append(str(e)))
   page.on('dialog',lambda d:d.accept())
 def tearDown(self):
  self.ctx.close()
  self.assertEqual(self.errors,[])
 def open_a3(self):
  self.a3.goto(self.base+'a3/index.html?screen=plan&patient=SYN-002')
  expect(self.a3.locator('#patient-select')).to_have_value('SYN-002')
 def open_b(self,patient='SYN-002',encounter='ENC-SYN-002-DEMO'):
  self.b.goto(self.base+'patient/index.html?patient='+patient+'&encounter='+encounter)
  self.b.locator('#demo-code').fill('CARE2026')
  self.b.get_by_role('button',name='가상 환자 안내 시작').click()
 def publish_v1(self):
  self.a3.locator('#request').click()
  self.a3.locator('#actor').select_option('APPROVER')
  self.a3.locator('#approve').click()
  self.a3.locator('#publish').click()
  expect(self.a3.locator('#preview-mark')).to_contain_text('발행')
 def test_no_issuance_and_encounter_mismatch(self):
  self.open_a3()
  self.open_b()
  expect(self.b.locator('#main-content')).to_contain_text('아직 발행된 안내가 없어요')
  self.open_b(encounter='ENC-SYN-003-DEMO')
  expect(self.b.locator('#main-content')).to_contain_text('환자·입원건이 일치하지 않아요')
  self.assertNotIn('이정희',self.b.locator('#main-content').inner_text())
 def test_publish_revision_revoke_and_tab_refresh(self):
  self.open_a3();self.open_b()
  self.publish_v1()
  expect(self.b.locator('#main-content')).to_contain_text('오늘의 관리 계획')
  expect(self.b.locator('.version-meta')).to_contain_text('v1.0')
  self.b.locator('[data-item="today"]').click()
  expect(self.b.locator('#main-content')).to_contain_text('의료진이 확인한 내용')
  self.b.locator('[data-action="back"]').click()
  expect(self.b.locator('[data-action="next"]')).to_be_enabled()
  self.a3.locator('#revise').click()
  expect(self.b.locator('.version-meta')).to_contain_text('v1.0')
  self.a3.locator('#revoke').click()
  expect(self.b.locator('#main-content')).to_contain_text('아직 발행된 안내가 없어요')
  self.b.reload()
  self.b.locator('#demo-code').fill('CARE2026')
  self.b.get_by_role('button',name='가상 환자 안내 시작').click()
  expect(self.b.locator('#main-content')).to_contain_text('아직 발행된 안내가 없어요')
 def test_a3_save_failure_does_not_publish(self):
  self.open_a3();self.open_b()
  self.a3.locator('#request').click()
  self.a3.locator('#actor').select_option('APPROVER')
  self.a3.locator('#approve').click()
  self.a3.evaluate("""key=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){
      if(k===key)throw new DOMException('Quota exceeded','QuotaExceededError');
      return original.call(this,k,v)
    };
  }""",KEY)
  self.a3.locator('#publish').click()
  expect(self.a3.locator('#save-state')).to_have_text('저장 불가')
  expect(self.b.locator('#main-content')).to_contain_text('아직 발행된 안내가 없어요')
 def test_original_patient_styles_and_four_viewports(self):
  self.open_a3();self.publish_v1();self.open_b()
  for width in [390,768,1024,1440]:
   self.b.set_viewport_size({'width':width,'height':940})
   self.assertTrue(self.b.locator('.hero-panel').is_visible())
   self.assertTrue(self.b.locator('[data-action="home"]').is_visible())
   overflow=self.b.evaluate('document.documentElement.scrollWidth > window.innerWidth')
   self.assertFalse(overflow,f'Viewport overflow at {width}px')
  self.b.locator('[data-action="font"]').click()
  self.assertTrue(self.b.locator('body').evaluate("e=>e.classList.contains('large-font')"))

if __name__=='__main__':unittest.main()
