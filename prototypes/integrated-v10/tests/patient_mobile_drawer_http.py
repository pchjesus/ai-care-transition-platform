"""Responsive patient hamburger menu / drawer regression; synthetic data only."""
import unittest
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
   self.assertLessEqual(head['height'],65)
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
  p.on('dialog',lambda dialog:dialog.dismiss())
  self.open_menu()
  p.locator('.side [data-view=today]').click()
  expect(p.locator('[data-comfort-form=personal] [name=label]')).to_have_value('보존 중인 임시 내용')
  expect(p.locator('.patient-drawer-open .side')).to_be_visible()
  self.assertFalse(p.evaluate('document.documentElement.scrollWidth>innerWidth'))
if __name__=='__main__':
 unittest.main(verbosity=2)
