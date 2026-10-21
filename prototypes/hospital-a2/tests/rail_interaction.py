from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'preview.html').read_text('utf-8')
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in (1440,1024,801,800,390,320):
    page=browser.new_page(viewport={'width':width,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML,wait_until='load')
    shell=page.locator('.shell')
    toggle=page.locator('#toggle-rail')
    assert page.locator('#patient-subtitle').inner_text().count('가상')==1
    if width>800:
      expanded_width=page.locator('.rail').evaluate('(el)=>el.getBoundingClientRect().width')
      before=page.locator('.main').evaluate('(el)=>el.getBoundingClientRect().width')
      assert abs(expanded_width-242)<3,expanded_width
      page.locator('#field-mobility').select_option('independent') if page.locator('#field-mobility').count() else None
      # simulate input change and preserve through collapse
      field=page.locator('#assessment-form select').first
      field_id=field.get_attribute('id')
      first_opts=field.locator('option').all()
      valid=[o.get_attribute('value') for o in first_opts if o.get_attribute('value') not in ('','CONFLICT')]
      if len(valid)>1:field.select_option(valid[-1])
      v=field.input_value()
      total_before=page.locator('#total-complete').inner_text()
      toggle.click()
      page.wait_for_timeout(300)
      assert shell.evaluate('(el)=>el.classList.contains("is-rail-collapsed")')
      assert toggle.get_attribute('aria-expanded')=='false'
      assert toggle.get_attribute('aria-label')=='사이드바 펼치기'
      after=page.locator('.main').evaluate('(el)=>el.getBoundingClientRect().width')
      narrow_width=page.locator('.rail').evaluate('(el)=>el.getBoundingClientRect().width')
      assert abs(narrow_width-78)<3,narrow_width
      assert after>before+140,(width,before,after)
      assert page.locator('#'+field_id).input_value()==v
      assert page.locator('#total-complete').inner_text()==total_before
      page.get_by_role('button',name='A1 · 환자 목록').click()
      assert page.locator('dialog[open]').count()==1
      page.locator('#modal-close').click()
      page.screenshot(path=str(ROOT/('screen_pc_collapsed.png' if width==1440 else f'rail_collapsed_{width}.png')),full_page=True)
      toggle.click()
      page.wait_for_timeout(300)
      assert toggle.get_attribute('aria-expanded')=='true'
      assert abs(page.locator('.rail').evaluate('(el)=>el.getBoundingClientRect().width')-242)<3
      # Keyboard toggle, focus & return
      toggle.focus();page.keyboard.press('Enter')
      assert toggle.get_attribute('aria-expanded')=='false'
    else:
      assert not toggle.is_visible()
      assert page.get_by_role('button',name='A2 · 다영역 평가').is_visible()
      # data usability in mobile
      assert page.locator('#assessment-form select').count()==5
    assert not page.evaluate('document.documentElement.scrollWidth>window.innerWidth'), width
    assert not errors,errors
    print(json.dumps({'width':width,'status':'PASS','sidebar':('collapsible' if width>800 else 'top nav'), 'overflow':False, 'errors':errors},ensure_ascii=False))
    page.close()
  browser.close()
# Single-session responsive transition while desktop rail is collapsed.
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  pg=b.new_page(viewport={'width':1440,'height':900})
  pg.set_content(HTML)
  pg.locator('#toggle-rail').click()
  pg.wait_for_timeout(250)
  assert pg.locator('.shell.is-rail-collapsed').count()==1
  pg.set_viewport_size({'width':390,'height':844})
  assert pg.get_by_role('button',name='A2 · 다영역 평가').is_visible()
  assert not pg.locator('#toggle-rail').is_visible()
  assert not pg.evaluate('document.documentElement.scrollWidth>window.innerWidth')
  pg.set_viewport_size({'width':1440,'height':900})
  pg.wait_for_timeout(250)
  assert abs(pg.locator('.rail').evaluate('(e)=>e.getBoundingClientRect().width')-78)<3
  print('Responsive resize preserves collapsed rail and mobile nav PASS')
  b.close()