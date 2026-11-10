/* Patient B standalone v1.9.2: one-tap text size + persisted segmented preference.
   Uses existing independent demo font storage via its own data-action=font.
   Never writes clinical data, publication, or actual patient records. */
(function(){
'use strict';
const MOTION_KEY='carebridge-demo-b-v18-less-motion';
let reduceMotion=false;
try{reduceMotion=localStorage.getItem(MOTION_KEY)==='1'}catch{}
let guideTrigger=null;
const guide=document.createElement('dialog');
guide.className='v18-setting-dialog v192-guide-dialog';
guide.setAttribute('aria-labelledby','v192-guide-title');
guide.innerHTML=`<div class="v18-modal-header"><h2 id="v192-guide-title">앱 사용법</h2><button class="v18-modal-x" type="button" data-v192="close-guide" aria-label="사용 안내 닫기">×</button></div>
<p>이정희님 가상 사례로 사용법을 살펴봐요.</p>
<ol class="v18-guide-steps">
<li><b>오늘</b> — 보행 보조기, 퇴원 약, 진료 준비 안내를 읽어요.</li>
<li><b>일정</b> — 가상 외래 날짜와 장소를 확인해요. 실제 예약 정보가 아니에요.</li>
<li><b>도움</b> — 필요한 생활·돌봄 정보를 찾아요.</li>
<li><b>알림·내 정보</b> — 개인 알림과 글씨 크기 같은 화면 설정을 바꿀 수 있어요.</li>
</ol>
<p>화면 아래 메뉴와 PC의 왼쪽 메뉴로 언제든 이동할 수 있어요.</p>
<button class="v18-modal-save" type="button" data-v192="close-guide">확인했어요</button>`;
document.body.appendChild(guide);

const makePanel=()=>`<section class="profile-section v192-display-settings" aria-labelledby="v192-display-title">
<div class="profile-section-head"><h2 id="v192-display-title">화면 설정</h2><span class="profile-tag">이 브라우저에 저장</span></div>
<p class="v192-display-description">글씨 크기를 편하게 조절해 보세요. 선택한 크기는 다음에 앱을 열 때도 유지돼요.</p>
<div class="v192-settings-group">
 <div class="v192-setting-title">기본 글씨 크기</div>
 <div class="v192-size-segments" role="group" aria-label="기본 글씨 크기 선택" data-large="false">
  <span class="v192-seg-thumb" aria-hidden="true"></span>
  <button type="button" data-v192-size="normal" aria-pressed="true">보통 글씨</button>
  <button type="button" data-v192-size="large" aria-pressed="false">큰 글씨</button>
 </div>
 <p class="v192-setting-hint">글씨 크기를 선택하면 즉시 화면에 적용됩니다.</p>
</div>
<label class="v192-motion-setting">
 <span><strong>화면 움직임 줄이기</strong><small>불필요한 화면 전환 움직임을 줄여요.</small></span>
 <input type="checkbox" id="v192-reduce-motion" role="switch" aria-label="화면 움직임 줄이기">
 <span class="v192-switch-graphic" aria-hidden="true"></span>
</label>
<p class="v192-settings-feedback" role="status" aria-live="polite"></p>
</section>`;

function refresh(){
 document.body.classList.toggle('v18-less-motion',reduceMotion);
 const meta=document.querySelector('.app-layout .topline .meta');
 if(meta){
  const guideButton=meta.querySelector('.patient-header-help');
  const quick=meta.querySelector('.v192-quick-font');
  const virtual=meta.querySelector('.tiny-pill');
  if(quick){
   quick.setAttribute('aria-pressed',String(document.body.classList.contains('large-font')));
   quick.title=document.body.classList.contains('large-font')?'큰 글씨 사용 중. 누르면 보통 글씨로 돌아갑니다.':'누르면 큰 글씨로 바뀝니다.';
   if(guideButton&&guideButton.nextElementSibling!==quick)meta.insertBefore(guideButton,quick);
   if(virtual&&quick.nextElementSibling!==virtual)meta.insertBefore(quick,virtual);
  }
 }
 const profile=document.querySelector('.profile-layout');
 if(profile&&!profile.querySelector('.v192-display-settings')){
  const intro=profile.querySelector('.profile-intro');
  if(intro)intro.insertAdjacentHTML('afterend',makePanel());
  else profile.insertAdjacentHTML('afterbegin',makePanel());
 }
 const s=profile?.querySelector('.v192-size-segments');
 if(s){
  const large=document.body.classList.contains('large-font');
  s.dataset.large=String(large);
  s.querySelectorAll('[data-v192-size]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.v192Size==='large')===large)));
 }
 const motion=profile?.querySelector('#v192-reduce-motion');
 if(motion)motion.checked=reduceMotion;
}
function setSize(large,clicked){
 const current=document.body.classList.contains('large-font');
 if(current!==large){
  const original=document.querySelector('.patient-page-tools [data-action="font"]')||document.querySelector('.app-layout [data-action="font"]')||document.querySelector('.devbar [data-action="font"]');
  if(!original){
   const note=document.querySelector('.v192-settings-feedback');
   if(note)note.textContent='글씨 크기를 바꾸는 버튼을 찾지 못했어요.';
   return;
  }
  original.click();
 }
 refresh();
 const currentButton=document.querySelector('.v192-display-settings [data-v192-size="'+(large?'large':'normal')+'"]');
 (currentButton||clicked)?.focus({preventScroll:true});
 const note=document.querySelector('.v192-settings-feedback');
 if(note)note.textContent=large?'큰 글씨를 기본으로 사용합니다.':'보통 글씨를 기본으로 사용합니다.';
}
guide.addEventListener('close',()=>{
 const target=guideTrigger?.isConnected?guideTrigger:document.querySelector('[data-v18="guide"]');
 target?.focus({preventScroll:true});guideTrigger=null;
});
document.addEventListener('click',e=>{
 const choice=e.target.closest('[data-v192-size]');
 if(choice){e.preventDefault();setSize(choice.dataset.v192Size==='large',choice);return;}
 const open=e.target.closest('[data-v18="guide"]');
 if(open){e.preventDefault();guideTrigger=open;guide.showModal();guide.querySelector('.v18-modal-x')?.focus({preventScroll:true});return;}
 const close=e.target.closest('[data-v192="close-guide"]');
 if(close){e.preventDefault();guide.close();}
});
document.addEventListener('change',e=>{
 if(e.target.id!=='v192-reduce-motion')return;
 reduceMotion=e.target.checked;
 document.body.classList.toggle('v18-less-motion',reduceMotion);
 let saved=true;
 try{localStorage.setItem(MOTION_KEY,reduceMotion?'1':'0')}catch{saved=false}
 const note=document.querySelector('.v192-settings-feedback');
 if(note)note.textContent=saved?(reduceMotion?'불필요한 화면 움직임을 줄였어요.':'화면 움직임을 다시 켰어요.'):'화면에는 적용했지만 다음 방문에 저장하지 못했어요.';
});
window.addEventListener('patient-render',refresh);
refresh();
})();
