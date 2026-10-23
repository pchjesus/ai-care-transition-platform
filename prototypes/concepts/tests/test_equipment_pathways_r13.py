"""R13 isolated synthetic assistive-device pathways smoke test.
Run from any directory: python prototypes/concepts/tests/test_equipment_pathways_r13.py
Requires Playwright for Python and installed Chromium. Set R13_CHROMIUM if needed.
No external network calls or patient data.
"""
import os, sys, unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
HTML = Path(__file__).resolve().parents[1] / "equipment-pathways-r13.html"

class ConceptCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        opts = {"headless": True}
        if os.environ.get("R13_CHROMIUM"): opts["executable_path"] = os.environ["R13_CHROMIUM"]
        cls.browser = cls.pw.chromium.launch(**opts)
        cls.src = HTML.read_text(encoding="utf-8")
    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
    def setUp(self):
        self.ctx = self.browser.new_context(viewport={"width":390,"height":844})
        self.page = self.ctx.new_page()
        self.errors, self.requests = [], []
        self.page.on("pageerror", lambda e:self.errors.append(str(e)))
        self.page.on("request", lambda r:self.requests.append(r.url))
        self.page.set_content(self.src)
    def tearDown(self): self.ctx.close()
    def assert_reflow(self):
        r=self.page.evaluate("({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})")
        self.assertLessEqual(r["s"],r["w"]+1,r)
    def test_routes_and_reset(self):
        p=self.page;p.locator("#start").click()
        self.assertEqual(p.locator(".route").count(),4)
        self.assertTrue(p.locator("#next").is_disabled())
        for i in range(4):
            p.locator(".route").nth(i).click()
            self.assertEqual(p.locator('.route[aria-pressed="true"]').count(),1)
            p.locator("#next").click()
            self.assertEqual(p.locator("#questions li").count(),3)
            self.assertTrue(p.locator("#details .notice").is_visible())
            self.assertTrue(p.locator("#details-title").evaluate("(e)=>e===document.activeElement"))
            p.locator("#back2").click()
        p.locator(".route").nth(1).click();p.locator("#next").click()
        p.locator("#restart").click();p.locator("#start").click()
        self.assertTrue(p.locator("#next").is_disabled())
    def test_keyboard_and_font(self):
        p=self.page;p.keyboard.press("Tab")
        self.assertTrue(p.locator(".skip").evaluate("(e)=>e===document.activeElement"))
        p.keyboard.press("Tab");p.keyboard.press("Enter")
        self.assertEqual(p.locator("#font").get_attribute("aria-pressed"),"true")
        p.locator("#start").focus();p.keyboard.press("Enter")
        self.assertTrue(p.locator("#routes-title").evaluate("(e)=>e===document.activeElement"))
        p.keyboard.press("Tab");p.keyboard.press("Space")
        self.assertTrue(p.locator("#next").is_enabled())
        p.locator("#next").focus();p.keyboard.press("Enter")
        self.assertTrue(p.locator("#details-title").evaluate("(e)=>e===document.activeElement"))
    def test_viewport_reflow(self):
        p=self.page
        for w in (320,360,390,600,768,1440):
            p.set_viewport_size({"width":w,"height":844});p.set_content(self.src)
            self.assert_reflow();p.locator("#start").click();self.assert_reflow()
            p.locator(".route").nth(2).click();p.locator("#next").click();self.assert_reflow()
    def test_no_script_errors_or_network(self):
        p=self.page;p.locator("#start").click()
        for i in range(4):
            p.locator(".route").nth(i).click();p.locator("#next").click()
            for a in p.locator("#official a").all():
                self.assertEqual(a.get_attribute("rel"),"noopener noreferrer")
                self.assertTrue(a.get_attribute("href").startswith("https://"))
            p.locator("#back2").click()
        self.assertFalse(self.errors,self.errors);self.assertFalse(self.requests,self.requests)
        for marker in ("localStorage","sessionStorage","XMLHttpRequest","navigator.sendBeacon"):
            self.assertNotIn(marker,self.src)

if __name__=="__main__":
    result=unittest.main(verbosity=2,exit=False).result
    sys.exit(0 if result.wasSuccessful() else 1)
