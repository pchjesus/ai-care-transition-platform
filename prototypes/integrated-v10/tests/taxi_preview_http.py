"""R13 taxi connection-ready preview: synthetic-only, no vendor calls."""
import unittest
from playwright.sync_api import expect
import comfort_http as baseline

class TaxiPreview(unittest.TestCase):
    setUpClass=classmethod(baseline.Comfort.setUpClass.__func__)
    tearDownClass=classmethod(baseline.Comfort.tearDownClass.__func__)
    setUp=baseline.Comfort.setUp
    tearDown=baseline.Comfort.tearDown
    for method in ('ready','open_a3','open_b','publish_v1','appointment','destination','verify_items','records','close'):
        locals()[method]=getattr(baseline.Comfort,method)

    def tab(self,key):
        self.b.locator(f'[data-view={key}]:visible,[data-nav={key}]:visible').first.click()
    def open_taxi(self):
        self.b.locator('[data-comfort=taxi]').click()
        expect(self.b.locator('#comfort-dialog')).to_be_visible()
    def next(self):
        self.b.locator('[data-comfort=taxi-next]').click()
    def prev(self):
        self.b.locator('[data-comfort=taxi-prev]').click()

    def test_verified_destination_equipment_arrival_and_disabled_vendor(self):
        self.open_a3();self.appointment();self.destination();self.publish_v1();self.open_b()
        baseline_data=self.records()
        self.tab('schedule');self.open_taxi()
        box=self.b.locator('#comfort-dialog')
        expect(box.locator('[data-taxi-builder]')).to_be_visible()
        expect(box.locator('[data-choice=regular]')).to_have_attribute('aria-pressed','true')
        expect(box.locator('[data-taxi-field=destinationId]')).to_have_count(1)
        expect(box.locator('.travel-destination')).to_contain_text('합성 기능검사용 주소')
        box.locator('[data-taxi-field=pickup]').fill('가상 정류장 옆')
        box.locator('[data-choice=assisted]').click()
        self.next()
        box.locator('[data-taxi-group=equipment][value=folding]').check()
        box.locator('[data-taxi-group=equipment][value=walker]').check()
        box.locator('[data-taxi-group=arrivalHelp][value=assist]').check()
        box.locator('[data-taxi-group=arrivalHelp][value=rental]').check()
        box.locator('[data-taxi-field=companion]').select_option('with')
        self.next()
        expect(box.locator('[data-taxi-preview]')).to_contain_text('가상 정류장 옆')
        expect(box.locator('[data-taxi-preview]')).to_contain_text('접이식 휠체어')
        expect(box.locator('[data-taxi-preview]')).to_contain_text('워커·보행기')
        expect(box.locator('[data-taxi-preview]')).to_contain_text('하차 시 부축 문의')
        expect(box.locator('[data-taxi-preview]')).to_contain_text('병원 휠체어 대여 문의')
        expect(box.locator('[data-taxi-preview]')).to_contain_text('보호자·동행인 동행')
        expect(box.locator('.travel-future-action')).to_be_disabled()
        self.assertEqual(box.locator('[data-map-link],a[href*="kakao"],[data-taxi-book]').count(),0)
        self.assertEqual(self.records(),baseline_data)
        self.prev()
        expect(box.locator('[data-taxi-group=equipment][value=folding]')).to_be_checked()
        expect(box.locator('[data-taxi-group=equipment][value=walker]')).to_be_checked()
        self.prev()
        expect(box.locator('[data-taxi-field=pickup]')).to_have_value('가상 정류장 옆')

    def test_none_exclusivity_no_persistence_and_unverified_standalone(self):
        self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html')
        self.b.locator('#demo-code').fill('CARE2026')
        self.b.locator('#demo-code').press('Enter')
        self.tab('schedule');self.open_taxi()
        box=self.b.locator('#comfort-dialog')
        expect(box.locator('#taxi-demo-dest')).to_be_visible()
        expect(box.locator('.travel-pending-text')).to_contain_text('확인된 병원 주소가 없어요')
        box.locator('[data-taxi-field=pickup]').fill('<img src=x onerror=window.taxipwn=1>')
        box.locator('[data-taxi-field=demoDestination]').fill('가상병원 정문')
        self.next()
        box.locator('[data-taxi-group=equipment][value=folding]').check()
        box.locator('[data-taxi-group=equipment][value=none]').check()
        expect(box.locator('[data-taxi-group=equipment][value=folding]')).not_to_be_checked()
        box.locator('[data-taxi-group=equipment][value=walker]').check()
        expect(box.locator('[data-taxi-group=equipment][value=none]')).not_to_be_checked()
        box.locator('[data-taxi-group=arrivalHelp][value=none]').check()
        self.next()
        expect(box.locator('[data-taxi-preview]')).to_contain_text('가상병원 정문')
        expect(box.locator('[data-taxi-preview]')).to_contain_text('확인되지 않은 예시')
        expect(box.locator('.travel-future-action')).to_be_disabled()
        self.assertFalse(self.b.evaluate('Boolean(window.taxipwn)'))
        self.assertEqual(box.locator('img[src=x]').count(),0)
        self.b.locator('[data-comfort=close]').click()
        self.open_taxi()
        expect(box.locator('[data-taxi-field=pickup]')).to_have_value('')
        expect(box.locator('[data-taxi-field=demoDestination]')).to_have_value('')

    def test_mobile_separate_checklist_and_safe_missing_published_address(self):
        self.ready(appointment=True)
        self.tab('schedule')
        for width in (390,768,1440):
            self.b.set_viewport_size({'width':width,'height':900})
            self.open_taxi()
            box=self.b.locator('#comfort-dialog')
            expect(box.locator('.travel-pending-text')).to_contain_text('의료진이 확인·발행한 병원 주소가 없어요')
            expect(box.locator('#taxi-demo-dest')).to_have_count(0)
            self.next()
            expect(box.locator('fieldset.travel-options')).to_have_count(2)
            for x in box.locator('.travel-check').all():
                self.assertGreaterEqual(x.bounding_box()['height'],44)
            self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
            self.next()
            expect(box.locator('[data-taxi-preview]')).to_contain_text('확인된 병원 목적지 없음')
            self.assertEqual(box.locator('a[href^=https],.travel-future-action:not([disabled])').count(),0)
            self.b.locator('[data-comfort=close]').click()

if __name__=='__main__':
    unittest.main(verbosity=2)
