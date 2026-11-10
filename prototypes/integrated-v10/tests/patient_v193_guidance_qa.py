"""Focused read-only guidance QA for connected synthetic Patient B v1.9.3.
Run from repository root with an HTTP server on port 8765 and Playwright Chromium.
No real patient data, medical integrations, reservations, or taxi calls.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('artifacts/patient-v193-review')
OUT.mkdir(parents=True, exist_ok=True)

BASE = "http://127.0.0.1:8765/prototypes"
HOSPITAL = BASE + "/hospital-ux2-v07/index.html"
PATIENT = BASE + "/integrated-v10/patient/v193-connected.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO"
KEY = "care-transition-integrated-v10-a3-synthetic-only"


def menu(page, view, width):
    # Desktop, tablet, and mobile can expose different navigation rails.
    page.locator(
        f'.side button[data-view="{view}"]:visible, .bottom-nav button[data-view="{view}"]:visible'
    ).first.click()


def ensure_no_horizontal_overflow(page, width):
    size = page.evaluate("document.documentElement.scrollWidth")
    assert size <= width + 1, f"Horizontal overflow at {width}px: {size}px"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    context = browser.new_context(viewport={"width": 390, "height": 850})
    # Current default home must offer only the linked and latest independent patient apps.
    home = context.new_page()
    for width in [320, 390, 1440]:
        home.set_viewport_size({"width": width, "height": 900})
        home.goto(BASE + "/integrated-v10/index.html", wait_until="networkidle")
        assert home.locator(".patient-mode-link").count() == 2, "Linked/independent choices must be explicit"
        assert home.locator('.patient-mode-link[href*="v193-connected.html"]').count() == 1
        assert home.locator('.patient-mode-link[href="../../patient/v19-3.html"]').count() == 1
        assert home.locator('a[href*="patient/index.html"],a[href*="legacy-home"]').count() == 0
        ensure_no_horizontal_overflow(home, width)
        if width in [390, 1440]:
            home.screenshot(path=str(OUT / f"home-current-patient-choices-{width}.png"), full_page=True, animations="disabled")
    home.locator('.patient-mode-link.secondary').click()
    home.locator('body.v19-3-theme').wait_for()
    assert home.url.endswith("/patient/v19-3.html")
    home.go_back(wait_until="networkidle")
    home.locator('.patient-mode-link:not(.secondary)').click()
    assert "/patient/v193-connected.html" in home.url
    home.locator("#demo-code").wait_for(timeout=15000)
    home.close()

    patient = context.new_page()
    failures = []
    patient.on("pageerror", lambda err: failures.append(str(err)))

    patient.goto(PATIENT, wait_until="networkidle")
    assert patient.locator('.demo-mode-option a[href="../../../patient/v19-3.html"]').count() == 1
    patient.locator("#demo-code").fill("CARE2026")
    patient.locator("#demo-login button[type=submit]").click()
    patient.locator(".v17-unpublished").wait_for()
    assert patient.locator(".v193-guide-menu").count() == 0, "Guidance must not fabricate a patient publication"
    assert "'+availableOtherDemos()+'" not in patient.locator(".v17-unpublished").inner_text()
    assert patient.locator(".demo-tools").count() == 0, "Old developer/legacy menu must be removed"
    assert patient.locator('.side-end .independent-demo-link[href="../../../patient/v19-3.html"]').count() == 1
    assert patient.locator('.patient-mobile-journey a[href="../index.html"]').count() == 1
    assert patient.locator('a[href*="patient/index.html"]').count() == 0

    hospital = context.new_page()
    hospital.set_viewport_size({"width": 1440, "height": 900})
    hospital.on("pageerror", lambda err: failures.append(str(err)))
    hospital.goto(HOSPITAL, wait_until="networkidle")
    hospital.locator('.nav-item[data-view="patients"]').click()
    hospital.locator('[data-open="SYN-002"]').first.click()
    hospital.locator('.patient-route[data-view="review"]').click()
    hospital.locator('[data-ux7-action="request"]').click()
    hospital.locator("[data-v6-role]").select_option("APPROVER")
    hospital.locator('[data-ux7-action="approve"]').click()
    hospital.locator('[data-ux7-action="publish"]').click()
    hospital.wait_for_function(
        "key => JSON.parse(localStorage.getItem(key))?.['SYN-002']?.draft?.status==='PUBLISHED'",
        arg=KEY
    )
    hospital.screenshot(path=str(OUT / "medical-ux2-published-desktop.png"), animations="disabled")
    patient.reload(wait_until="networkidle")
    patient.locator(".v17-home").wait_for()
    assert patient.locator(".v193-connected-tour").count() == 1, "Avoid duplicate tour entries"
    assert patient.locator(".patient-header-help").count() == 0
    assert patient.locator(".demo-tools").count() == 0
    assert patient.locator('.side-end .independent-demo-link[href="../../../patient/v19-3.html"]').count() == 1

    for width in [320, 390, 768, 1440]:
        patient.set_viewport_size({"width": width, "height": 900})
        menu(patient, "today", width)
        summary = patient.locator(".v193-howto > summary")
        summary.focus()
        patient.keyboard.press("Enter")
        assert patient.locator(".v193-howto").evaluate("(el) => el.open"), "Summary should work by keyboard"
        assert patient.locator(".v193-guide-item").count() == 5
        assert patient.locator(".v193-guide-item [data-view]").count() == 5
        for button in patient.locator(".v193-guide-copy button").all():
            assert button.bounding_box()["height"] >= 48, "Large menu CTA required"
        ensure_no_horizontal_overflow(patient, width)
        if width in [320, 390, 1440]:
            patient.screenshot(path=str(OUT / f"patient-guide-{width}.png"), full_page=True, animations="disabled")
        patient.locator('.v193-guide-item [data-view="help"]').click()
        patient.locator(".v193-clinician-questions").wait_for()
        assert patient.locator(".v193-clinician-questions li").count() == 5
        assert patient.locator('.v193-questions-link[href="#v193-help-published"]').count() == 1
        if width in [320, 390, 1440]:
            patient.screenshot(path=str(OUT / f"patient-questions-{width}.png"), full_page=True, animations="disabled")
        ensure_no_horizontal_overflow(patient, width)
        menu(patient, "today", width)

    patient.set_viewport_size({"width": 320, "height": 760})
    original_state = hospital.evaluate("(key) => localStorage.getItem(key)", KEY)
    # Small-screen primary entry is the visible in-page tutorial CTA; the header entry is hidden.
    tour_button = patient.locator(".v17-home .v17-tour-cta:visible")
    assert tour_button.count() == 1, "A visible tutorial entry is required at 320px"
    tour_button.click()
    tour = patient.locator(".spotlight-tour")
    tour.wait_for()
    patient.screenshot(path=str(OUT / "patient-tour-first-step-320.png"), animations="disabled")
    for step in range(1, 6):
        assert tour.locator("#tour-count").inner_text().endswith(f"{step} / 5")
        if step < 5:
            tour.locator('[data-tour-control="next"]').click()
    tour.locator("#tour-finish").click()
    assert tour.count() == 0
    assert patient.locator(".v17-home").count() == 1, "Tour must restore previous screen"
    assert hospital.evaluate("(key) => localStorage.getItem(key)", KEY) == original_state, "Tour must not edit A3 publication data"

    # The header font shortcut is hidden on small screens; profile settings are reachable.
    menu(patient, "profile", 320)
    patient.locator('.v193-display-settings [data-v193-size="large"]').click()
    assert patient.locator("body.large-font").count() == 1
    ensure_no_horizontal_overflow(patient, 320)
    patient.locator('.v193-display-settings [data-v193-size="normal"]').click()
    assert patient.locator("body.large-font").count() == 0

    patient.emulate_media(reduced_motion="reduce")
    menu(patient, "schedule", 320)
    duration = patient.locator(".v17-page").evaluate("(el) => getComputedStyle(el).animationDuration")
    assert duration in ["0s", "0s, 0s"], f"Reduced-motion route effect active: {duration}"
    ensure_no_horizontal_overflow(patient, 320)

    assert not failures, failures
    context.close()
    browser.close()
print("Patient B v1.9.3 guidance QA: PASS (320/390/768/1440 + tour + navigation + read-only + font + reduced motion)")
