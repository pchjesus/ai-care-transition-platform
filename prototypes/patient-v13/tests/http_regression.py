"""Real-browser HTTP regressions; PATIENT_ROOT also runs these against v1.2."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import functools,os,unittest
from playwright.sync_api import sync_playwright,expect
ROOT=Path(os.environ.get('PATIENT_ROOT',str(Path(__file__).resolve().parents[1])))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
class PatientRegression(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
  Thread(target=cls.server.serve_forever,daemon=True).start();cls.base=f'http://127.0.0.1:{cls.server.server_port}/'
  cls.entry=os.environ.get('PATIENT_ENTRY','index.html');cls.preview='preview.source.html' if '.source.' in cls.entry else 'preview.html'
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':390,'height':844});self.page=self.ctx.new_page();self.errors=[]
  self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.page.set_default_timeout(3000)
  self.profile_key='discharge_navigator_v12_mock_profile' if ROOT.name.endswith('v12') else 'discharge_navigator_v13_mock_profile'
 def tearDown(self):
  self.ctx.close();self.assertEqual(self.errors,[])
 def login(self,page=None):
  page=page or self.page;page.locator('#demo-code').fill('CARE2026');page.locator('#demo-code').press('Enter');expect(page.locator('.hero-panel')).to_be_visible()
 def front(self):self.page.goto(self.base+self.entry);self.login()
 def profile(self):self.page.locator('.top-profile').click()
 def edit(self,text='서울시 가상구 수정주소 99 (가상)'):
  self.profile();self.page.locator('[data-action="edit-start"]').click();self.page.locator('#address').fill(text)
 def save(self):self.page.locator('#profile-form button[type="submit"]').click();self.page.locator('[data-action="modal-save"]').click()
 def detail(self):self.page.locator('[data-detail="mobility"]').first.click()
 def test_unsaved_profile_survives_font_toggle(self):
  self.front();self.edit();self.page.locator('.top-font').click();expect(self.page.locator('#address')).to_have_value('서울시 가상구 수정주소 99 (가상)')
 def test_help_results_match_query_after_font_toggle(self):
  self.front();self.page.locator('.bottom-nav [data-nav="help"]').click();self.page.locator('[data-action="toggle-help-search"]').click()
  self.page.locator('[data-help-search]').fill('없는검색어-SYNTHETIC');expect(self.page.locator('#service-search-results .service-card')).to_have_count(0)
  self.page.locator('.top-font').click();expect(self.page.locator('#service-search-results .service-card')).to_have_count(0)
 def test_withdrawn_plan_stays_blocked_after_reload(self):
  self.page.goto(self.base+self.preview);self.page.locator('[data-action="clinician"]').click();self.page.locator('[data-action="withdraw"]').click()
  self.page.reload();expect(self.page.get_by_text('현재 공개된 퇴원 계획이 없어요.',exact=True)).to_be_visible()
 def test_withdrawal_closes_content_in_other_open_patient_tab(self):
  self.front();other=self.ctx.new_page();other.goto(self.base+self.preview)
  other.locator('[data-action="clinician"]').click();other.locator('[data-action="withdraw"]').click()
  expect(self.page.get_by_text('현재 공개된 퇴원 계획이 없어요.',exact=True)).to_be_visible();other.close()
 def test_pdf_creation_failure_is_handled(self):
  self.front();self.detail();self.page.evaluate("() => {URL.createObjectURL=()=>{throw new Error('PDF unavailable')}}")
  self.page.locator('[data-action="pdf-open"]').click();expect(self.page.locator('.pdf-panel')).to_have_count(0)
  expect(self.page.locator('.toast')).to_contain_text('PDF')
 def test_pdf_url_released_on_reset(self):
  self.page.goto(self.base+self.preview);self.detail()
  self.page.evaluate('() => {window.revoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{window.revoked.push(u);revoke(u)}}')
  self.page.locator('[data-action="pdf-open"]').click();url=self.page.locator('.pdf-actions a').first.get_attribute('href')
  self.page.locator('.devbar [data-action="reset"]').evaluate('(b)=>b.click()')
  self.assertIn(url,self.page.evaluate('window.revoked'));expect(self.page.locator('.pdf-panel')).to_have_count(0)
 def test_pdf_escape_restores_trigger_focus(self):
  self.front();self.detail();self.page.locator('[data-action="pdf-open"]').click();self.page.keyboard.press('Escape')
  expect(self.page.locator('[data-action="pdf-open"]')).to_be_focused()
 def test_save_cancel_restores_keyboard_focus(self):
  self.front();self.edit();self.page.locator('#profile-form button[type="submit"]').click();self.page.keyboard.press('Escape')
  expect(self.page.locator('#profile-form button[type="submit"]')).to_be_focused()
 def test_corrupt_profile_is_preserved_on_failed_save(self):
  self.page.goto(self.base+self.entry);self.page.evaluate("key=>localStorage.setItem(key,'{broken-json')",self.profile_key);self.page.reload();self.login();self.edit();self.save()
  self.assertEqual(self.page.evaluate('key=>localStorage.getItem(key)',self.profile_key),'{broken-json')
 def test_failed_save_keeps_editing_and_disables_transfer(self):
  self.front();self.edit();self.page.evaluate("key=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return write.call(this,k,v)}}",self.profile_key)
  self.save();expect(self.page.locator('#address')).to_have_value('서울시 가상구 수정주소 99 (가상)')
  expect(self.page.locator('[data-action="transfer-open"]')).to_be_disabled()
 def test_transfer_consent_survives_font_toggle(self):
  self.front();self.edit();self.save();self.page.locator('[data-action="transfer-open"]').click();self.page.locator('#transfer-consent').check()
  self.page.locator('.top-font').evaluate('(b)=>b.click()');expect(self.page.locator('#transfer-consent')).to_be_checked()
  self.page.locator('[data-action="modal-transfer"]').click();expect(self.page.locator('#main-content')).to_be_focused();expect(self.page.locator('[data-action="transfer-open"]')).to_be_disabled()
 def test_legacy_profile_and_font_migration_in_real_browser(self):
  import json
  legacy={'schemaVersion':1,'profile':{'address':'서울시 가상구 이전저장 17 (가상)','contact':'010-0000-0000 (가상)'},'revision':2,'lastRequest':{'requestId':'DEMO-0002','revision':2,'createdAt':'2026-10-21T00:00:00Z','status':'LOCAL_ONLY'}}
  raw=json.dumps(legacy,ensure_ascii=False)
  self.page.goto(self.base+self.entry);self.page.evaluate("raw=>{localStorage.setItem('discharge_navigator_v12_mock_profile',raw);localStorage.setItem('discharge_navigator_v12_font_preference','true')}",raw)
  self.page.reload();self.login();self.profile();self.assertIn(legacy['profile']['address'],self.page.locator('main').inner_text())
  expect(self.page.locator('.top-font')).to_contain_text('글자 기본');expect(self.page.locator('[data-action="transfer-open"]')).to_be_disabled()
  self.assertEqual(self.page.evaluate("localStorage.getItem('discharge_navigator_v12_mock_profile')"),raw)
  self.assertEqual(self.page.evaluate('key=>JSON.parse(localStorage.getItem(key)).lastRequest.requestId',self.profile_key),'DEMO-0002')
 def test_stale_profile_tab_cannot_overwrite_saved_information(self):
  self.front();other=self.ctx.new_page();other.goto(self.base+self.entry);self.login(other)
  self.edit('서울시 가상구 첫번째 탭 (가상)');self.save()
  other.locator('.top-profile').click();other.locator('[data-action="edit-start"]').click();other.locator('#address').fill('서울시 가상구 오래된 탭 (가상)')
  other.locator('#profile-form button[type="submit"]').click();other.locator('[data-action="modal-save"]').click()
  expect(other.locator('#address')).to_be_visible()
  self.assertEqual(self.page.evaluate('key=>JSON.parse(localStorage.getItem(key)).profile.address',self.profile_key),'서울시 가상구 첫번째 탭 (가상)');other.close()
 def test_invalid_or_unpublished_plan_never_shows_patient_content(self):
  self.page.goto(self.base+self.entry)
  for raw in ['{broken','{"schemaVersion":1,"published":false,"version":1,"planChanged":false}']:
   self.page.evaluate("raw=>localStorage.setItem('discharge_navigator_v13_mock_plan',raw)",raw);self.page.reload()
   self.page.locator('#demo-code').fill('CARE2026');self.page.locator('#demo-code').press('Enter')
   expect(self.page.get_by_text('현재 공개된 퇴원 계획이 없어요.',exact=True)).to_be_visible()
   expect(self.page.locator('[data-detail]')).to_have_count(0)
   for tab in ['today','schedule','help']:
    self.page.locator(f'.bottom-nav [data-nav="{tab}"]').click();expect(self.page.locator('.blocked')).to_be_visible()
   self.profile();expect(self.page.locator('#profile-form')).to_have_count(0)
 def test_pdf_bytes_preview_failure_and_keyboard_trap(self):
  import hashlib
  self.front();self.detail();self.page.locator('[data-action="pdf-open"]').click()
  url=self.page.locator('.pdf-actions a').first.get_attribute('href')
  digest=self.page.evaluate("async url=>{const bytes=await (await fetch(url)).arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('')}",url)
  self.assertEqual(digest,hashlib.sha256((ROOT/'보행_보조기_안내_시연용.pdf').read_bytes()).hexdigest())
  close=self.page.locator('.close-pdf');last=self.page.locator('.pdf-actions a').last;last.focus();self.page.keyboard.press('Tab');expect(close).to_be_focused()
  close.focus();self.page.keyboard.press('Shift+Tab');expect(last).to_be_focused()
  self.page.locator('.pdf-image').dispatch_event('error');expect(self.page.locator('.pdf-image')).to_have_count(0)
  expect(self.page.locator('.pdf-panel')).to_contain_text('미리보기를 표시하지 못했어요')
  self.page.keyboard.press('Escape');expect(self.page.locator('[data-action="pdf-open"]')).to_be_focused()
 def test_save_modal_keyboard_at_required_viewports(self):
  self.front()
  for width in [320,390,768,1024,1440]:
   self.page.set_viewport_size({'width':width,'height':930})
   if self.page.locator('.side').is_visible():self.page.locator('.side [data-nav="profile"]').click()
   else:self.profile()
   self.page.locator('[data-action="edit-start"]').click();self.page.locator('#address').fill('가상 주소 '+str(width))
   submit=self.page.locator('#profile-form button[type="submit"]');submit.focus();self.page.keyboard.press('Enter')
   first=self.page.locator('[data-action="modal-cancel"]');last=self.page.locator('[data-action="modal-save"]')
   first.focus();self.page.keyboard.press('Shift+Tab');expect(last).to_be_focused();self.page.keyboard.press('Tab');expect(first).to_be_focused()
   self.page.keyboard.press('Escape');expect(submit).to_be_focused();self.page.locator('[data-action="edit-cancel"]').click()
 def test_pdf_download_matches_the_original_document(self):
  import hashlib,tempfile
  self.front();self.detail();self.page.locator('[data-action="pdf-open"]').click()
  with self.page.expect_download() as download_info:self.page.locator('.pdf-actions a[download]').click()
  download=download_info.value;self.assertEqual(download.suggested_filename,'보행_보조기_안내_시연용.pdf')
  with tempfile.TemporaryDirectory(prefix='patient-pdf-') as tmp:
   path=Path(tmp)/'download.pdf';download.save_as(path)
   self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),hashlib.sha256((ROOT/'보행_보조기_안내_시연용.pdf').read_bytes()).hexdigest())
 def test_revised_version_restores_and_never_reuses_old_pdf(self):
  self.page.goto(self.base+self.preview);self.page.locator('[data-action="clinician"]').click();self.page.locator('[data-action="publish"]').click()
  expect(self.page.locator('.version-meta')).to_have_text('변경된 안내 · v2.0')
  self.detail();expect(self.page.locator('[data-action="pdf-open"]')).to_have_count(0)
  self.page.reload();expect(self.page.locator('.version-meta')).to_have_text('변경된 안내 · v2.0')
  other=self.ctx.new_page();other.goto(self.base+self.entry);self.login(other)
  expect(other.locator('.version-meta')).to_have_text('변경된 안내 · v2.0');other.locator('[data-detail="mobility"]').first.click()
  expect(other.locator('[data-action="pdf-open"]')).to_have_count(0);other.close()
 def test_all_help_routes_and_print_return_to_expected_screens(self):
  self.front();self.page.evaluate('() => {window.print=()=>{window.printCalls=(window.printCalls||0)+1}}')
  routes=[('hospital','.support-detail'),('warning','.support-detail'),('mobility','.detail-wrap'),('appointment','.schedule-layout'),('medication','.detail-wrap'),('rehabilitation','.support-detail'),('community','.support-detail'),('caregiver','.overview-layout'),('print','.hero-panel')]
  for id,selector in routes:
   self.page.locator('.bottom-nav [data-nav="help"]').click();button=self.page.locator(f'[data-service-id="{id}"]')
   if not button.is_visible():self.page.locator('[data-action="toggle-help-search"]').click()
   button.click();expect(self.page.locator(selector)).to_be_visible()
  self.assertEqual(self.page.evaluate('window.printCalls'),1)
 def test_injected_profile_is_displayed_as_text(self):
  self.front();self.edit('<img src=x onerror="window.injected=true"> 가상');self.save()
  self.assertEqual(self.page.locator('.profile-layout img').count(),0);self.assertIsNone(self.page.evaluate('window.injected'))
  self.page.reload();self.login();self.profile();self.assertIn('<img src=x',self.page.locator('.profile-layout').inner_text())
if __name__=='__main__':unittest.main(verbosity=2)
