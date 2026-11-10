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
  quick.setAttribute('aria-pressed',String(document.body.classList.contains('large-font')));
  quick.title=document.body.classList.contains('large-font')?'큰 글씨 사용 중 · 누르면 보통 글씨':'누르면 큰 글씨';
  if(navMotion&&layout.querySelector('.v17-page')) main.classList.add('v193-route-enter');
  navMotion=false;
  if(focusQuick){quick.focus({preventScroll:true});focusQuick=false;}
 }
 document.addEventListener('click',event=>{
  const tab=event.target.closest('.v17-app-layout .side .side-nav[data-view],.v17-app-layout .bottom-nav button[data-view]');
  if(tab&&!tab.hasAttribute('aria-current'))navMotion=true;
  const quick=event.target.closest('.v193-connected-quick[data-v193-action=font]');
  if(!quick)return;
  event.preventDefault();event.stopImmediatePropagation();
  const original=document.querySelector('.v17-app-layout .v17-old-font-button[data-action=font]');
  if(original){focusQuick=true;original.click();}
 },true);
 window.addEventListener('patient-render',decorate);
 decorate();
})();
