/* Patient B v1.9.3 safe presentation adapter — no clinical/publication/storage mutations. */
(()=>{
 'use strict';
 let navMotion=false,focusQuick=false;
 function decorate(){
  const layout=document.querySelector('.v17-app-layout');
  if(!layout)return;
  const meta=layout.querySelector('.topline .meta'),main=layout.querySelector('.main');
  if(!meta||!main)return;
  // The comfort adapter also adds a tour button. Keep one clear entry point.
  meta.querySelector('.patient-header-help[data-comfort="tour"]')?.remove();
  if(!meta.querySelector('.v193-connected-tour')){
   const tour=document.createElement('button');tour.type='button';
   tour.className='v193-connected-tour';tour.dataset.comfort='tour';
   tour.textContent='사용 안내';tour.setAttribute('aria-label','앱의 주요 메뉴 사용법 보기');
   meta.insertBefore(tour,meta.querySelector('.tiny-pill'));
  }
  let quick=meta.querySelector('.v193-connected-quick');
  if(!quick){
   quick=document.createElement('button');quick.type='button';quick.className='v193-connected-quick';
   quick.dataset.v193Action='font';quick.textContent='큰 글씨';quick.setAttribute('aria-label','큰 글씨 켜기 또는 보통 글씨로 돌아가기');
   meta.insertBefore(quick,meta.querySelector('.tiny-pill'));
  }

  const profile=layout.querySelector('.profile-layout');
  if(profile&&!profile.querySelector('.v193-display-settings')){
   const card=document.createElement('section');
   card.className='profile-section v193-display-settings';
   card.setAttribute('aria-labelledby','v193-settings-title');
   card.innerHTML='<h2 id="v193-settings-title">화면 설정</h2>'
      +'<p>글씨 크기를 선택하면 이 브라우저에 저장돼요. 의료진이 발행한 안내 내용은 바뀌지 않아요.</p>'
      +'<div class="v193-segments" role="group" aria-label="기본 글씨 크기">'
      +'<span class="v193-seg-thumb" aria-hidden="true"></span>'
      +'<button type="button" data-v193-size="normal" aria-pressed="true">보통 글씨</button>'
      +'<button type="button" data-v193-size="large" aria-pressed="false">큰 글씨</button></div>'
      +'<button type="button" class="v193-open-reader" data-v17-action="reader">움직임 줄이기 설정 열기</button>'
      +'<p class="v193-info-note">설정은 화면에만 적용됩니다. 약·진료 정보나 의료진 승인 상태를 수정하지 않아요.</p>';
   const lead=profile.querySelector('.profile-intro');
   if(lead)lead.insertAdjacentElement('afterend',card);else profile.appendChild(card);
  }
  const large=document.body.classList.contains('large-font');
  layout.querySelectorAll('[data-v193-size]').forEach(button=>{
   button.setAttribute('aria-pressed',String((button.dataset.v193Size==='large')===large));
  });
  const segment=layout.querySelector('.v193-segments');if(segment)segment.dataset.large=String(large);
  const home=layout.querySelector('.v17-first-steps');
  if(home&&!home.querySelector('.v193-howto')){
   const details=document.createElement('details');
   details.className='v193-howto';
   // All content below is static help: never infer or modify clinical publication data.
   const menus=[
    ['today','오늘','먼저 읽을 안내와 발행된 PDF를 확인해요.','퇴원 후 안내를 다시 읽을 때','오늘 안내 보기','<path d="m3 10 9-7 9 7v10H4V10z"/><path d="M9 21v-8h6v8"/>'],
    ['schedule','일정','의료진이 발행한 진료 날짜·시간·장소를 확인해요.','외래 진료를 준비할 때','진료 일정 보기','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/>'],
    ['help','도움','주의사항과 의료진이 발행한 문의 방법을 찾아봐요.','설명이 어렵거나 문의할 때','도움 안내 보기','<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.6 1.3c-.7 1-2.1 1.4-2.1 3M12 17h.01"/>'],
    ['reminders','알림','발행 변경 소식과 이 브라우저의 개인 준비 알림을 확인해요.','일정을 잊지 않도록 준비할 때','알림 확인하기','<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'],
    ['profile','내 정보','가상 환자·입원건·발행 버전을 확인하고 글씨를 키워요.','정보와 화면 설정을 확인할 때','내 정보 보기','<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>']
   ];
   const guideIcon=path=>'<svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
   details.innerHTML='<summary>이 앱은 언제, 어떻게 사용하나요? · 5개 메뉴</summary>'
    +'<div class="v193-howto-body"><p class="v193-guide-intro">퇴원할 때 설명을 듣고, 집에서 안내를 다시 읽거나 다음 진료를 준비할 때 사용하세요. <strong>의료진이 승인·발행한 내용만</strong> 표시해요.</p>'
    +'<ol class="v193-guide-menu">'+menus.map(([view,title,desc,when,cta,glyph])=>'<li class="v193-guide-item"><span class="v193-guide-icon">'+guideIcon(glyph)+'</span><div class="v193-guide-copy"><h3>'+title+'</h3><p>'+desc+'</p><small>'+when+'</small><button type="button" data-view="'+view+'">'+cta+' →</button></div></li>').join('')+'</ol>'
    +'<div class="v193-guide-boundary"><strong>이용 전 꼭 알아두세요.</strong><p>이 화면에서 병원 예약·진료 문의 전송·택시 호출은 되지 않아요. 알림과 내 정보의 가상 입력은 실제 의료기관에 보내지지 않아요. PDF는 발행된 문서가 있을 때만 열 수 있어요.</p><p>설명과 실제 진료 내용이 다르거나 확실하지 않으면 담당 의료진에게 직접 확인하세요.</p></div></div>';
   home.appendChild(details);
  }

  const help=layout.querySelector('.v17-help');
  if(help&&!help.querySelector('.v193-clinician-questions')){
   const questions=document.createElement('section');
   questions.className='v193-clinician-questions';
   questions.setAttribute('aria-labelledby','v193-questions-title');
   questions.innerHTML='<h2 id="v193-questions-title">의료진에게 확인할 질문</h2>'
    +'<p>퇴원 전 또는 다음 진료에서 아래 내용을 물어보세요. 이 화면은 질문을 자동 전송하지 않습니다.</p>'
    +'<ul><li>지금 표시된 안내가 제가 따라야 할 <strong>최신 발행본</strong>인가요?</li>'
    +'<li>약 이름·복용 방법과 주의할 점은 어떤 안내문에서 확인하나요?</li>'
    +'<li>다음 진료 날짜·장소가 실제로 예약되었는지 어디에서 확인하나요?</li>'
    +'<li>몸 상태가 달라지거나 도움이 필요할 때 어디로 연락하나요?</li>'
    +'<li>집에서 돌봄이나 이동 지원이 필요하면 누구에게 문의하나요?</li></ul>'
    +'<a class="v193-questions-link" href="#v193-help-published">발행된 문의·주의 안내 확인하기 →</a>'
    +'<p class="v193-questions-note">이곳에 적힌 질문은 진료 지시나 예약 확정이 아닙니다. 긴급 상황에서는 이 앱의 알림을 기다리지 말고 119 또는 응급의료기관에 연락하세요.</p>';
   const group=help.querySelector('.v17-help-groups');
   if(group){group.id='v193-help-published';group.insertAdjacentElement('beforebegin',questions);}
  }
  quick.setAttribute('aria-pressed',String(document.body.classList.contains('large-font')));
  quick.title=document.body.classList.contains('large-font')?'큰 글씨 사용 중 · 누르면 보통 글씨':'누르면 큰 글씨';
  if(navMotion&&layout.querySelector('.v17-page')) main.classList.add('v193-route-enter');
  navMotion=false;
  if(focusQuick){quick.focus({preventScroll:true});focusQuick=false;}
 }
 document.addEventListener('click',event=>{
  const tab=event.target.closest('.v17-app-layout .side .side-nav[data-view],.v17-app-layout .bottom-nav button[data-view]');
  if(tab&&!tab.hasAttribute('aria-current'))navMotion=true;

  const size=event.target.closest('.v193-display-settings [data-v193-size]');
  if(size){
   event.preventDefault();event.stopImmediatePropagation();
   const isLarge=document.body.classList.contains('large-font');
   const desired=size.dataset.v193Size==='large';
   if(isLarge!==desired){
    const original=document.querySelector('.v17-app-layout .v17-old-font-button[data-action=font]');
    if(original){original.click();}
   }
   decorate();
   const chosen=document.querySelector('.v193-display-settings [data-v193-size="'+(desired?'large':'normal')+'"]');
   chosen?.focus({preventScroll:true});
   return;
  }

  const quick=event.target.closest('.v193-connected-quick[data-v193-action=font]');
  if(!quick)return;
  event.preventDefault();event.stopImmediatePropagation();
  const original=document.querySelector('.v17-app-layout .v17-old-font-button[data-action=font]');
  if(original){focusQuick=true;original.click();}
 },true);
 window.addEventListener('patient-render',decorate);
 decorate();
})();
