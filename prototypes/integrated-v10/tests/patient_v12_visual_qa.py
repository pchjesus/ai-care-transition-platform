"""Patient B v1.1 synthetic-only screenshot and usability smoke for PR review."""
from pathlib import Path
import json
import subprocess
import time
import os
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "artifacts" / "patient-v12"
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
            expect(page.locator(".v12-task-list .v12-task-card").first).to_be_visible()
            expect(page.locator(".v12-home-appointment")).to_be_visible()
            expect(page.locator(".hero-panel")).to_have_count(0)
            expect(page.locator(".v12-task-card")).to_have_count(3)
            assert page.evaluate("getComputedStyle(document.querySelector('.tasks .task')).borderRadius") != "0px"
            check_min_taps(page, ".tasks .task")
            ensure_no_hscroll(page)
            shot(page, "01-home", width)

            pdf_shortcut = page.locator('button[data-nav="documents"]')
            expect(pdf_shortcut).to_be_visible()
            expect(page.locator(".v12-read-note button")).to_have_count(1)
            pdf_shortcut.click()
            expect(page.locator(".v12-documents")).to_be_visible()
            expect(page.locator(".v12-document-card")).to_have_count(1)
            shot(page, "02-document-list", width)
            page.locator(".v12-document-card [data-detail=mobility]").click()
            expect(page.locator('[data-action="pdf-open"]')).to_be_visible()
            expect(page.locator('[data-action="pdf-open"]')).to_contain_text("PDF")
            shot(page, "03-document-detail", width)

            tab(page, "schedule")
            expect(page.locator(".travel-entry-section")).to_be_visible()
            ensure_no_hscroll(page)
            expect(page.locator(".v12-confirmed")).to_be_visible()
            assert page.locator(".v12-confirmed").bounding_box()["y"] < page.locator(".travel-entry-section").bounding_box()["y"], "Visit card must appear above mobility tools"
            shot(page, "04-schedule", width)

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
            expect(dlg.locator(".travel-state-summary")).to_be_visible()
            shot(page, "05-taxi-status", width)
            page.locator('[data-comfort="close"]').click()

            tab(page, "help")
            expect(page.locator(".service-card").first).to_be_visible()
            check_min_taps(page, ".service-card")
            expect(page.locator(".v12-help")).to_be_visible()
            assert page.locator(".services-panel").bounding_box()["y"] < page.locator(".travel-entry-section").bounding_box()["y"], "Help choices must appear before mobility tools"
            shot(page, "06-help", width)
            ensure_no_hscroll(page)
            summary[str(width)] = "PASS: v12 home/PDF list+detail/schedule/taxi/help, tap size, no overflow"
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
