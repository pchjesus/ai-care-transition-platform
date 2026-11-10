/* Patient B v1.9.3 safe presentation adapter — no clinical/publication/storage mutations. */
(()=>{
 'use strict';
 let navMotion=false,focusQuick=false;
 function decorate(){
  const layout=document.querySelector('.v17-app-layout');
  if(!layout)return;
  const meta=layout.querySelector('.topline .meta'),main=layout.querySelector('.main');
  if(!meta||!main)return;
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
   details.innerHTML='<summary>이 앱은 언제, 어떻게 사용하나요?</summary>'
    +'<div class="v193-howto-body"><p><strong>퇴원 안내를 확인할 때</strong> 의료진이 승인·발행한 현재 안내부터 살펴보세요. 미발행·철회된 계획은 이 앱에 나타나지 않습니다.</p>'
    +'<p><strong>다음 외래를 준비할 때</strong> 일정 탭에서 확인된 날짜와 장소를 보세요. 확인되지 않은 예약이나 목적지는 만들어서 표시하지 않습니다.</p>'
    +'<p><strong>설명이 어렵거나 도움이 필요할 때</strong> 도움 탭에서 발행된 문의 방법을 확인하세요. 실제 의료기관 연락·예약·이동지원 신청을 대신하지는 않습니다.</p>'
    +'<p><strong>정보를 크게 보고 싶을 때</strong> 상단 큰 글씨를 누르거나 내 정보 → 화면 설정에서 크기를 정하세요.</p></div>';
   home.appendChild(details);
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
