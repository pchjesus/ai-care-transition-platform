"""Chromium HTTP acceptance for synthetic A3 -> actual integrated patient B.
Real browser interactions; no clinical services or external data."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect
import functools, unittest, json

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
   page.on('console',lambda m:self.errors.append(m.text) if m.type=='error' else None)
   page.on('dialog',lambda d:d.accept())
 def tearDown(self):
  self.ctx.close()
  self.assertEqual(self.errors,[])
 def open_a3(self,patient="SYN-002"):
  self.a3.goto(self.base+'a3/index.html?screen=plan&patient='+patient)
  expect(self.a3.locator('#patient-select')).to_have_value(patient)
 def open_b(self,patient='SYN-002',encounter='ENC-SYN-002-DEMO'):
  self.b.goto(self.base+'patient/index.html?patient='+patient+'&encounter='+encounter)
  if self.b.locator('#demo-code').is_visible():
   self.b.locator('#demo-code').fill('CARE2026')
   self.b.get_by_role('button',name='가상 환자 안내 시작').click()
 def publish_v1(self):
  self.a3.locator('#request').click()
  self.a3.locator('#actor').select_option('APPROVER')
  self.a3.locator('#approve').click()
  self.a3.locator('#publish').click()
  expect(self.a3.locator('#preview-mark')).to_contain_text('발행')
 def nav_b(self,view,page=None):
  (page or self.b).locator(f'[data-view="{view}"]:visible').first.click()
 def records(self):return self.a3.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
 def verify_items(self):
  self.a3.locator('[data-tab="plan"]').click();self.a3.locator('#actor').select_option('APPROVER')
  for sec in ['today','medication','followup','warning','contact','support']:
   card=self.a3.locator(f'[data-item="{sec}"]')
   if card.get_attribute('open') is None:card.locator(':scope > summary').click()
   card.locator('[data-edit="verified"]').check()
 def personal_key(self,id='SYN-002'):return f'care-transition-connected-b-personal-v1:{id}:ENC-{id}-DEMO'
 def personal(self,page=None,id='SYN-002'):return (page or self.b).evaluate('key=>JSON.parse(localStorage.getItem(key))',self.personal_key(id))
 def profile_edit(self,address='가상 주소 2',contact='DEMO-002',page=None):
  page=page or self.b;self.nav_b('profile',page);page.locator('[data-action="edit-start"]').click();page.locator('#address').fill(address);page.locator('#contact').fill(contact)
 def profile_save(self,page=None):
  page=page or self.b;page.locator('#profile-form button[type="submit"]').click();expect(page.locator('#patient-dialog')).to_be_visible();page.locator('[data-action="modal-save"]').click()
 def deny_writes(self,page,key):
  page.evaluate("key=>{const original=Storage.prototype.setItem;window.restoreWrites=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return original.call(this,k,v)}}",key)
 def attach_pdf(self):
  self.a3.locator('[data-tab="documents"]').click();self.a3.locator('#file-attach').set_input_files(str(ROOT/'prototypes/integrated-v10/a3/examples/SYN-002_sample_care_plan.pdf'));expect(self.a3.locator('[data-doc]')).to_have_count(1);self.a3.locator('[data-doc-edit]').select_option('PATIENT');self.a3.locator('#actor').select_option('APPROVER');self.a3.locator('[data-action="review-doc"]').click()
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
  self.b.locator('[data-action="back"]:visible').click()
  expect(self.b.locator('[data-action="next"]:visible')).to_be_enabled()
  self.a3.locator('#revise').click()
  expect(self.b.locator('.version-meta')).to_contain_text('v1.0')
  self.a3.locator('#revoke').click()
  expect(self.b.locator('#main-content')).to_contain_text('아직 발행된 안내가 없어요')
  self.b.reload()
  expect(self.b.locator('#main-content')).to_be_visible()
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

   if self.b.locator('[data-comfort=menu]').is_visible():self.b.locator('[data-comfort=menu]').click()
   self.assertTrue(self.b.locator('[data-action="home"]:visible').is_visible())
   overflow=self.b.evaluate('document.documentElement.scrollWidth > window.innerWidth')
   self.assertFalse(overflow,f'Viewport overflow at {width}px')
  self.b.locator('[data-action="font"]').click()
  self.assertTrue(self.b.locator('body').evaluate("e=>e.classList.contains('large-font')"))

 def test_profile_save_modal_focus_refresh_and_local_request(self):
  self.open_a3();self.publish_v1();self.open_b();self.profile_edit('<img src=x onerror="window.pwned=1">','DEMO-123')
  self.b.locator('#profile-form button[type="submit"]').click();expect(self.b.locator('#patient-dialog')).to_be_visible();self.b.keyboard.press('Escape');expect(self.b.locator('#patient-dialog')).not_to_be_visible();expect(self.b.locator('#profile-form button[type="submit"]')).to_be_focused()
  self.profile_save();self.assertEqual(self.personal()['revision'],1);self.assertIsNone(self.b.evaluate('window.pwned'));expect(self.b.locator('#main-content img')).to_have_count(0)
  self.b.reload();expect(self.b.get_by_role('heading',name='내 정보',exact=True)).to_be_visible();expect(self.b.locator('[data-action="back"]:visible')).to_be_disabled();self.assertIn('<img',self.b.locator('.profile-grid').last.inner_text())
  self.b.locator('[data-action="transfer-open"]').click();self.b.locator('[data-action="modal-transfer"]').click();expect(self.b.locator('#patient-dialog')).to_be_visible();self.b.locator('#transfer-consent').check();self.b.locator('#patient-dialog [data-action="font"]').click();expect(self.b.locator('#transfer-consent')).to_be_checked();self.b.locator('[data-action="modal-transfer"]').click();expect(self.b.locator('.transfer-status')).to_contain_text('실제 기관 전송 없음');self.assertEqual(self.personal()['lastRequest']['status'],'LOCAL_ONLY')
 def test_profile_and_acknowledgment_storage_failures_never_claim_saved(self):
  self.open_a3();self.publish_v1();self.open_b();self.profile_edit();self.deny_writes(self.b,self.personal_key());self.profile_save();expect(self.b.locator('.inline-notice')).to_contain_text('저장하지 못');expect(self.b.locator('#address')).to_have_value('가상 주소 2');self.assertIsNone(self.personal())
  self.b.evaluate('restoreWrites()');self.profile_save();self.assertEqual(self.personal()['profile']['address'],'가상 주소 2');self.b.locator('[data-action="home"]:visible').click();self.b.locator('[data-item="today"]').click();self.b.locator('[data-action="quiz-start"]').click();self.b.locator('[data-choice="UNDERSTOOD"]').click();self.deny_writes(self.b,self.personal_key());self.b.locator('[data-action="understanding-save"]').click();self.assertEqual(self.personal()['understanding'],{});expect(self.b.locator('.feedback')).to_have_count(0)
 def test_understanding_is_version_specific_and_optional(self):
  self.open_a3();self.publish_v1();self.open_b();pub=self.records()['SYN-002']['publications'][0]['id'];self.b.locator('[data-item="today"]').click();self.b.locator('[data-action="quiz-start"]').click();self.b.locator('[data-choice="HELP"]').click();self.b.locator('[data-action="understanding-save"]').click();self.assertEqual(self.personal()['understanding'][pub]['today'],'HELP');self.b.reload();expect(self.b.locator('.feedback')).to_contain_text('추가 설명')
  self.a3.locator('#revise').click();self.verify_items();self.publish_v1();expect(self.b.locator('.version-meta')).to_contain_text('v2.0');expect(self.b.locator('.feedback')).to_have_count(0);self.assertEqual(self.personal()['understanding'][pub]['today'],'HELP')
 def test_revision_keeps_old_text_until_republish_then_revoke_closes_modal(self):
  self.open_a3();self.publish_v1();self.open_b();old=self.b.locator('[data-item="today"]').inner_text();self.a3.locator('#revise').click();self.a3.locator('[data-item="today"] textarea').fill('합성 v2 안내 · 임의 의료지시 없음');self.a3.locator('[data-item="today"] textarea').press('Tab');self.assertEqual(self.b.locator('[data-item="today"]').inner_text(),old);self.verify_items();self.publish_v1();expect(self.b.locator('[data-item="today"]')).to_contain_text('합성 v2 안내');self.b.locator('[data-item="today"]').click();self.b.locator('[data-action="about"]').click();expect(self.b.locator('#patient-dialog')).to_be_visible();self.a3.locator('#revoke').click();expect(self.b.locator('#patient-dialog')).to_have_count(0);expect(self.b.locator('#main-content')).not_to_contain_text('합성 v2 안내')
 def test_valid_pdf_view_download_refresh_and_revoke(self):
  self.open_a3();self.attach_pdf();self.publish_v1();self.open_b();self.b.locator('[data-item="today"]').click();self.b.locator('[data-document]').click();expect(self.b.locator('#patient-dialog')).to_be_visible();expect(self.b.locator('iframe.pdf-frame')).to_be_visible()
  with self.b.expect_download() as result:self.b.get_by_role('link',name='PDF 파일 저장').click()
  download=result.value;self.assertTrue(Path(download.path()).read_bytes().startswith(b'%PDF-'));self.b.keyboard.press('Escape');expect(self.b.locator('[data-document]')).to_be_focused();self.b.reload();self.b.locator('[data-document]').click();expect(self.b.locator('#patient-dialog')).to_be_visible();self.a3.locator('#revoke').click();expect(self.b.locator('#patient-dialog')).to_have_count(0);expect(self.b.locator('[data-document]')).to_have_count(0)
 def test_pdf_persistence_failure_blocks_publication(self):
  self.open_a3();self.attach_pdf();self.a3.locator('#request').click();self.a3.locator('#approve').click();self.open_b();self.a3.evaluate("()=>{IDBFactory.prototype.open=function(){throw new DOMException('Denied','SecurityError')}}");self.a3.locator('#publish').click();expect(self.a3.locator('#toast')).to_contain_text('발행하지 못');self.assertEqual(self.records()['SYN-002']['draft']['status'],'APPROVED');self.assertEqual(self.records()['SYN-002']['publications'],[]);expect(self.b.locator('#main-content')).to_contain_text('아직 발행된')
 def test_failed_revoke_preserves_the_last_persisted_publication(self):
  self.open_a3();self.publish_v1();self.open_b();before=self.records();self.deny_writes(self.a3,KEY);self.a3.locator('#revoke').click();expect(self.a3.locator('#save-state')).to_have_text('저장 불가');self.assertEqual(self.records(),before);expect(self.b.locator('.hero-panel')).to_be_visible()
 def test_profile_tabs_do_not_overwrite_concurrent_edits(self):
  self.open_a3();self.publish_v1();self.open_b();self.profile_edit('가상 초안 A');other=self.ctx.new_page();other.goto(self.b.url)
  if other.locator('#demo-code').is_visible():other.locator('#demo-code').fill('CARE2026');other.locator('#demo-code').press('Enter')
  self.profile_edit('가상 저장 B',page=other);self.profile_save(other);self.profile_save();expect(self.b.locator('.inline-notice')).to_contain_text('다른 탭');self.assertEqual(self.personal()['profile']['address'],'가상 저장 B');expect(self.b.locator('#address')).to_have_value('가상 초안 A')
 def test_corrupt_repository_and_local_profile_fail_closed(self):
  self.open_a3();self.publish_v1();self.open_b();self.b.evaluate('(key)=>localStorage.setItem(key,"{broken")',self.personal_key());self.nav_b('profile');self.b.locator('[data-action="edit-start"]').click();self.b.locator('#address').fill('가상 테스트');self.b.locator('#contact').fill('DEMO');self.profile_save();expect(self.b.locator('.inline-notice').first).to_contain_text('저장하지 못');self.assertEqual(self.b.evaluate('key=>localStorage.getItem(key)',self.personal_key()),'{broken')
  self.a3.evaluate('key=>localStorage.setItem(key,"{broken")',KEY);expect(self.b.locator('#main-content')).to_contain_text('저장된 계획을 확인할 수 없어요');expect(self.b.locator('[data-item]')).to_have_count(0)
 def test_two_published_patients_never_share_profile_or_understanding(self):
  self.open_a3();self.publish_v1();self.open_b();self.profile_edit('가상 SYN002 주소');self.profile_save();self.b.locator('[data-action="home"]:visible').click();self.b.locator('[data-item="today"]').click();self.b.locator('[data-action="quiz-start"]').click();self.b.locator('[data-choice="UNDERSTOOD"]').click();self.b.locator('[data-action="understanding-save"]').click()
  self.open_a3('SYN-004');self.a3.locator('#revise').click();self.verify_items();self.publish_v1();self.open_b('SYN-004','ENC-SYN-004-DEMO');self.nav_b('profile');expect(self.b.locator('#main-content')).not_to_contain_text('가상 SYN002 주소');self.assertIsNone(self.personal(id='SYN-004'));self.open_b();self.nav_b('profile');expect(self.b.locator('#main-content')).to_contain_text('가상 SYN002 주소')
 def test_published_html_is_literal_not_executable(self):
  self.open_a3();self.a3.locator('[data-item="today"] textarea').fill('<img src=x onerror="window.pwned=1">합성 안내');self.a3.locator('[data-item="today"] textarea').press('Tab');self.verify_items();self.publish_v1();self.open_b();self.b.locator('[data-item="today"]').click();expect(self.b.locator('.focus-panel')).to_contain_text('<img');self.assertIsNone(self.b.evaluate('window.pwned'));expect(self.b.locator('.focus-panel img')).to_have_count(0)
 def test_mobile_large_font_all_routes_and_modal_keyboard(self):
  self.open_a3();self.publish_v1();self.open_b();out=Path('/tmp/a3b-verification/screenshots');out.mkdir(parents=True,exist_ok=True)
  for width in [390,768,1024,1440]:
   self.b.set_viewport_size({'width':width,'height':950});self.b.locator('[data-action="font"]:visible').first.click()
   if not self.b.locator('body').evaluate("e=>e.classList.contains('large-font')"):self.b.locator('[data-action="font"]:visible').first.click()
   for view in ['today','schedule','help','profile']:
    self.nav_b(view);self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{view} overflow {width}');self.assertTrue(self.b.locator('[data-action="font"]:visible').is_visible())
    if view in ['today','profile']:self.b.screenshot(path=str(out/f'after-{view}-{width}.png'),full_page=True)
   self.nav_b('today');self.b.locator('[data-item="today"]').click();self.b.locator('[data-action="about"]').click();self.b.locator('#patient-dialog [data-action="modal-close"]').focus();self.b.keyboard.press('Tab');self.assertTrue(self.b.evaluate('document.activeElement.closest("dialog")!==null'));self.b.keyboard.press('Escape');expect(self.b.locator('[data-action="about"]')).to_be_focused();self.b.locator('[data-action="quiz-start"]').click();self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
  self.b.reload();expect(self.b.locator('.quiz-container')).to_be_visible();self.assertTrue(self.b.locator('body').evaluate("e=>e.classList.contains('large-font')"));self.b.locator('[data-action="home"]:visible').click();self.b.set_viewport_size({'width':1440,'height':940});self.b.locator('.demo-tools > summary').click();self.b.get_by_role('link',name='통합 홈',exact=True).click();expect(self.b.get_by_role('heading',name='병원용 통합 워크벤치')).to_be_visible()

 def test_help_search_print_and_font_failure_feedback(self):
  self.open_a3();self.publish_v1();self.open_b();self.nav_b('help');self.b.locator('[data-action="toggle-help-search"]').click();self.b.locator('#help-search').fill('복약');expect(self.b.locator('.service-search-results')).to_contain_text('복약');self.b.locator('.service-search-results [data-item]').first.click();expect(self.b.locator('.detail-heading')).to_contain_text('복약')
  self.nav_b('help');self.b.evaluate('()=>{window.print=()=>{window.printed=document.querySelector("#main-content").innerText}}');self.b.locator('[data-action="print"]').click();self.assertIn('전체 안내',self.b.evaluate('window.printed'));self.assertNotIn('INTERNAL',self.b.evaluate('window.printed'))
  self.deny_writes(self.b,'care-transition-connected-b-font-v1');self.b.locator('[data-action="font"]').click();expect(self.b.locator('.inline-notice')).to_contain_text('글자 크기를 저장하지 못');self.assertTrue(self.b.locator('body').evaluate("e=>e.classList.contains('large-font')"))

 def test_recovery_after_revoke_requires_new_approval_and_keeps_revoked_history(self):
  self.open_a3();self.publish_v1();self.open_b();original=self.records()['SYN-002']['publications'][0]['id'];self.a3.locator('#revoke').click();expect(self.b.locator('.blocked')).to_be_visible();self.a3.locator('#revise').click();expect(self.b.locator('.blocked')).to_be_visible();self.verify_items();self.publish_v1();expect(self.b.locator('.version-meta')).to_contain_text('v2.0');history=self.records()['SYN-002']['publications'];self.assertEqual(len(history),2);self.assertEqual(history[1]['id'],original);self.assertEqual(history[1]['status'],'REVOKED');self.assertNotEqual(history[0]['id'],original)

 def test_unrepresentable_public_payload_never_claims_publication(self):
  self.open_a3();self.a3.locator('[data-item="today"] textarea').fill('가'*4001);self.a3.locator('[data-item="today"] textarea').press('Tab');self.verify_items();self.a3.locator('#request').click();self.a3.locator('#approve').click();self.open_b();self.a3.locator('#publish').click();expect(self.a3.locator('#toast')).to_contain_text('발행하지 못');self.assertEqual(self.records()['SYN-002']['draft']['status'],'APPROVED');self.assertEqual(self.records()['SYN-002']['publications'],[]);expect(self.b.locator('.blocked')).to_be_visible()

 def test_missing_approved_pdf_is_an_actionable_empty_state(self):
  self.open_a3();self.attach_pdf();self.publish_v1();self.open_b()
  self.b.evaluate("""async()=>{await new Promise((resolve,reject)=>{const request=indexedDB.open('care-transition-published-pdfs-v1',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('documents','readwrite');tx.objectStore('documents').clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};request.onerror=()=>reject(request.error)})}""")
  self.b.locator('[data-item="today"]').click();self.b.locator('[data-document]').click();expect(self.b.locator('.inline-notice')).to_contain_text('PDF 원본을 찾을 수 없습니다');expect(self.b.locator('#patient-dialog')).to_have_count(0);expect(self.b.locator('.focus-panel')).to_contain_text('의료진이 확인한 내용')
 def test_pdf_staging_rechecks_other_tab_before_committing_publication(self):
  self.open_a3();self.attach_pdf();self.a3.locator('#request').click();self.a3.locator('#approve').click();self.open_b()
  self.a3.evaluate("""()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);const pause=new Promise(resolve=>window.resumePDF=resolve);crypto.subtle.digest=async(...args)=>{window.stagingPDF=true;await pause;return digest(...args)}}""")
  self.a3.locator('#publish').click();self.a3.wait_for_function('window.stagingPDF===true')
  rival=self.ctx.new_page();rival.set_default_timeout(6000);rival.goto(self.base+'a3/index.html?screen=plan&patient=SYN-001');rival.locator('#request').click();self.a3.evaluate('window.resumePDF()')
  expect(self.a3.locator('#toast')).to_contain_text('발행 준비 중');self.assertEqual(self.records()['SYN-002']['publications'],[]);self.assertEqual(self.records()['SYN-001']['draft']['status'],'REVIEW_REQUESTED');expect(self.b.locator('.blocked')).to_be_visible()

 def test_touch_mobile_profile_understanding_and_navigation(self):
  self.open_a3();self.publish_v1();records=self.records()
  context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  try:
   page=context.new_page();page.set_default_timeout(6000);page.on('pageerror',lambda e:self.errors.append(str(e)));page.on('console',lambda m:self.errors.append(m.text) if m.type=='error' else None)
   page.goto(self.base+'patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO');page.evaluate('(args)=>localStorage.setItem(args.key,JSON.stringify(args.records))',{'key':KEY,'records':records});page.locator('#demo-code').fill('CARE2026');page.locator('#demo-code').press('Enter')
   page.locator('.bottom-nav [data-view="profile"]').tap();page.locator('[data-action="edit-start"]').tap();page.locator('#address').fill('가상 터치 주소');page.locator('#contact').fill('DEMO-TOUCH');page.locator('#profile-form button[type="submit"]').tap();page.locator('[data-action="modal-save"]').tap();self.assertEqual(self.personal(page)['profile']['address'],'가상 터치 주소')
   page.locator('.bottom-nav [data-view="today"]').tap();page.locator('[data-item="today"]').tap();page.locator('[data-action="quiz-start"]').tap();page.locator('[data-choice="HELP"]').tap();page.locator('[data-action="understanding-save"]').tap();expect(page.locator('.feedback')).to_contain_text('추가 설명');page.locator('.patient-mobile-journey [data-action="back"]:visible').tap();expect(page.locator('.detail-heading')).to_be_visible();page.locator('[data-action="about"]').tap();page.locator('[data-action="modal-close"]').tap();page.locator('[data-action="font"]').tap();self.assertTrue(page.locator('body').evaluate("e=>e.classList.contains('large-font')"));self.assertFalse(page.evaluate('document.documentElement.scrollWidth>innerWidth'))
  finally:context.close()

if __name__=='__main__':unittest.main(verbosity=2)
