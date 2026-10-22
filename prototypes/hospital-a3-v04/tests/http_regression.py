"""Real-origin safety regressions; run against either baseline or candidate via A3_ROOT."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import functools, os, unittest
from playwright.sync_api import sync_playwright, expect
ROOT=Path(os.environ.get('A3_ROOT',str(Path(__file__).resolve().parents[1])))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
class Safety(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  Thread(target=cls.server.serve_forever,daemon=True).start()
  cls.base=f'http://127.0.0.1:{cls.server.server_port}/'
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.context=self.browser.new_context();self.page=self.context.new_page();self.page.set_default_timeout(5000)
  self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.page.on('dialog',lambda d:d.accept())
  self.page.goto(self.base+'index.html');expect(self.page.locator('#patient-name')).to_contain_text('이정희')
  self.key=self.page.evaluate("Object.keys(localStorage).find(k=>k.startsWith('a3-prototype-'))")
 def tearDown(self):
  self.context.close()
  self.assertEqual(self.errors,[])
 def select(self,id): self.page.locator('#patient-select').select_option(id)
 def practice(self,id='SYN-002'):
  self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-learn-unit="practice"]').click();self.page.locator(f'[data-study-start="{id}"]').click()
 def delay_pdf(self):
  self.page.locator('[data-tab="documents"]').click()
  self.page.evaluate("""() => {const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=(...args)=>new Promise(resolve=>{window.finishDigest=()=>digest(...args).then(resolve);});}""")
  self.page.locator('#file-attach').set_input_files({'name':'patient-two.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\n%%EOF'})
  self.page.wait_for_function('!!window.finishDigest')
 def finish_pdf(self):
  self.page.evaluate('window.finishDigest()');self.page.wait_for_timeout(150)
 def test_attachment_never_moves_to_different_patient(self):
  self.select('SYN-002');self.delay_pdf();self.select('SYN-001');self.finish_pdf()
  self.page.locator('[data-tab="documents"]').click();expect(self.page.locator('.doc-card')).to_have_count(0)
 def test_attachment_never_moves_from_normal_to_study(self):
  self.select('SYN-002');self.delay_pdf();self.practice();self.finish_pdf()
  self.page.locator('[data-tab="documents"]').click();expect(self.page.locator('.doc-card')).to_have_count(0)
 def test_patient_picker_leaves_practice_for_requested_patient(self):
  self.practice();self.select('SYN-003');expect(self.page.locator('#patient-name')).to_contain_text('최도현')
 def test_foreign_patient_record_is_not_rendered(self):
  self.page.evaluate("""key=>{const records=JSON.parse(localStorage.getItem(key));records['SYN-001']=structuredClone(records['SYN-002']);records['SYN-001'].draft.items[0].text='FOREIGN-PATIENT-SENTINEL';localStorage.setItem(key,JSON.stringify(records));}""",self.key)
  self.page.reload();expect(self.page.locator('#patient-name')).to_contain_text('이정희')
  self.assertNotIn('FOREIGN-PATIENT-SENTINEL',self.page.locator('body').inner_text())
  self.assertEqual(self.page.locator('#save-state').inner_text(),'저장 불가')
  self.assertIn('FOREIGN-PATIENT-SENTINEL',self.page.evaluate('key=>localStorage.getItem(key)',self.key))
 def test_corrupt_storage_not_silently_overwritten(self):
  self.page.evaluate("key=>localStorage.setItem(key,'{broken-json')",self.key);self.page.reload()
  self.assertEqual(self.page.evaluate('key=>localStorage.getItem(key)',self.key),'{broken-json')
  expect(self.page.locator('#save-state')).to_have_text('저장 불가')
 def test_current_print_sheet_cleared_on_patient_switch(self):
  self.select('SYN-002');self.page.locator('[data-tab="documents"]').click();self.page.evaluate('window.print=()=>{}')
  self.page.locator('[data-action="print-draft"]').click();self.assertIn('SYN-002',self.page.locator('#print-sheet').inner_text())
  self.select('SYN-001');expect(self.page.locator('#print-sheet')).to_be_empty()
 def test_matching_pdf_restores_approved_attachment_after_reload(self):
  import hashlib
  self.select('SYN-002');self.page.locator('[data-tab="documents"]').click()
  pdf=ROOT/'examples'/'SYN-002_sample_care_plan.pdf'
  self.page.locator('#file-attach').set_input_files(pdf)
  expect(self.page.locator('.doc-card')).to_have_count(1)
  self.page.locator('[data-doc-edit="visibility"]').select_option('PATIENT')
  self.page.locator('#actor').select_option('PHYSICIAN');self.page.locator('[data-action="review-doc"]').click()
  self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');self.page.locator('#approve').click()
  stored=self.page.evaluate("key=>JSON.parse(localStorage.getItem(key))['SYN-002']",self.key)
  self.assertEqual(stored['draft']['docs'][0]['fileHash'],hashlib.sha256(pdf.read_bytes()).hexdigest())
  self.page.reload();self.select('SYN-002');self.page.locator('#actor').select_option('APPROVER')
  expect(self.page.locator('#publish')).to_be_disabled();self.page.locator('[data-tab="documents"]').click()
  self.page.locator('#file-attach').set_input_files(pdf)
  expect(self.page.locator('#publish')).to_be_enabled();expect(self.page.locator('.doc-card')).to_have_count(1)
  self.page.locator('#publish').click();expect(self.page.locator('#workflow-state')).to_have_text('발행 완료')
 def test_text_is_escaped_and_restored_without_cross_patient_or_study_leak(self):
  payload='<img src=x onerror="window.injected=true"> synthetic only'
  self.select('SYN-002');field=self.page.locator('[data-item="today"] [data-edit="text"]')
  field.fill(payload);field.press('Tab')
  self.page.locator('#preview-toggle').click()
  self.assertIn(payload,self.page.locator('#preview-frame').inner_text())
  self.assertEqual(self.page.locator('#preview-frame img').count(),0)
  self.assertIsNone(self.page.evaluate('window.injected'))
  self.page.locator('#rail-toggle').focus();self.page.keyboard.press('Enter')
  expect(self.page.locator('#rail-toggle')).to_have_attribute('aria-expanded','false')
  self.page.reload();self.select('SYN-002');expect(self.page.locator('[data-item="today"] [data-edit="text"]')).to_have_value(payload)
  self.select('SYN-001');self.assertNotIn(payload,self.page.locator('body').inner_text())
  self.practice('SYN-002');self.assertNotIn(payload,self.page.locator('body').inner_text())
  self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-study-leave]').click()
  self.page.locator('[data-nav="plan"]').click()
  self.select('SYN-002');expect(self.page.locator('[data-item="today"] [data-edit="text"]')).to_have_value(payload)
 def test_stale_tab_does_not_overwrite_another_tabs_saved_changes(self):
  other=self.context.new_page();other.goto(self.base+'index.html')
  field=self.page.locator('[data-item="today"] [data-edit="text"]');field.fill('Saved first-tab guidance');field.press('Tab')
  second=other.locator('[data-item="today"] [data-edit="text"]');second.fill('Stale second-tab overwrite');second.press('Tab')
  saved=self.page.evaluate("key=>JSON.parse(localStorage.getItem(key))['SYN-001'].draft.items[0].text",self.key)
  self.assertEqual(saved,'Saved first-tab guidance');expect(other.locator('#save-state')).to_have_text('저장 불가');other.close()
 def test_keyboard_dialogs_at_all_required_widths(self):
  for width in [320,390,800,801,1024,1440]:
   self.page.set_viewport_size({'width':width,'height':900})
   gate=self.page.locator('#gate-banner');gate.focus();self.page.keyboard.press('Enter')
   expect(self.page.locator('#blockers-dialog')).to_be_visible();self.page.keyboard.press('Escape')
   expect(self.page.locator('#blockers-dialog')).not_to_be_visible();expect(gate).to_be_focused()
   self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 def test_study_resume_and_reset_leave_normal_records_unchanged(self):
  self.practice('SYN-002');field=self.page.locator('[data-item="today"] [data-edit="text"]')
  field.fill('Independent study-only saved guidance');field.press('Tab');self.page.reload()
  self.select('SYN-002');self.assertNotIn('study-only',self.page.locator('body').inner_text())
  self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-learn-unit="practice"]').click()
  self.page.locator('[data-study-resume="SYN-002"]').click()
  expect(self.page.locator('[data-item="today"] [data-edit="text"]')).to_have_value('Independent study-only saved guidance')
  self.page.locator('#reset').click()
  self.assertNotIn('study-only',self.page.locator('body').inner_text())
  self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-study-leave]').click()
  self.page.locator('[data-nav="plan"]').click();self.select('SYN-002')
  expect(self.page.locator('#workflow-state')).to_have_text('초안 작성 중')
 def test_published_pdf_and_history_keep_previous_version_immutable(self):
  import tempfile,fitz
  self.select('SYN-004');self.page.locator('#actor').select_option('APPROVER')
  old=self.page.evaluate("key=>JSON.parse(localStorage.getItem(key))['SYN-004'].publications[0].snapshot",self.key)
  self.page.locator('#revise').click()
  card=self.page.locator('[data-item="followup"]');card.locator('summary').click()
  card.locator('[data-edit="text"]').fill('V2 SYNTHETIC APPOINTMENT UPDATE');card.locator('[data-edit="text"]').press('Tab')
  self.page.locator('[data-tab="documents"]').click();self.page.evaluate('window.print=()=>{}')
  self.page.locator('[data-action="print-published"]').click()
  self.assertNotIn('V2 SYNTHETIC',self.page.locator('#print-sheet').inner_text());self.assertIn('v1.0',self.page.locator('#print-sheet').inner_text())
  self.page.locator('[data-tab="plan"]').click()
  for section in ['today','medication','followup','warning','contact','support']:
   item=self.page.locator(f'[data-item="{section}"]')
   if item.get_attribute('open') is None:item.locator('summary').click()
   item.locator('[data-edit="verified"]').check()
  self.page.locator('#request').click();self.page.locator('#approve').click();self.page.locator('#publish').click()
  self.page.locator('[data-tab="documents"]').click();self.page.locator('[data-action="print-published"]').click()
  self.assertIn('V2 SYNTHETIC APPOINTMENT UPDATE',self.page.locator('#print-sheet').inner_text())
  with tempfile.TemporaryDirectory(prefix='a3-pdf-') as tmp:
   out=Path(tmp)/'v2.pdf';self.page.pdf(path=str(out),format='A4',print_background=True)
   with fitz.open(out) as pdf:
    content=''.join(p.get_text() for p in pdf)
    for expected in ['SYN-004','v2.0','V2 SYNTHETIC APPOINTMENT UPDATE']:self.assertIn(expected,content)
  publications=self.page.evaluate("key=>JSON.parse(localStorage.getItem(key))['SYN-004'].publications",self.key)
  self.assertEqual(next(p['snapshot'] for p in publications if p['snapshot']['planVersion']=='1.0'),old)
  self.assertEqual(next(p['status'] for p in publications if p['snapshot']['planVersion']=='1.0'),'SUPERSEDED')
 def test_revoke_enabled_after_lower_role_and_reapproval(self):
  self.select('SYN-004');self.page.locator('#revise').click();self.page.locator('#actor').select_option('NURSE')
  self.page.locator('#actor').select_option('APPROVER')
  for section in ['today','medication','followup','warning','contact','support']:
   card=self.page.locator(f'[data-item="{section}"]')
   if card.get_attribute('open') is None:card.locator('summary').click()
   card.locator('[data-edit="verified"]').check()
  self.page.locator('#request').click();self.page.locator('#approve').click();self.page.locator('#publish').click()
  expect(self.page.locator('#revoke')).to_be_enabled();self.page.locator('#revoke').click();expect(self.page.locator('#workflow-state')).to_have_text('발행 철회')
if __name__=='__main__':unittest.main(verbosity=2)
