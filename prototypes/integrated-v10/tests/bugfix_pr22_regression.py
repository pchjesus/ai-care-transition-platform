"""Focused synthetic-data browser regressions for Boyacto PR #22.
Runs with: python -m http.server 8765 (repository root), Playwright Chromium.
Checks observable UI AND local A3 storage; no clinical integrations or real patient data.
"""
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765/prototypes"
H = BASE + "/hospital-ux2-v07/index.html"
B = BASE + "/integrated-v10/patient/v193-connected.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO"
KEY = "care-transition-integrated-v10-a3-synthetic-only"


def record(page):
    return page.evaluate("(key) => JSON.parse(localStorage.getItem(key))?.['SYN-002']", KEY)


def hospital_open(page, screen):
    page.goto(H, wait_until="networkidle")
    page.locator('.nav-item[data-view="patients"]').click()
    page.locator('[data-open="SYN-002"]').first.click()
    page.locator(f'.patient-route[data-view="{screen}"]').click()
    page.locator(".ux6-main-tabs" if screen == "plan" else ".ux7-steps").wait_for()


def patient_login(page):
    page.goto(B, wait_until="networkidle")
    page.locator("#demo-code").fill("CARE2026")
    page.locator('#demo-login button[type="submit"]').click()
    page.locator(".app-layout").wait_for()


def patient_menu(page, view):
    page.locator(f'.side button[data-view="{view}"]:visible').click()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    errors = []

    # No-publication navigation: the user can always get back from reminder inbox.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, timezone_id="Asia/Seoul")
    patient = ctx.new_page()
    patient.on("pageerror", lambda e: errors.append(str(e)))
    patient.goto(B, wait_until="networkidle")
    patient.locator("#demo-code").fill("CARE")
    other = ctx.new_page()
    other.goto(H, wait_until="networkidle")
    other.evaluate("(key) => localStorage.setItem(key, JSON.stringify({demoEvent: Date.now()}))", KEY)
    assert patient.locator("#demo-code").input_value() == "CARE", "Storage event wiped login input"
    # Use a fresh browser context for the unpublished state to avoid synthetic storage corruption.
    ctx.close()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, timezone_id="Asia/Seoul")
    patient = ctx.new_page()
    patient.on("pageerror", lambda e: errors.append(str(e)))
    patient_login(patient)
    patient.locator(".v17-unpublished").wait_for()
    patient_menu(patient, "reminders")
    patient.locator("[data-reminder-hub]").wait_for()
    patient_menu(patient, "schedule")
    patient.locator(".v17-unpublished").wait_for()
    assert patient.locator("[data-reminder-hub]").count() == 0, "Unpublished reminder screen is a navigation trap"
    ctx.close()
    print("PASS unpublished navigation + cross-tab login input")

    # Unsaved plan input must never be silently discarded by a second action.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    hospital = ctx.new_page()
    hospital.on("pageerror", lambda e: errors.append(str(e)))
    hospital_open(hospital, "plan")
    initial = record(hospital)
    editor = hospital.locator("#ux6-plan-text")
    original = editor.input_value()
    editor.fill(original + " · 미저장 변경 검증")
    visibility = hospital.locator("[data-v6-visibility]")
    initial_visibility = visibility.input_value()
    visibility.select_option("INTERNAL" if initial_visibility == "PATIENT" else "PATIENT")
    assert editor.input_value().endswith("미저장 변경 검증"), "Editing a dropdown lost unsaved text"
    assert visibility.input_value() == initial_visibility, "Visibility changed despite unsaved input"
    assert record(hospital) == initial, "Unsaved plan was committed by an unrelated control"
    hospital.locator('[data-v6-action="save-text"]').click()
    assert record(hospital)["draft"]["items"][0]["text"] == original + " · 미저장 변경 검증", "Explicit save did not persist the edited text"
    assert hospital.locator("#ux6-plan-text").input_value().endswith("미저장 변경 검증")
    ctx.close()
    print("PASS unsaved plan guard + explicit persistence")

    # Real A3 synthetic publication is the only source for connected patient tests.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, timezone_id="Asia/Seoul")
    hospital = ctx.new_page()
    hospital.on("pageerror", lambda e: errors.append(str(e)))
    hospital_open(hospital, "review")
    hospital.locator('[data-ux7-action="request"]').click()
    hospital.locator("[data-v6-role]").select_option("APPROVER")
    hospital.locator('[data-ux7-action="approve"]').click()
    hospital.locator('[data-ux7-action="publish"]').click()
    hospital.wait_for_function(
        "key => JSON.parse(localStorage.getItem(key))?.['SYN-002']?.draft?.status==='PUBLISHED'",
        arg=KEY
    )
    before_patient = record(hospital)
    patient = ctx.new_page()
    patient.on("pageerror", lambda e: errors.append(str(e)))
    patient_login(patient)
    patient.locator(".v17-home").wait_for()

    # Korean IME composition must not replace the active input until composition ends.
    patient_menu(patient, "help")
    patient.locator(".v17-search-toggle").click()
    patient.locator("#help-search").evaluate("""e => {
      e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'ㅇ'}));
      e.value = 'ㅇ';
      e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'ㅇ'}));
      if (!e.isConnected) throw Error('IME input removed mid-composition');
      e.value = '약';
      e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'약'}));
      if (!e.isConnected) throw Error('IME input removed before composition end');
      e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'약'}));
    }""")
    assert patient.locator("#help-search").input_value() == "약", "Korean IME query changed"
    print("PASS Korean IME help search")

    # Reminder lifecycle: edit A, then create B; both must remain with separate identities.
    patient_menu(patient, "reminders")
    patient.locator("#reminder-personal > summary").click()
    form = patient.locator('form[data-comfort-form="personal"]')
    future = (date.today() + timedelta(days=70)).isoformat()

    def fill_reminder(name):
        form.locator('[name="label"]').fill(name)
        form.locator('[name="date"]').fill(future)
        form.locator('[name="time"]').fill("13:00")
        form.locator('[name="lead"]').select_option("0")

    fill_reminder("알림A")
    form.locator('button[type="submit"]').click()
    patient.locator("#reminder-personal .comfort-list li").filter(has_text="알림A").wait_for()
    patient.locator('#reminder-personal [data-comfort="personal-edit"]').first.click()
    form.locator('[name="label"]').fill("알림A2")
    form.locator('button[type="submit"]').click()
    patient.locator("#reminder-personal .comfort-list li").filter(has_text="알림A2").wait_for()
    patient.wait_for_function(
        "() => document.querySelector('form[data-comfort-form=personal] input[name=id]')?.value === ''",
        timeout=4000
    )
    fill_reminder("알림B")
    form.locator('button[type="submit"]').click()
    patient.locator("#reminder-personal .comfort-list li").filter(has_text="알림B").wait_for()
    labels = patient.locator("#reminder-personal .comfort-list li strong").all_inner_texts()
    assert sorted(labels) == ["알림A2", "알림B"], f"Reminder overwrite detected: {labels}"
    assert record(hospital) == before_patient, "Patient-only reminder actions mutated A3 clinical record"
    assert not errors, errors
    ctx.close()
    browser.close()
    print("PASS reminder update -> create, 2 intact + no clinical write")
print("PR22 BUGFIX QA PASS")
