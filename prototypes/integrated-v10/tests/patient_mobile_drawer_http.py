"""Responsive patient hamburger menu / drawer regression; synthetic data only."""
import unittest,json,os
from pathlib import Path
from playwright.sync_api import expect
import comfort_http as b

class MobileDrawer(unittest.TestCase):
 setUpClass=classmethod(b.Comfort.setUpClass.__func__)
 tearDownClass=classmethod(b.Comfort.tearDownClass.__func__)
 setUp=b.Comfort.setUp
 tearDown=b.Comfort.tearDown
 ready=b.Comfort.ready
 open_a3=b.Comfort.open_a3
 open_b=b.Comfort.open_b
 publish_v1=b.Comfort.publish_v1
 records=b.Comfort.records
 settings=b.Comfort.settings
 def open_menu(self):
  self.b.locator('[data-patient-drawer-toggle]').click()
  expect(self.b.locator('.patient-drawer-open .side')).to_be_visible()
  expect(self.b.locator('[data-patient-drawer-toggle]')).to_have_attribute('aria-expanded','true')
 def test_standalone_menu_accessible_and_compact(self):
  p=self.b
  p.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html')
  p.locator('#demo-code').fill('CARE2026')
  p.locator('#demo-code').press('Enter')
  for width in (390,600,760):
   p.set_viewport_size({'width':width,'height':800})
   head=p.locator('.app-layout .topline').bounding_box()
   self.assertAlmostEqual(head['height'],58,delta=0.5)
   expect(p.locator('.app-layout .topline .meta')).to_be_hidden()
   expect(p.locator('.patient-page-tools')).to_be_hidden()
   expect(p.locator('.bottom-nav.comfort-five-tabs button')).to_have_count(5)
   self.open_menu()
   expect(p.locator('.mobile-side-actions [data-action=font]')).to_be_visible()
   expect(p.locator('.side [data-nav=profile]')).to_be_visible()
   p.keyboard.press('Escape')
   expect(p.locator('[data-patient-drawer-toggle]')).to_be_focused()
   expect(p.locator('.side')).to_be_hidden()
   self.open_menu()
   p.locator('.side [data-nav=profile]').click()
   expect(p.get_by_role('heading',name='내 정보',exact=True)).to_be_visible()
   expect(p.locator('.side')).to_be_hidden()
   self.assertFalse(p.evaluate('document.documentElement.scrollWidth>innerWidth'))
   p.locator('.bottom-nav [data-nav=today]').click()
  p.set_viewport_size({'width':1440,'height':900})
  expect(p.locator('[data-patient-drawer-toggle]')).to_be_hidden()
  expect(p.locator('.side')).to_be_visible()
  expect(p.locator('.patient-page-tools [data-action=font]')).to_be_visible()
 def test_integrated_menu_font_and_unsaved_reminders(self):
  self.ready()
  p=self.b
  p.set_viewport_size({'width':390,'height':850})
  self.open_menu()
  p.locator('.mobile-side-actions [data-action=font]').click()
  expect(p.locator('body')).to_have_class(__import__('re').compile('large-font'))
  expect(p.locator('.patient-drawer-toggle')).to_be_visible()
  self.open_menu()
  p.locator('.side [data-view=reminders]').click()
  expect(p.locator('.comfort-inline')).to_be_visible()
  p.locator('#reminder-personal>summary').click()
  p.locator('[data-comfort-form=personal] [name=label]').fill('보존 중인 임시 내용')
  p.evaluate('window.confirm=()=>false')  # simulate rejecting unsaved changes without the baseline's auto-accepting dialog handler
  self.open_menu()
  p.locator('.side [data-view=today]').click()
  expect(p.locator('[data-comfort-form=personal] [name=label]')).to_have_value('보존 중인 임시 내용')
  expect(p.locator('.patient-drawer-open .side')).to_be_visible()
  self.assertFalse(p.evaluate('document.documentElement.scrollWidth>innerWidth'))
 def mobile_case(self,independent):
  self.ctx.close();self.ctx=self.browser.new_context(viewport={'width':390,'height':844},has_touch=True)
  self.a3=self.ctx.new_page();self.b=self.ctx.new_page();self.errors=[]
  for p in [self.a3,self.b]:
   p.set_default_timeout(6000);p.on('pageerror',lambda e:self.errors.append(str(e)));p.on('console',lambda m:self.errors.append(m.text) if m.type=='error' else None);p.on('dialog',lambda d:d.accept())
  if independent:
   self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html');self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
  else:self.ready()
 def touch_menu(self):
  self.b.locator('[data-patient-drawer-toggle]').tap();expect(self.b.locator('.patient-drawer-open .side')).to_be_visible()
  self.b.wait_for_function('()=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".side")).transform).m41)<0.5')
 def evidence(self,name,data):
  root=Path(os.environ.get('R13_FOCUS_EVIDENCE','/tmp/r13-focus-fix-evidence'));root.mkdir(parents=True,exist_ok=True);(root/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2));self.b.screenshot(path=str(root/(name+'.png')))
 def focus_state(self):return self.b.evaluate('''()=>{const e=document.activeElement;return {tag:e.tagName,text:e.textContent.slice(0,70),action:e.dataset.action,drawer:!!e.closest('.side')}}''')
 def drawer_focus(self,independent):
  self.mobile_case(independent);p=self.b;self.touch_menu();initial=self.focus_state();p.keyboard.press('Tab');self.evidence(('standalone' if independent else 'connected')+'-drawer',{'initial':initial,'afterTab':self.focus_state()})
  self.assertTrue(p.evaluate('document.querySelector(".side").contains(document.activeElement)'));self.assertEqual(initial['text'],'닫기 ×')
  side=p.locator('.side');summary=side.locator('.demo-tools>summary')
  for expanded in [False,True]:
   if expanded:summary.focus();p.keyboard.press('Enter')
   nodes=side.locator('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary').filter(visible=True)
   first,last=nodes.first,nodes.last;last.focus();p.keyboard.press('Tab');expect(first).to_be_focused();first.focus();p.keyboard.press('Shift+Tab');expect(last).to_be_focused()
   for _ in range(nodes.count()+2):p.keyboard.press('Tab');self.assertTrue(p.evaluate('document.querySelector(".side").contains(document.activeElement)'))
   # Recover even when focus was moved outside by another script or browser event.
   p.locator('[data-patient-drawer-toggle]').focus();p.keyboard.press('Tab');expect(first).to_be_focused();p.locator('[data-patient-drawer-toggle]').focus();p.keyboard.press('Shift+Tab');expect(last).to_be_focused()
  for action in ['escape','close','backdrop']:
   if action=='escape':p.keyboard.press('Escape')
   elif action=='close':p.locator('.side [data-patient-drawer-close]').click()
   else:p.locator('.patient-drawer-backdrop').click(position={'x':380,'y':100})
   expect(p.locator('.patient-drawer-open')).to_have_count(0);expect(p.locator('[data-patient-drawer-toggle]')).to_be_focused()
   if action!='backdrop':self.touch_menu()
  # A pending opening-focus frame must not steal focus after an immediate close.
  p.locator('[data-patient-drawer-toggle]').tap();p.keyboard.press('Escape');p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');expect(p.locator('[data-patient-drawer-toggle]')).to_be_focused();expect(p.locator('.patient-drawer-open')).to_have_count(0)
 def test_standalone_initial_focus_and_tab_trap(self):self.drawer_focus(True)
 def test_connected_initial_focus_and_tab_trap(self):self.drawer_focus(False)
 def tour_focus(self,independent):
  self.mobile_case(independent);p=self.b
  for exit in ['escape','skip','close','finish','desktop-resize']:
   p.set_viewport_size({'width':390,'height':844});before=p.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');self.touch_menu();p.locator('.mobile-side-actions [data-comfort=tour]').click();expect(p.locator('.patient-drawer-open')).to_have_count(0);expect(p.locator('#patient-brief-tour')).to_be_visible()
   if exit=='finish':
    for step in range(3):
     p.locator('.spot-tip [data-tour-control=try]').click()
     if step<2:p.locator('[data-tour-control=next]').click()
    p.locator('#tour-finish').click()
   elif exit=='desktop-resize':p.locator('[data-tour-control=next]').click();p.set_viewport_size({'width':1440,'height':900});p.keyboard.press('Escape')
   elif exit=='escape':p.keyboard.press('Escape')
   else:p.locator('[data-tour-control='+exit+']').click()
   self.assertEqual(p.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),before);self.evidence(('standalone' if independent else 'connected')+'-tour-'+exit,self.focus_state());expect(p.locator('#patient-brief-tour')).to_have_count(0)
   target=p.locator('.patient-page-tools [data-comfort=tour]') if exit=='desktop-resize' else p.locator('[data-patient-drawer-toggle]')
   expect(target).to_be_visible();expect(target).to_be_focused()
 def test_standalone_tutorial_return_focus(self):self.tour_focus(True)
 def test_connected_tutorial_return_focus(self):self.tour_focus(False)
if __name__=='__main__':
 unittest.main(verbosity=2)
