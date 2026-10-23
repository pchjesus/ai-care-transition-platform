"""R13 elderly-oriented travel UI: synthetic, no taxi vendor or booking integration."""
from pathlib import Path
import unittest
from playwright.sync_api import expect
import comfort_http as c

class TravelUI(unittest.TestCase):
    setUpClass = classmethod(c.Comfort.setUpClass.__func__)
    tearDownClass = classmethod(c.Comfort.tearDownClass.__func__)
    setUp = c.Comfort.setUp
    tearDown = c.Comfort.tearDown
    for name in ('ready','open_a3','open_b','publish_v1','appointment','destination','verify_items','records','close'):
        locals()[name] = getattr(c.Comfort,name)

    def navigate(self, view):
        self.b.locator(f'[data-view={view}]:visible,[data-nav={view}]:visible').first.click()

    def assert_taxi_ui(self, patient_is_verified=False):
        self.b.locator('[data-comfort=taxi]').click()
        dialog=self.b.locator('#comfort-dialog')
        expect(dialog).to_be_visible()
        expect(dialog).to_contain_text('실제 택시 호출')
        expect(dialog.locator('[data-comfort=taxi-option]')).to_have_count(2)
        expect(dialog.locator('[data-choice=regular]')).to_have_attribute('aria-pressed','true')
        before=self.records() if patient_is_verified else None
        dialog.locator('[data-choice=assisted]').click()
        expect(dialog.locator('[data-choice=assisted]')).to_have_attribute('aria-pressed','true')
        expect(dialog.locator('[data-taxi-steps]')).to_contain_text('교통약자 이동지원기관')
        expect(dialog.locator('[data-choice=regular]')).to_have_attribute('aria-pressed','false')
        self.assertEqual(dialog.locator('[data-taxi-steps] li').count(),3)
        self.assertEqual(dialog.locator('a[href^="https://"],[data-comfort=taxi-book]').count(),0)
        if before is not None:self.assertEqual(self.records(),before)
        self.b.locator('[data-comfort=close]').click()

    def test_integrated_verified_route_preserves_real_map_and_no_taxi_booking(self):
        self.open_a3();self.appointment();self.destination();self.publish_v1();self.open_b()
        self.navigate('schedule')
        expect(self.b.locator('.travel-entry-section')).to_be_visible()
        expect(self.b.locator('.travel-entry-section .travel-entry')).to_have_count(2)
        expect(self.b.locator('[data-comfort=map]')).to_be_enabled()
        self.b.locator('[data-comfort=map]').click()
        expect(self.b.locator('[data-map-link]')).to_have_attribute('href',__import__('re').compile(r'^https://map\.kakao\.com/link/to/'))
        expect(self.b.locator('#comfort-dialog')).to_contain_text('현재 위치')
        self.b.locator('[data-comfort=map-fallback]').click()
        expect(self.b.locator('#map-fallback textarea')).to_have_value('합성 기능검사용 주소 — 실제 사용 금지')
        self.close()
        self.assert_taxi_ui(patient_is_verified=True)
        self.navigate('help')
        expect(self.b.locator('.travel-entry-section')).to_be_visible()

    def test_integrated_unverified_route_disabled_but_taxi_advice_visible(self):
        self.ready(appointment=True)
        self.navigate('schedule')
        expect(self.b.locator('[data-comfort=map]')).to_be_disabled()
        expect(self.b.locator('[data-comfort=taxi]')).to_be_enabled()
        self.assert_taxi_ui(patient_is_verified=True)
        self.b.locator('[data-comfort=taxi]').click()
        expect(self.b.locator('#comfort-dialog')).to_contain_text('병원 주소 확인이 필요해요')
        expect(self.b.locator('#comfort-dialog [data-map-link]')).to_have_count(0)
        self.close()
        self.a3.locator('#revoke').click()
        self.navigate('today')
        expect(self.b.locator('.travel-entry-section')).to_have_count(0)

    def test_standalone_route_preview_and_touch_sizes(self):
        self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html')
        self.b.locator('#demo-code').fill('CARE2026')
        self.b.locator('#demo-code').press('Enter')
        for width in (390,768,1440):
            self.b.set_viewport_size({'width':width,'height':950})
            self.navigate('schedule')
            route=self.b.locator('.travel-entry-section .travel-entry')
            expect(route).to_have_count(2)
            self.assertTrue(all(x['height']>=44 for x in (el.bounding_box() for el in route.all())))
            self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
            self.b.locator('[data-comfort=map]').click()
            expect(self.b.locator('#comfort-dialog')).to_contain_text('확인하고 승인·발행한 목적지가 없어요')
            expect(self.b.locator('#comfort-dialog [data-map-link]')).to_have_count(0)
            self.close()
            self.assert_taxi_ui()
            self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
        self.navigate('help')
        expect(self.b.locator('[data-comfort=taxi]')).to_be_visible()

if __name__=='__main__':unittest.main(verbosity=2)
