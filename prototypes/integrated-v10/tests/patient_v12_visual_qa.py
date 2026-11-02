"""Patient B v1.2 synthetic-only screenshot and usability smoke for PR review."""
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
            if width == 1440:
                assert page.evaluate("getComputedStyle(document.querySelector('.v12-home')).display") == "grid", "PC homepage grid missing"
                expect(page.locator('.side-brand')).to_contain_text('케어브릿지랩')
                assert page.locator('.v12-home > section[aria-labelledby="today-tasks"]').bounding_box()["x"] < page.locator('.v12-home > section[aria-label="다음 외래 일정"]').bounding_box()["x"]
            if width == 390:
                assert page.evaluate("getComputedStyle(document.querySelector('.v12-home')).display") != "grid", "Mobile must remain single column"
            shot(page, "01-home", width)

            pdf_shortcut = page.locator('button[data-nav="documents"]')
            expect(pdf_shortcut).to_be_visible()
            expect(page.locator(".v12-read-note button")).to_have_count(1)
            pdf_shortcut.click()
            expect(page.locator(".v12-documents")).to_be_visible()
            expect(page.locator(".v12-document-card")).to_have_count(1)
            shot(page, "02-document-list", width)
            page.locator(".v12-document-card [data-action=pdf-open-from-list]").click()
            expect(page.locator('.pdf-panel')).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.locator('.v12-documents')).to_be_visible()
            tab(page, "today")
            page.locator('[data-detail="mobility"]').first.click()
            expect(page.locator('[data-action="pdf-open"]')).to_be_visible()
            shot(page, "03-document-detail", width)
            page.locator('[data-action=pdf-open]').click()
            expect(page.locator('.pdf-panel')).to_be_visible()
            page.keyboard.press('Escape')
            page.locator('[data-action=quiz-start]').click()
            page.locator('[data-choice]').first.click(); page.locator('[data-action=quiz-check]').click()
            expect(page.locator('.feedback')).to_be_visible()

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
            # Full-page screenshots of a fixed-height dialog can visually stitch
            # the document behind it into the dialog. Capture the dialog viewport
            # and its scrolled sections separately to check actual readability.
            status = dlg.locator(".travel-state-summary")
            boundary = dlg.locator(".travel-share-boundary")
            status_box = status.bounding_box()
            boundary_box = boundary.bounding_box()
            assert status_box and boundary_box and status_box["y"] + status_box["height"] <= boundary_box["y"] + 2, "Status section overlaps following guidance"
            page.screenshot(path=str(OUTPUT / f"{width}-05-taxi-viewport.png"), full_page=False, animations="disabled")
            status.screenshot(path=str(OUTPUT / f"{width}-05-taxi-status-section.png"), animations="disabled")
            dlg.locator(".travel-next-action").screenshot(path=str(OUTPUT / f"{width}-05-taxi-next-action.png"), animations="disabled")
            page.locator('[data-comfort="close"]').click()

            tab(page, "help")
            expect(page.locator(".service-card").first).to_be_visible()
            check_min_taps(page, ".service-card")
            expect(page.locator(".v12-help")).to_be_visible()
            assert page.locator(".services-panel").bounding_box()["y"] < page.locator(".travel-entry-section").bounding_box()["y"], "Help choices must appear before mobility tools"
            shot(page, "06-help", width)
            ensure_no_hscroll(page)
            page.evaluate('document.documentElement.style.zoom="2"')
            ensure_no_hscroll(page); shot(page,"standalone-css-200",width)
            page.evaluate('document.documentElement.style.zoom="1"')
            page.locator('[data-nav=profile]:visible').first.focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('heading',name='내 정보',exact=True)).to_be_visible()
            summary[str(width)] = "PASS: v12 home/direct PDF+detail/schedule/taxi/help, tap size, no overflow"
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

