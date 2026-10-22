// In-place, synthetic-only walkthrough. No workflow/state/storage mutations.
export const GUIDED_TOUR_STEPS=[
 {scene:'hospital',target:'patients',tag:'01 / 06',title:'환자를 먼저 확인해요',body:'A1에서 가상 환자와 입원건을 선택해요. 이름과 대상이 일치하는지 확인하는 것이 첫 번째 단계예요.'},
 {scene:'hospital',target:'assessment',tag:'02 / 06',title:'필요한 돌봄을 평가해요',body:'A2의 여섯 영역에서 필요한 정보를 확인해요. 영역 등급은 실제 임상 위험도가 아니라 업무 검토용 시연 결과예요.'},
 {scene:'hospital',target:'plan',tag:'03 / 06',title:'환자가 읽을 계획을 작성해요',body:'A3에서 쉬운 안내 문구와 확인된 원천자료를 연결해요. 출처를 고르는 일과 의료진이 내용을 검토하는 일은 구분돼요.'},
 {scene:'hospital',target:'approve',tag:'04 / 06',title:'검토·승인 후 따로 발행해요',body:'분야별 검토를 마친 뒤 지정 최종 승인자가 전체 계획을 승인하고 발행해요. 학습창에서는 버튼을 눌러도 실제 승인이 일어나지 않아요.'},
 {scene:'patient',target:'today',tag:'05 / 06',title:'환자는 오늘 할 일을 먼저 봐요',body:'환자 화면에서는 전문적인 기록보다 당장 확인할 안내를 앞에 두어요. 아래 예시는 과거 독립 B v1.3의 디자인을 설명하기 위한 미리보기예요.'},
 {scene:'patient',target:'schedule',tag:'06 / 06',title:'이제 환자 화면을 직접 체험해 봐요',body:'일정·주의사항·도움 요청을 쉽게 찾는 화면을 확인해 보세요. 마지막 버튼은 실제 A3 발행본이 아닌, 기존 합성 예시 B v1.3을 새 탭에서 열어요.'}
];
const steps=GUIDED_TOUR_STEPS;
const hospitalScene=[
 '<div class="tour-mock-header"><b>CareBridge Lab</b><span>합성 환자 업무 시연 · A1 → A2 → A3</span></div>',
 '<div class="tour-hospital-body">',
 '<nav class="tour-mock-rail"><span data-tour-anchor="patients" class="tour-hotspot">A1 · 환자 선택</span><span data-tour-anchor="assessment" class="tour-hotspot">A2 · 다영역 평가</span><span data-tour-anchor="plan" class="tour-hotspot">A3 · 관리계획</span><span> B · 환자용</span></nav>',
 '<div class="tour-mock-main"><div class="tour-mock-kicker">의료진 업무 화면 · 시연용</div>',
 '<h3>퇴원 후 관리계획</h3>',
 '<div class="tour-mock-patient tour-hotspot" data-tour-anchor="patients-detail"><strong>이정희 (SYN-001)</strong><small>근골격계 수술 후 퇴원 · 합성 정보</small></div>',
 '<div class="tour-mock-domain tour-hotspot" data-tour-anchor="assessment-detail"><strong>6영역 평가</strong><small>의료 · 간호 · 약료 · 기능 · 사회환경 · 돌봄 연속성</small></div>',
 '<div class="tour-mock-plan tour-hotspot" data-tour-anchor="plan-detail"><strong>환자에게 전달할 안내문</strong><span>오늘 필요한 관리부터 확인해 주세요.</span><small>원천자료 확인 · 직종별 검토</small></div>',
 '<div class="tour-mock-approval tour-hotspot" data-tour-anchor="approve"><span>검토 요청</span><span>승인</span><strong>계획 발행</strong></div>',
 '</div></div>'
].join('');
const patientScene=[
 '<div class="tour-mock-header"><b>D. 나의 하루</b><span>독립 B v1.3 스타일의 합성 화면 구조 안내</span></div>',
 '<div class="tour-patient-body"><aside><strong>D.</strong><span>오늘</span><span>일정</span><span>도움</span><span>내 정보</span></aside>',
 '<div class="tour-patient-main"><small>이정희님 · 가상 환자 안내</small><h3>퇴원 후,<br>오늘의 관리 계획</h3>',
 '<div class="tour-patient-cards tour-hotspot" data-tour-anchor="today"><strong>오늘 확인할 안내</strong><div>자가관리 안내를 확인해요 <span>›</span></div><div>이동 보조도구 안내 <span>›</span></div></div>',
 '<div class="tour-patient-schedule tour-hotspot" data-tour-anchor="schedule"><strong>일정 및 도움</strong><p>진료 일정 · 주의사항 · 공식 문의처 확인</p></div>',
 '</div></div>'
].join('');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openPatientTour(trigger){
 let dialog=document.getElementById('patient-learning-tour');
 if(!dialog){
  dialog=document.createElement('dialog');
  dialog.id='patient-learning-tour';
  dialog.className='tour-dialog';
  dialog.setAttribute('aria-labelledby','tour-title');
  dialog.setAttribute('aria-describedby','tour-description');
  dialog.innerHTML=[
   '<div class="tour-head"><div><small>CAREBRIDGE LAB · 인터랙티브 안내</small><h2 id="tour-title">퇴원 안내 흐름 따라가기</h2></div><button type="button" class="tour-close" data-tour-control="close" aria-label="튜토리얼 닫기">×</button></div>',
   '<div class="tour-progress"><span id="tour-count"></span><div class="tour-progress-track"><span id="tour-progress-fill"></span></div><button type="button" data-tour-control="skip">마지막 단계로</button></div>',
   '<div class="tour-scene" id="tour-scene" aria-label="가상 화면 예시">',
   '<div id="tour-scene-content"></div><div class="tour-shade" aria-hidden="true"></div><span id="tour-arrow" class="tour-arrow" aria-hidden="true">↙</span>',
   '</div>',
   '<div class="tour-guidance" role="status" aria-live="polite"><div class="tour-step-no" id="tour-step-no"></div><h3 id="tour-step-title"></h3><p id="tour-description"></p><p class="tour-boundary">안내용 그림이에요. 기존 환자 기록이나 발행 상태를 변경하지 않아요.</p></div>',
   '<div class="tour-controls"><button type="button" data-tour-control="previous">← 이전</button><div class="tour-controls-right"><button type="button" data-tour-control="next" class="tour-primary">다음 단계 →</button><a id="tour-open-demo" class="tour-primary" href="../../../patient/index.html" target="_blank" rel="noopener" hidden>기존 B v1.3 예시 직접 체험 ↗</a></div></div>'
  ].join('');
  document.body.append(dialog);
 }
 let current=0;
 const scene=dialog.querySelector('#tour-scene');
 const sceneContent=dialog.querySelector('#tour-scene-content');
 const prev=dialog.querySelector('[data-tour-control="previous"]');
 const next=dialog.querySelector('[data-tour-control="next"]');
 const finish=dialog.querySelector('#tour-open-demo');
 let activeScene='';
 function draw(){
  const step=steps[current];
  if(activeScene!==step.scene){
   activeScene=step.scene;
   sceneContent.innerHTML=activeScene==='hospital'?hospitalScene:patientScene;
  }
  dialog.querySelector('#tour-count').textContent='단계 '+(current+1)+' / '+steps.length;
  dialog.querySelector('#tour-progress-fill').style.width=((current+1)/steps.length*100)+'%';
  dialog.querySelector('#tour-step-no').textContent=step.tag;
  dialog.querySelector('#tour-step-title').textContent=step.title;
  dialog.querySelector('#tour-description').textContent=step.body;
  scene.querySelectorAll('.is-active').forEach(x=>x.classList.remove('is-active'));
  const target=scene.querySelector('[data-tour-anchor="'+step.target+'"]');
  if(target)target.classList.add('is-active');
  prev.disabled=current===0;next.hidden=current===steps.length-1;finish.hidden=current!==steps.length-1;
  const arrow=dialog.querySelector('#tour-arrow');
  if(target){
   const r=target.getBoundingClientRect(),parent=scene.getBoundingClientRect();
   arrow.style.left=Math.max(12,Math.min(parent.width-40,r.left-parent.left+Math.min(r.width,90)))+'px';
   arrow.style.top=Math.max(8,r.top-parent.top-29)+'px';
   arrow.hidden=false;
  }else arrow.hidden=true;
 }
 const onClick=event=>{
  const control=event.target.closest('[data-tour-control]');
  if(!control)return;
  switch(control.dataset.tourControl){
   case 'next':current=Math.min(steps.length-1,current+1);draw();next.focus();break;
   case 'previous':current=Math.max(0,current-1);draw();prev.focus();break;
   case 'skip':current=steps.length-1;draw();finish.focus();break;
   case 'close':dialog.close();break;
  }
 };
 const onKey=event=>{
  if(event.key==='ArrowRight'&&!event.altKey){event.preventDefault();current=Math.min(steps.length-1,current+1);draw();}
  if(event.key==='ArrowLeft'&&!event.altKey){event.preventDefault();current=Math.max(0,current-1);draw();}
 };
 const onClose=()=>{
  dialog.removeEventListener('click',onClick);
  dialog.removeEventListener('keydown',onKey);
  dialog.removeEventListener('close',onClose);
  window.removeEventListener('resize',draw);
  if(trigger&&trigger.isConnected)trigger.focus({preventScroll:true});
 };
 dialog.addEventListener('click',onClick);
 dialog.addEventListener('keydown',onKey);
 dialog.addEventListener('close',onClose);
 finish.addEventListener('click',()=>dialog.close(),{once:true});
 window.addEventListener('resize',draw);
 dialog.showModal();
 draw();
 dialog.querySelector('[data-tour-control="close"]').focus();
}
