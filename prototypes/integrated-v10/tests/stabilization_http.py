"""Phase 3 risk probes plus UX; real HTTP Chromium without external clinical services."""
from pathlib import Path
from datetime import datetime,timezone
import unittest
from playwright.sync_api import expect
import comfort_http as comfort
class Stabilization(unittest.TestCase):
 setUpClass=classmethod(comfort.Comfort.setUpClass.__func__)
 tearDownClass=classmethod(comfort.Comfort.tearDownClass.__func__)
 setUp=comfort.Comfort.setUp
 tearDown=comfort.Comfort.tearDown
 for method in ['ready','open_a3','open_b','publish_v1','verify_items','records','appointment','settings','personal','prefs','followup','close','settled','destination']:
  locals()[method]=getattr(comfort.Comfort,method)
 def other(self):
  page=self.ctx.new_page();page.set_default_timeout(6000);page.on('pageerror',lambda e:self.errors.append(str(e)));page.goto(self.b.url);page.locator('#demo-code').fill('CARE2026');page.locator('#demo-code').press('Enter');return page
 def clock(self,hour,minute):self.b.clock.install(time=datetime(2030,1,2,hour,minute,tzinfo=timezone.utc))
 def test_open_inbox_immediately_honors_other_tab_disable_and_corruption(self):
  self.ready();before=self.records();self.clock(7,31);self.settings();self.personal();self.close();self.b.locator('[data-comfort=inbox]').first.click();expect(self.b.locator('.comfort-list')).to_contain_text('개인 알림 시연')
  other=self.other();self.settings(other);other.locator('[data-comfort=personal-toggle]').first.click();self.settled(other);expect(self.b.locator('.comfort-list')).not_to_contain_text('개인 알림 시연');other.locator('[data-comfort=personal-toggle]').first.click();self.settled(other);expect(self.b.locator('.comfort-list')).to_contain_text('개인 알림 시연')
  other.evaluate('()=>localStorage.setItem(Object.keys(localStorage).find(k=>k.startsWith("carebridge-reminders-v1:")),"{bad")');expect(self.b.locator('#comfort-dialog')).to_contain_text('저장 자료를 읽지 못했어요');expect(self.b.locator('.comfort-list')).not_to_contain_text('개인 알림 시연');self.assertEqual(self.records(),before)
 def test_upcoming_recalculation_preserves_unsaved_input_focus_and_storage(self):
  self.ready();self.clock(7,29);self.settings();self.personal();upcoming=self.b.locator('section').filter(has=self.b.get_by_role('heading',name='예정 알림',exact=True));expect(upcoming).to_contain_text('개인 준비')
  field=self.b.locator('[data-comfort-form=personal] [name=label]');field.fill('아직 저장하지 않은 입력');before=self.b.evaluate('JSON.stringify({...localStorage})');self.b.clock.set_fixed_time(datetime(2030,1,2,7,31,tzinfo=timezone.utc));self.b.evaluate('window.dispatchEvent(new Event("focus"))');expect(upcoming).not_to_contain_text('개인 준비');expect(field).to_have_value('아직 저장하지 않은 입력');expect(field).to_be_focused();self.assertEqual(self.b.evaluate('JSON.stringify({...localStorage})'),before)
 def test_settings_keep_stale_writer_blocked_when_live_upcoming_refreshes(self):
  self.ready();self.clock(7,29);self.settings();self.personal();field=self.b.locator('[data-comfort-form=personal] [name=label]');field.fill('이 탭의 입력');other=self.other();self.settings(other);other.locator('[data-comfort=personal-toggle]').first.click();self.settled(other);expect(field).to_have_value('이 탭의 입력');self.personal(label='다른 탭 자료를 덮어쓰면 안 됨');expect(self.b.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');self.assertFalse(next(iter(self.prefs()['plans'].values()))['personal'][0]['enabled']);expect(field).to_have_value('다른 탭 자료를 덮어쓰면 안 됨')
  self.b.evaluate('()=>window.dispatchEvent(new StorageEvent("storage",{key:Object.keys(localStorage).find(k=>k.startsWith("carebridge-reminders-v1:"))}))');expect(self.b.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');expect(field).to_have_value('다른 탭 자료를 덮어쓰면 안 됨')
 def test_readable_zone_preserves_detected_and_saved_zones_and_invalid_input(self):
  self.ready();detected=self.b.evaluate('Intl.DateTimeFormat().resolvedOptions().timeZone');self.settings();select=self.b.locator('[data-comfort-form=zone] select');expect(select).to_have_value(detected);expect(select.locator('option:checked')).to_contain_text('세계 표준시' if detected=='UTC' else '시간');self.assertIsNone(self.prefs())
  select.select_option('Asia/Seoul');self.b.locator('[data-comfort-form=zone] button').click();self.settled();self.assertEqual(self.prefs()['zone'],'Asia/Seoul');expect(self.b.locator('#comfort-dialog')).to_contain_text('한국 시간(서울, UTC+9)');self.close();self.b.reload();self.settings();expect(self.b.locator('[data-comfort-form=zone] select')).to_have_value('Asia/Seoul')
  self.b.locator('[data-comfort-form=zone] details > summary').click();self.b.locator('[name=custom-zone]').fill('Bad/Zone');self.b.locator('[data-comfort-form=zone] button').click();expect(self.b.locator('#comfort-notice')).to_contain_text('시간대를 확인');self.assertEqual(self.prefs()['zone'],'Asia/Seoul');expect(self.b.locator('[name=custom-zone]')).to_have_value('Bad/Zone')
 def test_patient_tour_zoom_missing_target_and_exact_screen_restore(self):
  self.ready();self.b.set_viewport_size({'width':390,'height':844});self.b.locator('[data-action=font]').first.click();self.b.locator('.bottom-nav [data-view=profile]').click();before=self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');self.b.locator('[data-comfort=tour]').click();session=self.ctx.new_cdp_session(self.b);session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':2})
  for step in [1,2,3]:
   self.b.wait_for_timeout(80);r=self.b.locator('.spot-tip').evaluate('(e)=>{const r=e.getBoundingClientRect(),v=visualViewport;return {x:r.x-v.offsetLeft,y:r.y-v.offsetTop,w:r.width,h:r.height,vw:v.width,vh:v.height}}');self.assertGreaterEqual(r['x'],-1);self.assertGreaterEqual(r['y'],-1);self.assertLessEqual(r['x']+r['w'],r['vw']+1);self.assertLessEqual(r['y']+r['h'],r['vh']+1)
   if step<3:self.b.locator('[data-tour-control=next]').evaluate('e=>e.click()')
  self.b.locator('.service-page').evaluate('e=>e.remove()');expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-fallback','true');self.b.keyboard.press('Escape');session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1});expect(self.b.get_by_role('heading',name='내 정보',exact=True)).to_be_visible();expect(self.b.locator('[data-comfort=tour]')).to_be_focused();self.assertEqual(self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),before)
 def test_combined_a1_a2_a3_b_approved_schedule_pdf_reminders_and_tours(self):
  self.a3.goto(self.base+'a3/index.html?screen=patients&patient=SYN-002');self.a3.locator('[data-patient-pick="SYN-002"][data-target-screen=assessment]:visible').click();self.a3.locator('#a2-field-gait').select_option('device');self.a3.locator('#handoff-a2').click();expect(self.a3.locator('#a3-screen')).to_be_visible();self.a3.locator('[data-tab=plan]').click();self.appointment();self.verify_items();self.destination()
  self.a3.locator('[data-tab=documents]').click();self.a3.locator('#file-attach').set_input_files(str(Path(__file__).resolve().parents[1]/'a3/examples/SYN-002_sample_care_plan.pdf'));self.a3.locator('[data-doc-edit]').select_option('PATIENT');self.a3.locator('[data-doc-category]').select_option('MEDICATION');self.a3.locator('[data-action=review-doc]').click();self.publish_v1();self.open_b();self.settings();self.followup();self.personal(label='조합 준비');pub=self.records()['SYN-002']['publications'][0];self.assertIn(pub['id'],self.prefs()['plans']);self.assertEqual(self.prefs()['plans'][pub['id']]['assessmentId'],pub['assessmentId']);self.close()
  self.b.locator('[data-comfort=documents]').first.click();self.b.locator('[data-comfort=document-open]').click();expect(self.b.locator('#patient-dialog iframe')).to_be_visible()
  with self.b.expect_download() as downloaded:self.b.get_by_role('link',name='PDF 파일 저장',exact=True).click()
  self.assertTrue(Path(downloaded.value.path()).read_bytes().startswith(b'%PDF-'));self.b.keyboard.press('Escape');self.b.locator('[data-view=help]:visible').first.click();self.b.locator('[data-comfort=map]').click();expect(self.b.locator('[data-map-link]')).to_have_attribute('href',__import__('re').compile(r'^https://map\.kakao\.com/link/to/'));self.close()
  before=self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');self.b.locator('[data-comfort=tour]').click();self.b.locator('[data-tour-control=next]').click();self.b.locator('[data-tour-control=next]').click();self.b.locator('#tour-finish').click();self.assertEqual(self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),before)
  self.a3.locator('[data-nav=learn]').click();before=self.a3.evaluate('JSON.stringify({...localStorage})');self.a3.locator('[data-learn-guided-tour]').click()
  for _ in range(9):self.a3.locator('[data-tour-control=next]').click()
  self.a3.keyboard.press('Escape');self.assertEqual(self.a3.evaluate('JSON.stringify({...localStorage})'),before);self.a3.locator('[data-nav=plan]').click();self.a3.locator('#revoke').click();expect(self.b.locator('.blocked')).to_be_visible();self.b.locator('[data-comfort=inbox]').click();expect(self.b.locator('.comfort-list')).to_contain_text('철회');expect(self.b.locator('.comfort-list')).not_to_contain_text('조합 준비')
 def test_both_patient_modal_four_widths_keyboard_scroll_and_large_font(self):
  self.ready();out=Path('/tmp/phase3-screenshots');out.mkdir(exist_ok=True)
  for standalone in [False,True]:
   if standalone:self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html');self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
   self.b.locator('[data-action=font]').first.click()
   for width in [390,768,1024,1440]:
    self.b.set_viewport_size({'width':width,'height':844});self.settings();dialog=self.b.locator('#comfort-dialog');r=dialog.bounding_box();self.assertGreaterEqual(r['x'],0);self.assertLessEqual(r['x']+r['width'],width+1);self.assertLessEqual(r['height'],844);self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'));self.assertFalse(dialog.evaluate('e=>e.scrollWidth>e.clientWidth+1'))
    if width in [390,1440]:self.b.screenshot(path=str(out/f'{"independent" if standalone else "connected"}-settings-{width}.png'))
    self.b.locator('[data-comfort-form=important] button').focus();self.b.keyboard.press('Tab');expect(self.b.locator('[data-comfort=close]')).to_be_focused();r=self.b.locator('[data-comfort=close]').bounding_box();self.assertGreaterEqual(r['y'],0);self.close()
 def test_settings_modal_stays_inside_visual_viewport_at_two_hundred_percent(self):
  self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html');self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter');self.b.set_viewport_size({'width':390,'height':844});self.b.locator('[data-action=font]').first.click();self.settings();session=self.ctx.new_cdp_session(self.b);session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':2});self.b.wait_for_timeout(100)
  rect=self.b.locator('#comfort-dialog').evaluate('(e)=>{const r=e.getBoundingClientRect(),v=visualViewport;return {x:r.x-v.offsetLeft,y:r.y-v.offsetTop,w:r.width,h:r.height,vw:v.width,vh:v.height}}');self.assertGreaterEqual(rect['x'],-1);self.assertGreaterEqual(rect['y'],-1);self.assertLessEqual(rect['x']+rect['w'],rect['vw']+1);self.assertLessEqual(rect['y']+rect['h'],rect['vh']+1);self.assertFalse(self.b.locator('#comfort-dialog').evaluate('e=>e.scrollWidth>e.clientWidth+1'));self.b.keyboard.press('Escape');session.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1})
if __name__=='__main__':unittest.main(verbosity=2)
