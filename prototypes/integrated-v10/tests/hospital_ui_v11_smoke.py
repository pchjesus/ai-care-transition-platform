"""Focused A1/A2/A3 v1.1 UX regression against actual synthetic application."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import functools
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[3]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

class HospitalV11(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  Thread(target=cls.server.serve_forever,daemon=True).start()
  cls.base=f'http://127.0.0.1:{cls.server.server_port}/prototypes/integrated-v10/a3/index.html'
  cls.p=sync_playwright().start()
  cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.page=self.browser.new_page(viewport={'width':1440,'height':900})
  self.errors=[]
  self.page.on('pageerror',lambda e:self.errors.append(str(e)))
  self.page.on('dialog',lambda d:d.accept())
 def tearDown(self):
  self.assertFalse(self.errors,self.errors)
  self.page.close()
 def open(self,screen='patients',patient='SYN-001'):
  self.page.goto(self.base+f'?screen={screen}&patient={patient}')
  expect(self.page.locator('#patient-name')).not_to_have_text('—')
  self.assertTrue(self.page.locator('#shell .brand-name').inner_text().startswith('케어브릿지랩'))
  self.assertTrue(self.page.evaluate('document.querySelector(\'link[href="../hospital-v11.css"]\')!==null'))
 def test_a1_search_filter_and_patient_navigation(self):
  self.open()
  expect(self.page.locator('[data-a1-record]')).to_have_count(4)
  self.page.locator('#a1-patient-search').fill('윤미경')
  expect(self.page.locator('[data-a1-record]:visible')).to_have_count(1)
  self.page.locator('#a1-patient-search').fill('NO_MATCH')
  expect(self.page.locator('#a1-empty')).to_be_visible()
  self.page.locator('#a1-patient-search').fill('')
  self.page.locator('#a1-status-filter').select_option('PUBLISHED')
  expect(self.page.locator('[data-a1-record]:visible')).to_have_count(1)
  self.page.locator('#a1-status-filter').select_option('all')
  self.page.locator('[data-a1-record]').filter(has_text='최도현').locator('[data-target-screen="assessment"]').click()
  expect(self.page.locator('#aux-screen .a2-domains')).to_be_visible()
  expect(self.page.locator('#patient-select')).to_have_value('SYN-003')
 def test_a2_first_required_gap_moves_to_real_field(self):
  self.open('assessment','SYN-003')
  jump=self.page.locator('#a2-jump-required')
  expect(jump).to_be_enabled()
  jump.click()
  self.assertEqual(self.page.evaluate('document.activeElement?.dataset.a2Field!==undefined'),True)
  self.assertEqual(self.page.evaluate('document.activeElement?.value'),'')
  self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth>innerWidth+2'))
 def test_a3_parallel_cards_and_real_blockers_navigation(self):
  for width in [390,768,1024,1440]:
   self.page.set_viewport_size({'width':width,'height':900})
   self.open('plan','SYN-001')
   cards=self.page.locator('.common-context .summary-row').evaluate('(e)=>[...e.children].map(c=>({x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y}))')
   if width>=1024:
    self.assertGreater(cards[1]['x'],cards[0]['x'])
    self.assertLess(abs(cards[0]['y']-cards[1]['y']),3)
   else:self.assertGreater(cards[1]['y'],cards[0]['y'])
   overflow=self.page.evaluate("""() => [...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.right>innerWidth+3&&s.display!=='none'}).slice(0,24).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:String(el.className).slice(0,75),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}})""")
   self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width+2, f"Overflow on {width}: {overflow}")
  self.page.locator('#gate-banner').click()
  expect(self.page.locator('#blockers-list [data-blocker-id]').first).to_be_visible()
  self.page.locator('#blockers-list [data-blocker-id]').first.click()
  expect(self.page.locator('#blockers-dialog')).not_to_be_visible()
  expect(self.page.locator('#a3-screen')).to_be_visible()
  self.page.locator('[data-tab="documents"]').click()
  expect(self.page.locator('#work-pane')).to_contain_text('PDF')
  self.page.locator('[data-tab="history"]').click()
  expect(self.page.locator('#work-pane')).to_contain_text('승인')
 def test_v12_search_selection_and_history_translation(self):
  self.open('patients','SYN-001')
  expect(self.page.locator('.patient-strip .upper-label')).to_have_text('현재 선택된 환자')
  self.page.locator('#a1-patient-search').fill('윤미경')
  expect(self.page.locator('#patient-select')).to_have_value('SYN-001')
  expect(self.page.locator('.a1-selection-hint')).to_contain_text('검색 결과')
  self.page.locator('[data-a1-record]:visible [data-target-screen="assessment"]').click()
  expect(self.page.locator('#patient-select')).to_have_value('SYN-002')
  self.page.locator('[data-a2-domain="function"]').click()
  self.page.locator('#a2-field-gait').select_option('device')
  self.page.locator('[data-nav="plan"]').click()
  self.page.locator('#gate-banner').click()
  blocker=self.page.locator('#blockers-list [data-blocker-id="assessment-dirty"]')
  expect(blocker).to_contain_text('A2 · 평가 인계')
  blocker.click()
  expect(self.page.locator('#handoff-a2')).to_be_focused()
  self.page.locator('[data-nav="plan"]').click()
  self.page.locator('[data-tab="history"]').click()
  item=self.page.locator('.timeline-item').first
  expect(item.locator('strong')).to_contain_text('평가 수정 · 보행/이동')
  expect(item.locator('.audit-original')).not_to_have_attribute('open','')
  item.locator('summary').click()
  expect(item.locator('.audit-original code')).to_have_text('EVALUATION_EDITED')
  expect(item.locator('.audit-original')).to_contain_text('function.gait')

if __name__=='__main__':unittest.main(verbosity=2)
