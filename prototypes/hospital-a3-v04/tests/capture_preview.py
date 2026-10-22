from browser_support import load_app, ARTIFACTS
from pathlib import Path
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 load_app(page,P)
 page.screenshot(path=str(ARTIFACTS/'a3-v03-desktop.png'),full_page=False)
 page.locator('#gate-banner').click()
 page.screenshot(path=str(ARTIFACTS/'a3-v03-blockers.png'),full_page=False)
 page.locator('[data-close-dialog="blockers-dialog"]').click()
 page.locator('[data-nav="learn"]').click()
 page.screenshot(path=str(ARTIFACTS/'a3-v03-learning.png'),full_page=False)
 page.locator('[data-learn-unit="practice"]').click()
 page.screenshot(path=str(ARTIFACTS/'a3-v03-cases.png'),full_page=False)
 page.set_viewport_size({'width':390,'height':844})
 page.locator('[data-nav="plan"]').click()
 page.screenshot(path=str(ARTIFACTS/'a3-v03-mobile.png'),full_page=False)
 b.close()
