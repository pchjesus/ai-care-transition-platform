"""Read-only live GitHub Pages Chromium smoke for the synthetic Carebridge demo.

Unlike release_http.py (which serves a checked-out Pages tree locally), this
visits the actual public URL. Never inserts real patient or personal data.
"""
import os
import unittest
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

SITE = os.environ.get("CAREBRIDGE_PUBLIC_URL",
                      "https://pchjesus.github.io/ai-care-transition-platform/").rstrip("/") + "/"

class LivePages(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True, args=["--no-sandbox"])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
    def setUp(self):
        self.context = self.browser.new_context(
            viewport={"width": 1440, "height": 950},
            service_workers="block",
        )
        self.page = self.context.new_page()
        self.page.set_default_timeout(10000)
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_actual_public_http_assets(self):
        for path in ("", "patient/index.html",
                     "prototypes/integrated-v10/a3/index.html",
                     "prototypes/integrated-v10/patient/comfort-ui.js",
                     "prototypes/integrated-v10/patient/comfort.css",
                     "prototypes/integrated-v10/unified.css",
                     "prototypes/integrated-v10/a3/review-display.js"):
            with self.subTest(path=path), urlopen(SITE + path, timeout=20) as response:
                self.assertEqual(response.status, 200)
                self.assertGreater(len(response.read()), 100)

    def test_independent_patient_login_and_notifications(self):
        p = self.page
        p.goto(SITE + "patient/index.html", wait_until="domcontentloaded")
        p.locator("#demo-code").fill("CARE2026")
        p.locator("#demo-code").press("Enter")
        expect(p.locator(".patient-page-tools .patient-demo-return")).to_be_visible()
        expect(p.locator(".appointment [data-comfort=settings]")).to_have_count(0)
        p.locator('[data-view=reminders]:visible,[data-nav=reminders]:visible').first.click()
        expect(p.locator("#reminder-personal")).to_be_visible()
        expect(p.locator("#reminder-followup")).to_be_visible()
        expect(p.locator("#reminder-inbox")).to_be_visible()
        boxes = [p.locator("#" + name).bounding_box() for name in
                 ("reminder-personal", "reminder-followup", "reminder-inbox")]
        self.assertTrue(all(b is not None for b in boxes))
        self.assertLess(max(b["width"] for b in boxes) -
                        min(b["width"] for b in boxes), 3)
        self.assertFalse(p.evaluate("document.documentElement.scrollWidth > innerWidth"))

    def test_clinician_a2_a3_domain_and_meter_display(self):
        p = self.page
        p.goto(SITE + "prototypes/integrated-v10/a3/index.html?screen=plan&patient=SYN-002",
               wait_until="domcontentloaded")
        expect(p.locator("#domain-grid .domain")).to_have_count(6)
        expect(p.locator("#domain-grid .domain").first.locator(".grade-cell")).to_have_count(3)
        p.locator("[data-nav=assessment]").click()
        expect(p.locator("#a2-domain-tabs .a2-domain-btn")).to_have_count(6)
        expect(p.locator(".a2-result-line .grade-cell")).to_have_count(3)
        self.assertFalse(p.evaluate("document.documentElement.scrollWidth > innerWidth"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
