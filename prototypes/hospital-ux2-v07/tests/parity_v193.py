"""Safety-focused browser tests for backlog A feature restoration.
Tests use only the SYN-002 synthetic record and never make external reservations.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE="http://127.0.0.1:8765/prototypes"
H=BASE+"/hospital-ux2-v07/index.html"
KEY="care-transition-integrated-v10-a3-synthetic-only"
OUT=Path("/tmp/carebridge-parity-v193");OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
    ctx=browser.new_context(viewport={"width":1440,"height":900})
    h=ctx.new_page()
    errors=[]
    h.on("pageerror",lambda e:errors.append(str(e)))
    h.goto(H,wait_until="networkidle")
    h.locator('.nav-item[data-view="patients"]').click()
    h.locator('[data-open="SYN-002"]').first.click()
    h.locator('.patient-route[data-view="plan"]').click()
    h.locator(".ux6-main-tabs").wait_for()
    h.locator('[data-v6-role]').select_option("PHYSICIAN")
    h.locator(".ux6-section-tab",has_text="외래").click()
    h.locator(".ux7-destination-panel>summary").click()
    assert h.locator('.ux7-destination-panel [data-v6-dest="verified"]').is_enabled()
    fields={
        "name":"가상 검증병원 (테스트 전용)",
        "address":"가상 주소 - 실제 길찾기 금지",
        "latitude":"37.5",
        "longitude":"127.0",
        "sourceUrl":"https://hospital.example.org/demo-only"
    }
    for field,value in fields.items():
        h.locator(f'[data-v6-dest="{field}"]').fill(value)
    h.locator('[data-v6-dest="verified"]').check()
    h.locator('[data-v6-action="save-destination"]').click()
    h.wait_for_function('''key=>{const r=JSON.parse(localStorage.getItem(key))?.["SYN-002"];
         return !!r?.draft.items.find(i=>i.section==="followup")?.appointment?.destination;}''',KEY)
    record=h.evaluate('''key=>JSON.parse(localStorage.getItem(key))["SYN-002"]''',KEY)
    appointment=next(i["appointment"] for i in record["draft"]["items"] if i["section"]=="followup")
    assert appointment["destination"]["verified"] is False, "An edited destination must invalidate verification"
    assert next(i for i in record["draft"]["items"] if i["section"]=="followup")["verified"] is False
    h.locator(".ux7-destination-panel>summary").click()
    h.locator('[data-v6-dest="verified"]').check()
    h.locator('[data-v6-action="save-destination"]').click()
    record=h.evaluate('''key=>JSON.parse(localStorage.getItem(key))["SYN-002"]''',KEY)
    destination=next(i["appointment"]["destination"] for i in record["draft"]["items"] if i["section"]=="followup")
    assert destination["verified"] is True, "A valid unchanged destination can be explicitly verified by physician"
    assert next(i for i in record["draft"]["items"] if i["section"]=="followup")["verified"] is False
    assert record["draft"]["status"] == "DRAFT"
    # A verified destination is not automatically a published or reserved visit.
    h.locator('.patient-route[data-view="review"]').click()
    h.locator('.ux7-steps').wait_for()
    assert not h.locator('[data-ux7-print="issued"]').count(), "No valid issued snapshot before publish"
    assert h.locator('[data-ux7-print="draft"]').is_visible()
    h.evaluate('''()=>{
      window.print=()=>{window.__printed=document.getElementById("ux7-print-sheet")?.innerText;};
    }''')
    h.locator('[data-ux7-print="draft"]').click()
    printed=h.evaluate('window.__printed')
    assert printed and "검토용 초안" in printed and "환자에게 발행되지 않음" in printed
    assert "가상 검증병원" not in printed, "Draft print must not leak internal destination fields"
    assert h.locator('#ux7-print-sheet').count()==1
    h.emulate_media(media="print")
    assert h.locator('#ux7-print-sheet').evaluate('(e)=>getComputedStyle(e).display')=="block"
    h.emulate_media(media="screen")
    h.screenshot(path=str(OUT/"hospital-draft-print-and-destination.png"))
    assert not errors,errors
    ctx.close();browser.close()
print("UX2 V193 PARITY PASSED 5 SCENARIOS")
