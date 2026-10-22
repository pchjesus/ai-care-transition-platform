"""Foreground-only convenience MVP: real Chromium, synthetic data, no external calls."""
from pathlib import Path
from playwright.sync_api import expect
import patient_http as baseline
KEY=baseline.KEY
from datetime import datetime,timezone
import unittest,json,tempfile
class Comfort(unittest.TestCase):
 setUpClass=classmethod(baseline.PatientIntegration.setUpClass.__func__)
 tearDownClass=classmethod(baseline.PatientIntegration.tearDownClass.__func__)
 setUp=baseline.PatientIntegration.setUp
 tearDown=baseline.PatientIntegration.tearDown
 open_a3=baseline.PatientIntegration.open_a3
 open_b=baseline.PatientIntegration.open_b
 publish_v1=baseline.PatientIntegration.publish_v1
 verify_items=baseline.PatientIntegration.verify_items
 records=baseline.PatientIntegration.records
 def ready(self,appointment=False):
  self.open_a3()
  if appointment:self.appointment()
  self.publish_v1();self.open_b()
 def appointment(self):
  card=self.a3.locator('[data-item="followup"]');card.locator(':scope > summary').click()
  for key,value in [('date','2030-01-03'),('time','10:00'),('place','합성 진료 장소')]:self.a3.locator(f'[data-appointment="{key}"]').fill(value);self.a3.locator(f'[data-appointment="{key}"]').press('Tab')
  self.a3.locator('[data-appointment=status]').select_option('CONFIRMED');self.a3.locator('#actor').select_option('APPROVER');self.a3.locator('[data-item=followup] [data-edit=verified]').check()
 def settings(self,page=None):
  p=page or self.b
  if not p.locator('.comfort-inline').count():p.locator('[data-view=reminders]:visible,[data-nav=reminders]:visible').first.click()
  expect(p.locator('#comfort-dialog')).to_be_visible()
  p.locator('.comfort-inline .reminder-group,.comfort-inline #reminder-options').evaluate_all('nodes=>nodes.forEach(e=>e.open=true)')
 def inbox(self,page=None):
  self.settings(page);(page or self.b).locator('#reminder-inbox').scroll_into_view_if_needed()
 def personal(self,page=None,label='개인 준비',lead='30'):
  p=page or self.b;f=p.locator('[data-comfort-form=personal]');f.locator('[name=label]').fill(label);f.locator('[name=date]').fill('2030-01-02');f.locator('[name=time]').fill('08:00');f.locator('[name=lead]').select_option(lead);f.locator('button[type=submit]').click();expect(p.locator('#comfort-dialog')).not_to_have_attribute('aria-busy','true')
 def settled(self,page=None):expect((page or self.b).locator('#comfort-dialog')).not_to_have_attribute('aria-busy','true')
 def prefs(self,page=None):return (page or self.b).evaluate('JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith("carebridge-reminders-v1:"))))')
 def followup(self,page=None):
  p=page or self.b;f=p.locator('[data-comfort-form=followup]');f.locator('[name=enabled]').check();f.locator('[name=sameDay]').check();f.locator('button[type=submit]').click();expect(p.locator('#comfort-notice')).to_contain_text('저장했어요')
 def close(self,page=None):
  p=page or self.b
  if p.locator('.comfort-inline').count():p.locator('[data-view=today]:visible,[data-nav=today]:visible').first.click()
  else:p.locator('[data-comfort=close]').click()

 def test_personal_create_leads_disable_edit_delete_restore_and_no_prescription_inference(self):
  self.ready();before=self.records();self.settings();expect(self.b.locator('#comfort-dialog')).to_contain_text('구조화 복약 시각이 없어')
  for lead in ['0','10','30']:
   self.personal(label='개인 준비 '+lead,lead=lead);expect(self.b.locator('#comfort-notice')).to_contain_text('저장했어요')
  self.personal(label='개인 준비 30',lead='30');expect(self.b.locator('#comfort-notice')).to_contain_text('이미 있어요');s=next(iter(self.prefs()['plans'].values()));self.assertEqual([m['lead'] for m in s['personal']],[0,10,30]);self.b.locator('[data-comfort=personal-toggle]').first.click();self.settled();self.assertFalse(next(iter(self.prefs()['plans'].values()))['personal'][0]['enabled']);self.b.locator('[data-comfort=personal-edit]').first.click();self.b.locator('[data-comfort-form=personal] [name=label]').fill('<img src=x onerror=window.pwned=1>');self.b.locator('[data-comfort-form=personal] button[type=submit]').click();self.settled();self.assertFalse(next(iter(self.prefs()['plans'].values()))['personal'][-1]['enabled']);self.assertIsNone(self.b.evaluate('window.pwned'));expect(self.b.locator('#comfort-dialog img')).to_have_count(0)
  self.close();self.b.reload();self.settings();expect(self.b.locator('#reminder-personal .comfort-list')).to_contain_text('<img');self.b.locator('[data-comfort=personal-delete]').first.click();self.settled();self.assertEqual(len(next(iter(self.prefs()['plans'].values()))['personal']),2);self.assertEqual(self.records(),before)
 def test_confirmed_schedule_due_inbox_duplicate_seen_and_past_schedule(self):
  self.ready(True);self.settings();self.b.locator('[data-comfort-form=zone] select').select_option('Asia/Seoul');self.b.locator('[data-comfort-form=zone] button').click();self.followup();self.b.clock.install(time=datetime(2030,1,2,0,1,tzinfo=timezone.utc));self.close();self.inbox();expect(self.b.locator('#reminder-inbox .comfort-list')).to_contain_text('외래 준비 알림');self.assertEqual(self.b.locator('#reminder-inbox .comfort-list li').count(),2)
  self.b.locator('[data-comfort=seen]').first.click();self.close();self.inbox();self.assertEqual(self.b.locator('#reminder-inbox .comfort-list li').count(),2);self.close();self.b.clock.set_fixed_time(datetime(2030,1,4,tzinfo=timezone.utc));self.settings();expect(self.b.locator('#comfort-dialog')).to_contain_text('앞으로 예정된 알림이 없어요')
 def test_pending_schedule_does_not_create_an_appointment_and_personal_is_separate(self):
  self.ready();self.settings();expect(self.b.locator('[data-comfort-form=followup]')).to_have_count(0);expect(self.b.locator('#comfort-dialog')).to_contain_text('확정 날짜가 없어');self.personal();self.assertEqual(self.b.locator('[data-comfort-form=followup]').count(),0);self.assertIn('개인 입력',self.b.locator('#comfort-dialog').inner_text())
 def test_revision_replacement_revoke_and_patient_change_disable_old_settings(self):
  self.ready(True);self.settings();self.followup();self.personal();old=self.prefs();self.a3.locator('#revise').click();self.assertEqual(self.prefs(),old);expect(self.b.locator('#comfort-dialog')).to_contain_text('개인 준비');self.verify_items();self.publish_v1()
  # Old preferences remain as history but the new version starts with no active alerts.
  self.close();self.settings();expect(self.b.locator('[data-comfort=personal-delete]')).to_have_count(0);self.assertFalse(self.b.locator('[data-comfort-form=followup] [name=enabled]').is_checked());self.close();self.a3.locator('#revoke').click();expect(self.b.locator('.blocked')).to_be_visible();self.inbox();expect(self.b.locator('#reminder-inbox .comfort-list')).to_contain_text('철회');expect(self.b.locator('[data-comfort=personal-delete]')).to_have_count(0);self.assertEqual(self.prefs(),old)
  self.close();self.open_b('SYN-001','ENC-SYN-001-DEMO');expect(self.b.locator('.blocked')).to_be_visible();expect(self.b.locator('#main-content')).not_to_contain_text('개인 준비')
 def test_stale_tab_quota_denial_and_corruption_preserve_data_and_form(self):
  self.ready();self.settings();other=self.ctx.new_page();other.on('pageerror',lambda e:self.errors.append(str(e)));other.goto(self.b.url);other.locator('#demo-code').fill('CARE2026');other.locator('#demo-code').press('Enter');self.settings(other);self.personal();before=self.prefs();self.personal(other,label='두 번째 탭');expect(other.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');self.assertEqual(other.locator('[data-comfort-form=personal] [name=label]').input_value(),'두 번째 탭');self.assertEqual(self.prefs(),before)
  self.b.evaluate('''()=>{const original=Storage.prototype.setItem;window.restoreWrites=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(k,v){if(k.startsWith('carebridge-reminders-v1:'))throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v)}}''');self.personal(label='저장 실패 입력');expect(self.b.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');self.assertEqual(self.b.locator('[data-comfort-form=personal] [name=label]').input_value(),'저장 실패 입력');self.assertEqual(self.prefs(),before);self.b.evaluate('restoreWrites()');self.close()
  self.b.evaluate('()=>{const k=Object.keys(localStorage).find(k=>k.startsWith("carebridge-reminders-v1:"));localStorage.setItem(k,"{bad") }');self.settings();expect(self.b.locator('#comfort-dialog')).to_contain_text('저장 자료를 읽지 못했어요');self.personal();expect(self.b.locator('#comfort-notice')).to_contain_text('덮어쓰지 않았어요');self.assertEqual(self.b.evaluate('localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith("carebridge-reminders-v1:")))'),'{bad')
 def test_simultaneous_writers_serialize_and_closed_pending_save_is_cancelled(self):
  self.ready();self.settings();key='carebridge:carebridge-reminders-v1:connected:SYN-002:ENC-SYN-002-DEMO';self.a3.evaluate("key=>{window.held=false;navigator.locks.request(key,()=>new Promise(resolve=>{window.releaseReminderLock=resolve;window.held=true}))}",key);self.a3.wait_for_function('window.held')
  f=self.b.locator('[data-comfort-form=personal]');f.locator('[name=label]').fill('취소할 대기 입력');f.locator('[name=date]').fill('2030-01-02');f.locator('[name=time]').fill('08:00');f.locator('button').click();expect(self.b.locator('#comfort-dialog')).to_have_attribute('aria-busy','true');self.close();self.a3.evaluate('releaseReminderLock()');self.b.wait_for_timeout(60);self.assertIsNone(self.prefs());self.settings();self.personal(label='다시 저장');expect(self.b.locator('#comfort-notice')).to_contain_text('저장했어요')
  other=self.ctx.new_page();other.on('pageerror',lambda e:self.errors.append(str(e)));other.goto(self.b.url);other.locator('#demo-code').fill('CARE2026');other.locator('#demo-code').press('Enter');self.settings(other);self.a3.evaluate("key=>{window.held=false;navigator.locks.request(key,()=>new Promise(resolve=>{window.releaseReminderLock=resolve;window.held=true}))}",key);self.a3.wait_for_function('window.held')
  for page,label in [(self.b,'첫 탭 동시 저장'),(other,'둘째 탭 동시 저장')]:
   f=page.locator('[data-comfort-form=personal]');f.locator('[name=label]').fill(label);f.locator('[name=date]').fill('2030-01-02');f.locator('[name=time]').fill('08:00');f.locator('button').click();expect(page.locator('#comfort-dialog')).to_have_attribute('aria-busy','true')
  self.a3.evaluate('releaseReminderLock()');other.bring_to_front();self.settled(other);self.settled();expect(self.b.locator('#comfort-notice')).to_contain_text('저장했어요');expect(other.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');labels=[x['label'] for x in next(iter(self.prefs()['plans'].values()))['personal']];self.assertIn('첫 탭 동시 저장',labels);self.assertNotIn('둘째 탭 동시 저장',labels)

 def test_read_permission_denial_is_not_reported_as_saved(self):
  self.ready();self.b.evaluate('''()=>{const read=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k.startsWith('carebridge-reminders-v1:'))throw new DOMException('denied','SecurityError');return read.call(this,k)}}''');self.settings();self.personal();expect(self.b.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');self.assertIsNone(self.b.evaluate('Object.keys(localStorage).find(k=>k.startsWith("carebridge-reminders-v1:"))'))
 def test_independent_settings_survive_actual_chromium_restart_without_a3_data(self):
  url=self.base.replace('prototypes/integrated-v10/','')+'patient/index.html'
  with tempfile.TemporaryDirectory() as profile:
   for iteration in [0,1]:
    ctx=self.p.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],timezone_id='Asia/Seoul');page=ctx.new_page();page.on('pageerror',lambda e:self.errors.append(str(e)));page.goto(url);page.locator('#demo-code').fill('CARE2026');page.locator('#demo-code').press('Enter');self.settings(page)
    if iteration==0:self.personal(page,label='재시작 개인 알림')
    else:expect(page.locator('#comfort-dialog')).to_contain_text('재시작 개인 알림');self.assertEqual(self.prefs(page)['source'],'independent');self.assertFalse(page.evaluate('(key)=>!!localStorage.getItem(key)',KEY))
    ctx.close()
 def destination(self):
  self.a3.locator('#actor').select_option('APPROVER');self.a3.locator('.a3-destination > summary').click()
  for key,value in [('name','합성 지도검사 목적지'),('address','합성 기능검사용 주소 — 실제 사용 금지'),('latitude','37.5'),('longitude','127.0'),('sourceUrl','https://hospital.example.org/directions')]:self.a3.locator(f'[data-destination={key}]').fill(value);self.a3.locator(f'[data-destination={key}]').press('Tab')
  self.a3.locator('[data-destination=verified]').check();self.a3.locator('[data-item=followup] [data-edit=verified]').check()
 def test_map_verified_snapshot_external_link_blocked_fallback_and_missing_address(self):
  self.open_a3();self.appointment();self.destination();self.publish_v1();self.open_b();self.b.locator('[data-view=schedule]:visible').first.click();self.b.locator('[data-comfort=map]').click();expect(self.b.locator('#comfort-dialog')).to_contain_text('현재 위치')
  self.ctx.route('https://map.kakao.com/**',lambda r:r.fulfill(status=200,body='External map contract test only'))
  with self.b.expect_popup() as event:self.b.locator('[data-map-link]').click()
  popup=event.value;popup.wait_for_load_state();self.assertTrue(popup.url.startswith('https://map.kakao.com/link/to/'));self.assertNotIn('SYN-',popup.url);self.assertIsNone(popup.evaluate('window.opener'));popup.close();self.ctx.unroute('https://map.kakao.com/**');failed=[];self.ctx.on('requestfailed',lambda r:failed.append(r.url));self.ctx.route('https://map.kakao.com/**',lambda r:r.abort('internetdisconnected'))
  with self.b.expect_popup() as blocked_event:self.b.locator('[data-map-link]').click()
  blocked_event.value.wait_for_timeout(150);self.assertTrue(any(url.startswith('https://map.kakao.com/link/to/') for url in failed));blocked_event.value.close();self.b.locator('[data-comfort=map-fallback]').click();expect(self.b.locator('#map-fallback textarea')).to_have_value('합성 기능검사용 주소 — 실제 사용 금지');self.close()
  self.a3.locator('#revise').click();self.a3.locator('[data-appointment=place]').fill('변경된 합성 장소');self.a3.locator('[data-appointment=place]').press('Tab');self.verify_items();self.publish_v1();self.b.locator('[data-view=schedule]:visible').first.click();expect(self.b.locator('[data-comfort=map]')).to_be_disabled()
 def test_destination_edit_approval_invalidation_and_failed_save_rollback(self):
  self.open_a3();self.appointment();self.a3.locator('#request').click();self.a3.locator('#approve').click();before=self.records();self.a3.locator('.a3-destination > summary').click();self.a3.evaluate("key=>{const write=Storage.prototype.setItem;window.restoreDestinationWrites=()=>{Storage.prototype.setItem=write};Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('quota','QuotaExceededError');return write.call(this,k,v)}}",KEY);self.a3.locator('[data-destination=name]').fill('저장 실패 목적지');self.a3.locator('[data-destination=name]').press('Tab');self.assertEqual(self.records(),before);expect(self.a3.locator('#publish')).to_be_enabled();self.a3.evaluate('restoreDestinationWrites()');self.a3.locator('.a3-destination > summary').click();self.a3.locator('[data-destination=name]').fill('재검토 목적지');self.a3.locator('[data-destination=name]').press('Tab');self.assertIsNone(self.records()['SYN-002']['draft']['approval']);expect(self.a3.locator('#publish')).to_be_hidden();self.a3.locator('#publish').evaluate('e=>e.click()');self.assertEqual(self.records()['SYN-002']['publications'],[])
 def test_medication_pdf_category_exact_download_and_revoke_access(self):
  self.open_a3();self.a3.locator('[data-tab=documents]').click();self.a3.locator('#file-attach').set_input_files(str(Path(__file__).resolve().parents[1]/'a3/examples/SYN-002_sample_care_plan.pdf'));self.a3.locator('[data-doc-edit]').select_option('PATIENT');self.a3.locator('[data-doc-category]').select_option('MEDICATION');self.a3.locator('#actor').select_option('APPROVER');self.a3.locator('[data-action=review-doc]').click();self.publish_v1();self.open_b();self.b.locator('[data-comfort=documents]').first.click();expect(self.b.locator('#comfort-dialog section').filter(has=self.b.get_by_role('heading',name='복약 관련 PDF'))).to_contain_text('SYN-002_sample');self.b.locator('[data-comfort=document-open]').click();expect(self.b.locator('#patient-dialog iframe')).to_be_visible()
  with self.b.expect_download() as event:self.b.get_by_role('link',name='PDF 파일 저장',exact=True).click()
  self.assertTrue(Path(event.value.path()).read_bytes().startswith(b'%PDF-'));self.a3.locator('#revoke').click();expect(self.b.locator('#patient-dialog')).to_have_count(0);expect(self.b.locator('[data-comfort=documents]')).to_have_count(0)
 def test_both_tours_four_widths_menu_large_font_storage_keyboard_and_restore(self):
  self.ready();out=Path('/tmp/comfort-verification');out.mkdir(exist_ok=True)
  for standalone in [False,True]:
   if standalone:self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html');self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
   self.b.locator('[data-action=font]').first.click()
   for width in [390,768,1024,1440]:
    self.b.set_viewport_size({'width':width,'height':950});self.b.wait_for_timeout(80)
    if width==390:
     self.assertLessEqual(self.b.locator('.topline').bounding_box()['height'],80);expect(self.b.locator('.patient-mobile-journey')).to_be_visible();expect(self.b.locator('.patient-page-tools [data-action=font]')).to_be_visible()
    snapshot=self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');self.b.locator('[data-comfort=tour]').first.click()
    for step in range(1,4):
     expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-step',str(step));self.b.wait_for_timeout(50);r=self.b.locator('.spot-tip').bounding_box();self.assertGreaterEqual(r['x'],0);self.assertLessEqual(r['x']+r['width'],width+1);self.assertEqual(self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),snapshot)
     if step<3:self.b.locator('[data-tour-control=next]').click()
    self.b.keyboard.press('Escape');expect(self.b.locator('[data-comfort=tour]').first).to_be_focused();self.assertEqual(self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),snapshot);self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'));self.b.screenshot(path=str(out/f'{"independent" if standalone else "connected"}-{width}.png'),full_page=True)
 def test_optional_important_inbox_read_is_separate_from_understanding(self):
  self.ready();before=self.b.evaluate('()=>localStorage.getItem("care-transition-connected-b-personal-v1:SYN-002:ENC-SYN-002-DEMO")');self.settings();f=self.b.locator('[data-comfort-form=important]');f.locator('input').check();f.locator('button').click();self.settled();self.close();self.inbox();expect(self.b.locator('#reminder-inbox .comfort-list')).to_contain_text('중요 안내');self.b.locator('[data-comfort=seen]').last.click();self.settled();self.assertEqual(self.b.evaluate('()=>localStorage.getItem("care-transition-connected-b-personal-v1:SYN-002:ENC-SYN-002-DEMO")'),before)
 def test_patient_tour_restores_profile_and_finish_focus_without_auto_start(self):
  self.ready();self.b.locator('[data-view=reminders]:visible').first.click();self.b.locator('#reminder-personal>summary').click();entry=self.b.locator('#reminder-personal input[name=label]');expect(entry).to_be_visible();self.close();expect(self.b.locator('#patient-brief-tour')).to_have_count(0);self.b.locator('[data-view=profile]:visible').first.click();before=self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');self.b.locator('[data-comfort=tour]').click();self.b.locator('[data-tour-control=next]').click();self.b.locator('[data-tour-control=next]').click();self.b.locator('#tour-finish').click();expect(self.b.get_by_role('heading',name='내 정보',exact=True)).to_be_visible();expect(self.b.locator('[data-comfort=tour]')).to_be_focused();self.assertEqual(self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),before)
 def test_touch_settings_tour_and_navigation(self):
  self.ready();storage=self.ctx.storage_state();ctx=self.browser.new_context(storage_state=storage,viewport={'width':390,'height':844},has_touch=True,is_mobile=True,timezone_id='Asia/Seoul');p=ctx.new_page();p.on('pageerror',lambda e:self.errors.append(str(e)));p.goto(self.b.url);p.locator('#demo-code').fill('CARE2026');p.locator('#demo-code').press('Enter');p.locator('[data-comfort=settings]').first.tap();expect(p.locator('#comfort-dialog')).to_be_visible();p.locator('.bottom-nav [data-view=today]').tap();p.locator('[data-comfort=tour]').first.tap();p.locator('[data-tour-control=next]').tap();p.locator('[data-tour-control=previous]').tap();expect(p.locator('#patient-brief-tour')).to_have_attribute('data-step','1');p.locator('[data-tour-control=skip]').tap();p.locator('.patient-mobile-journey [data-action=home]').tap();self.assertFalse(p.evaluate('document.documentElement.scrollWidth>innerWidth'));ctx.close()
if __name__=='__main__':unittest.main(verbosity=2)
