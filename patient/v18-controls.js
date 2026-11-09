/* Synthetic patient-only display controls; leave original publication workflow unchanged. */
(function v18Controls(){
'use strict';
const key='carebridge-demo-b-v18-less-motion';
let reduce=false;
try{reduce=window.localStorage.getItem(key)==='1'}catch{}
let source=null;
const dialog=document.createElement('dialog');
dialog.className='v18-setting-dialog';
dialog.setAttribute('aria-labelledby','v18-dialog-title');
dialog.innerHTML=`<div class="v18-modal-header"><h2 id="v18-dialog-title">읽기 편한 화면</h2><button type="button" class="v18-modal-x" data-v18="close" aria-label="설정 닫기">×</button></div>
<div id="v18-reader-panel"><p>나에게 편한 글씨와 화면 움직임을 선택할 수 있어요.</p>
<span class="v18-segment-label" id="v18-font-caption">글씨 크기</span>
<div class="v18-segments" role="group" aria-labelledby="v18-font-caption">
<button type="button" data-v18-font="normal" aria-pressed="true">보통 글씨</button>
<button type="button" data-v18-font="large" aria-pressed="false">큰 글씨</button></div>
<label class="v18-motion-row"><span><strong>움직임 줄이기</strong><small>화면과 카드의 이동 효과를 줄여요.</small></span><input type="checkbox" id="v18-less-motion" role="switch"><span class="v18-motion-switch" aria-hidden="true"></span></label>
<p class="v18-setting-status" id="v18-feedback" role="status" aria-live="polite"></p></div>
<div id="v18-guide-panel" hidden><p>이정희님 가상 사례를 기준으로 앱 사용법을 보여드려요.</p>
<ol class="v18-guide-steps"><li><b>오늘</b> — 보행 보조기·퇴원 약·진료 준비 안내를 눌러 자세히 읽어요.</li><li><b>일정</b> — 과제용 진료 날짜와 방문 장소를 확인해요. 실제 예약은 아니에요.</li><li><b>도움</b> — 병원 문의, 생활 지원, 이동 정보를 찾아봐요.</li><li><b>알림·내 정보</b> — 개인 설정과 합성 환자 정보를 확인해요.</li></ol>
<p>화면 아래 메뉴를 누르면 언제든 다른 곳으로 이동할 수 있어요.</p></div>
<button type="button" class="v18-modal-save" data-v18="close">확인했어요</button>`;
document.body.appendChild(dialog);
const apply=()=>{document.body.classList.toggle('v18-less-motion',reduce);const input=dialog.querySelector('#v18-less-motion');if(input)input.checked=reduce;};
function updateType(){const large=document.body.classList.contains('large-font');dialog.querySelectorAll('[data-v18-font]').forEach(el=>el.setAttribute('aria-pressed',String((el.dataset.v18Font==='large')===large)));}
function decorate(){
const bar=document.querySelector('.app-layout .topline');
if(!bar){document.body.classList.remove('v18-on-home');apply();return;}
document.body.classList.toggle('v18-on-home',!!document.querySelector('.v18-home'));
if(!bar.querySelector('.v18-settings-trigger')){
 const b=document.createElement('button');b.type='button';b.className='v18-settings-trigger';b.dataset.v18='reader';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label','글씨 크기와 화면 움직임 설정');
 b.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h8M17 10v8m-3-4h6"/></svg><span>읽기 설정</span>';
 bar.insertBefore(b,bar.querySelector('.meta'));
}
apply();
}
function open(mode,trigger){
 if(dialog.open)return;
 source=trigger;
 dialog.querySelector('#v18-dialog-title').textContent=mode==='guide'?'앱 사용법':'읽기 편한 화면';
 dialog.querySelector('#v18-reader-panel').hidden=mode!=='reader';
 dialog.querySelector('#v18-guide-panel').hidden=mode!=='guide';
 const feedback=dialog.querySelector('#v18-feedback');if(feedback)feedback.textContent='';
 updateType();apply();dialog.showModal();dialog.querySelector('.v18-modal-x').focus();
}
function close(){if(dialog.open)dialog.close();}
dialog.addEventListener('close',()=>{const el=source?.isConnected?source:document.querySelector('.v18-settings-trigger,.v18-guide-trigger');el?.focus({preventScroll:true});source=null;});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-v18], [data-v18-font]');if(!b)return;
 const action=b.dataset.v18,font=b.dataset.v18Font;if(!action&&!font)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(action==='reader'||action==='guide'){open(action,b);return;}
 if(action==='close'){close();return;}
 if(font){
  const large=font==='large',on=document.body.classList.contains('large-font');
  if(large!==on){
   const original=document.querySelector('.app-layout [data-action="font"]')||document.querySelector('.devbar [data-action="font"]');
   if(!original){dialog.querySelector('#v18-feedback').textContent='글씨 크기를 바꿀 수 없어요.';return;}
   original.click();
  }
  updateType();dialog.querySelector('#v18-feedback').textContent=large?'큰 글씨를 선택했어요.':'보통 글씨를 선택했어요.';
 }
},true);
dialog.querySelector('#v18-less-motion')?.addEventListener('change',e=>{
 reduce=e.target.checked;apply();
 try{localStorage.setItem(key,reduce?'1':'0');dialog.querySelector('#v18-feedback').textContent=reduce?'움직임 줄이기를 저장했어요.':'부드러운 움직임을 켰어요.';}
 catch{dialog.querySelector('#v18-feedback').textContent='화면에는 적용했지만 저장하지 못했어요.';}
});
window.addEventListener('patient-render',decorate);apply();decorate();
})();