# Verify A3 publications as well as the standalone demonstration.
import comfort_http as baseline
baseline.Comfort.setUpClass()
t = baseline.Comfort(); t.setUp()
try:
    t.ready()
    expect(t.b.locator('.v12-home-appointment')).to_contain_text('일정 확인 필요')
    expect(t.b.locator('[data-comfort=documents]')).to_have_count(0)
    t.a3.locator('#revise').click(); t.appointment()
    baseline.baseline.PatientIntegration.attach_pdf(t); t.verify_items(); t.publish_v1()
    expect(t.b.locator('.v12-home-appointment')).to_contain_text('2030-01-03 10:00')
    for width in (390,768,1440):
        t.b.set_viewport_size({'width':width,'height':900})
        tab(t.b,'today')
        if width == 1440:
            assert t.b.evaluate("getComputedStyle(document.querySelector('.v12-home')).display") == "grid"
            expect(t.b.locator('.side-brand')).to_contain_text('케어브릿지랩')
        shot(t.b,'connected-01-home',width)
        tab(t.b,'schedule')
        expect(t.b.locator('.v12-confirmed')).to_contain_text('2030-01-03')
        expect(t.b.locator('.v12-secondary-schedule .event')).to_have_count(0)
        shot(t.b,'connected-02-schedule',width)
        t.b.locator('[data-comfort=taxi]').click()
        t.b.locator('[data-taxi-field=pickup]').fill('가상 승차 위치')
        t.b.locator('[data-comfort=taxi-next]').click()
        t.b.locator('[data-taxi-group=equipment][value=walker]').check()
        t.b.locator('[data-comfort=taxi-next]').click()
        expect(t.b.locator('[data-taxi-preview]')).to_contain_text('가상 승차 위치')
        connected_dlg = t.b.locator("#comfort-dialog")
        status = connected_dlg.locator(".travel-state-summary")
        boundary = connected_dlg.locator(".travel-share-boundary")
        status_box = status.bounding_box()
        boundary_box = boundary.bounding_box()
        assert status_box and boundary_box and status_box["y"] + status_box["height"] <= boundary_box["y"] + 2, "Connected status section overlaps following guidance"
        t.b.screenshot(path=str(OUTPUT / f"{width}-connected-03-travel-viewport.png"), full_page=False, animations="disabled")
        status.screenshot(path=str(OUTPUT / f"{width}-connected-03-travel-status-section.png"), animations="disabled")
        connected_dlg.locator(".travel-next-action").screenshot(path=str(OUTPUT / f"{width}-connected-03-travel-next-action.png"), animations="disabled")
        t.close()
        tab(t.b,'today')
        expect(t.b.locator('.v12-read-note [data-document]')).to_be_visible()
        t.b.locator('.v12-read-note [data-document]').click()
        expect(t.b.locator('iframe.pdf-frame')).to_be_visible()
        shot(t.b,'connected-04-pdf-direct',width)
        t.b.keyboard.press('Escape')
        t.b.locator('.v12-read-note [data-comfort=documents]').click()
        expect(t.b.locator('[data-comfort=document-open]')).to_be_visible()
        t.close()
        tab(t.b,'help'); shot(t.b,'connected-05-help',width)
        ensure_no_hscroll(t.b)
        # CSS approximation, not native browser 200% zoom.
        t.b.evaluate('document.documentElement.style.zoom="2"')
        ensure_no_hscroll(t.b); shot(t.b,'connected-css-200',width)
        t.b.evaluate('document.documentElement.style.zoom="1"')
        t.b.locator('[data-view=profile]:visible').first.focus(); t.b.keyboard.press('Enter')
        expect(t.b.get_by_role('heading',name='내 정보',exact=True)).to_be_visible()
    t.a3.locator('#revoke').click()
    expect(t.b.locator('.blocked')).to_be_visible()
    expect(t.b.locator('[data-comfort=documents]')).to_have_count(0)
    summary['connected']='PASS: pending/confirmed, five screens, PDF/revocation, keyboard/CSS zoom'
    (OUTPUT/'RESULTS.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
finally:
    t.tearDown(); baseline.Comfort.tearDownClass()
