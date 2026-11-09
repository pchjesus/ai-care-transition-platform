/* Patient B v1.7 display controls: separate from clinical, medication or publication data. */
(() => {
  'use strict';
  const key = 'carebridge-patient-v17-reduce-motion';
  const modal = document.getElementById('v17-reader-dialog');
  const fontButtons = [...document.querySelectorAll('[data-v17-font]')];
  const motionControl = document.getElementById('v17-reduce-motion');
  const status = document.getElementById('v17-settings-status');
  let returnFocus = null;
  let motionOff = false;
  try { motionOff = localStorage.getItem(key) === '1'; } catch {}
  function applyMotion() {
    document.body.classList.toggle('v17-motion-off', motionOff);
    if (motionControl) motionControl.checked = motionOff;
  }
  function updateFontButtons() {
    const large = document.body.classList.contains('large-font');
    for (const b of fontButtons) b.setAttribute('aria-pressed', String(b.dataset.v17Font === (large ? 'large' : 'normal')));
  }
  function icon(name) {
    return name === 'reader'
      ? '<svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 6h14M5 12h9M5 18h7"/><path d="M17 10v8m-3-4h6"/></svg>'
      : '';
  }
  function decorate() {
    const layout = document.querySelector('.v17-app-layout');
    if (!layout) return;
    const top = layout.querySelector('.topline');
    const meta = top?.querySelector('.meta');
    if (top && !top.querySelector('.v17-reader-launch')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v17-reader-launch';
      button.dataset.v17Action = 'reader';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-label', '글씨 크기와 움직임 설정');
      button.innerHTML = icon('reader') + '<span>읽기 설정</span>';
      top.insertBefore(button, meta);
    }
    const body = layout.querySelector('.app-body');
    if (!body) return;
    if (!body.querySelector('.v17-journey')) {
      const nav = document.createElement('nav');
      nav.className = 'v17-journey';
      nav.setAttribute('aria-label', '페이지 이동');
      nav.innerHTML =
        '<button type="button" data-v17-action="back">〈 이전</button>' +
        '<button type="button" data-v17-action="home">오늘 홈</button>' +
        '<button type="button" data-v17-action="next">다음 〉</button>' +
        '<a href="../index.html">서비스 홈</a>';
      const main = body.querySelector('#main-content');
      if (main) body.insertBefore(nav, main);
    }
    for (const action of ['back', 'next']) {
      const real = top?.querySelector('[data-action="' + action + '"]');
      const copy = body.querySelector('.v17-journey [data-v17-action="' + action + '"]');
      if (copy) copy.disabled = !real || real.disabled;
    }
    updateFontButtons();
    applyMotion();
  }
  function showReader(trigger) {
    if (!modal || !modal.showModal) return;
    if (modal.open) return;
    returnFocus = trigger;
    updateFontButtons();
    applyMotion();
    if (status) status.textContent = '';
    modal.showModal();
    modal.querySelector('.v17-dialog-close')?.focus();
  }
  function closeReader() { if (modal?.open) modal.close(); }
  modal?.addEventListener('close', () => {
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    returnFocus = null;
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-v17-action], button[data-v17-font]');
    if (!button) return;
    const action = button.dataset.v17Action;
    if (!action && !button.dataset.v17Font) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action === 'reader') { showReader(button); return; }
    if (action === 'close') { closeReader(); return; }
    if (button.dataset.v17Font) {
      const wantLarge = button.dataset.v17Font === 'large';
      const isLarge = document.body.classList.contains('large-font');
      if (wantLarge !== isLarge) {
        const real = document.querySelector('.v17-app-layout .topline [data-action="font"]');
        if (!real) { if (status) status.textContent = '글씨 크기 조절을 사용할 수 없어요.'; return; }
        real.click(); // Existing B preference and rendering logic owns the change.
      }
      updateFontButtons();
      if (status) status.textContent = wantLarge ? '큰 글씨를 적용했어요.' : '보통 글씨를 적용했어요.';
      button.focus();
      return;
    }
    if (['back', 'home', 'next'].includes(action)) {
      const real = document.querySelector('.v17-app-layout .topline [data-action="' + action + '"]');
      if (real && !real.disabled) real.click();
    }
  }, true);
  motionControl?.addEventListener('change', () => {
    motionOff = motionControl.checked;
    applyMotion();
    try {
      localStorage.setItem(key, motionOff ? '1' : '0');
      if (status) status.textContent = motionOff ? '움직임을 줄였어요. 이 브라우저에 저장했습니다.' : '부드러운 전환을 켰어요. 이 브라우저에 저장했습니다.';
    } catch {
      if (status) status.textContent = '현재 화면에 적용했지만 저장하지 못했습니다.';
    }
  });
  window.addEventListener('patient-render', decorate);
  decorate();
})();