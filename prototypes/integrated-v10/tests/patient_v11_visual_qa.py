"""Patient B v1.1 synthetic-only screenshot and usability smoke for PR review."""
from pathlib import Path
import json
import subprocess
import time
import os
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "artifacts" / "patient-v11"
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:18550"
CHROME = "/usr/bin/chromium" if Path("/usr/bin/chromium").exists() else "/usr/bin/google-chrome"

def tab(page, name):
    page.locator(f'[data-view="{name}"]:visible,[data-nav="{name}"]:visible').first.click()

def shot(page, label, width):
    page.screenshot(path=str(OUTPUT / f"{width}-{label}.png"), full_page=True, animations="disabled")

def ensure_no_hscroll(page):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), "Horizontal overflow"

def check_min_taps(page, selector):
    for el in page.locator(selector).all():
        bb = el.bounding_box()
        if bb:
            assert bb['height'] >= 44, f"Too-short tap target: {selector}, {bb['height']}"

server = subprocess.Popen(
    ["python3", "-m", "http.server", "18550", "--bind", "127.0.0.1"],
    cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT
)
summary = {}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=CHROME, args=["--no-sandbox"])
        for width in (390, 768, 1440):
            page = browser.new_page(viewport={"width": width, "height": 900}, device_scale_factor=1)
            page.goto(BASE + "/patient/index.html", wait_until="networkidle")
            page.locator("#demo-code").fill("CARE2026")
            page.locator("#demo-code").press("Enter")
            expect(page.locator(".tasks .task").first).to_be_visible()
            assert page.evaluate("getComputedStyle(document.querySelector('.tasks .task')).borderRadius") != "0px"
            check_min_taps(page, ".tasks .task")
            ensure_no_hscroll(page)
            shot(page, "01-home", width)

            pdf_shortcut = page.locator(".home-pdf-shortcut")
            expect(pdf_shortcut).to_be_visible()
            pdf_shortcut.click()
            expect(page.locator('[data-action="pdf-open"]')).to_be_visible()
            expect(page.locator('[data-action="pdf-open"]')).to_contain_text("PDF")
            shot(page, "02-document-detail", width)

            tab(page, "schedule")
            expect(page.locator(".travel-entry-section")).to_be_visible()
            ensure_no_hscroll(page)
            shot(page, "03-schedule", width)

            page.locator('[data-comfort="taxi"]').click()
            dlg = page.locator("#comfort-dialog")
            expect(dlg).to_be_visible()
            dlg.locator('[data-comfort="taxi-next"]').click()
            dlg.locator('[data-taxi-group="equipment"][value="walker"]').check()
            dlg.locator('[data-taxi-group="arrivalHelp"][value="entrance"]').check()
            dlg.locator('[data-comfort="taxi-next"]').click()
            expect(dlg.locator(".travel-state-summary")).to_contain_text("택시 예약은 아직 하지 않았어요")
            expect(dlg.locator(".travel-state-summary")).to_contain_text("병원에 도움 요청이 전달되지 않았어요")
            expect(dlg.locator(".travel-future-action")).to_be_disabled()
            expect(dlg.locator(".travel-next-action")).to_be_visible()
            shot(page, "04-taxi-status", width)
            page.locator('[data-comfort="close"]').click()

            tab(page, "help")
            expect(page.locator(".service-card").first).to_be_visible()
            check_min_taps(page, ".service-card")
            shot(page, "05-help", width)
            ensure_no_hscroll(page)
            summary[str(width)] = "PASS: home/PDF/schedule/taxi/help, tap size, no overflow"
            page.close()
        browser.close()
    (OUTPUT / "RESULTS.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
