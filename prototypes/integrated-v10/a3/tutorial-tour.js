// Read-only spotlight over the real workbench. The bridge exposes rendering only.
export const GUIDED_TOUR_STEPS=Object.freeze([
 {screen:'patients',target:'patients',title:'환자 선택을 먼저 알아요',body:'A1 환자 목록에서 검토할 대상을 찾습니다. 이 둘러보기에서는 환자를 실제로 변경하지 않습니다.'},
 {screen:'patients',target:'patient-context',title:'이름과 입원건을 확인해요',body:'현재 선택된 합성 환자 정보입니다. 같은 환자와 입원건인지 확인한 뒤 업무를 시작합니다.'},
 {screen:'assessment',target:'assessment-domains',title:'여섯 평가 영역을 살펴봐요',body:'의료·간호·약료·기능·사회환경·돌봄 연속성을 확인합니다. 영역을 선택하면 해당 입력과 결과를 볼 수 있습니다.'},
 {screen:'assessment',target:'assessment-work',title:'입력값과 판단 결과를 구분해요',body:'입력 옆의 결과는 업무 검토 우선도이며 임상 위험도나 퇴원 허가가 아닙니다. 모바일에서는 결과가 입력 아래에 이어집니다.'},
 {screen:'plan',target:'plan-item',title:'환자가 읽을 안내를 작성해요',body:'확인한 내용을 쉬운 말로 작성합니다. 이 투어는 입력·저장하지 않으며, 실제 작성은 별도 합성 사본 실습에서 진행합니다.'},
 {screen:'plan',target:'plan-sources',title:'확인된 원천자료를 연결해요',body:'기록 선택·추가로 여러 자료를 연결할 수 있습니다. 자료를 연결하는 것과 담당자가 내용을 검토하는 것은 별도입니다.'},
 {screen:'plan',target:'roles',title:'직종별 검토와 최종 승인을 구분해요',body:'간호사·약사·의사는 담당 분야를 검토하고, 지정 최종 승인자는 전체 계획을 승인합니다. 여기서는 담당 역할을 전환하지 않습니다.'},
 {screen:'plan',target:'workflow',title:'승인과 발행은 별개예요',body:'검토 요청 후 승인 조건을 확인하고, 승인된 계획을 따로 발행합니다. 숨겨진 버튼을 만들거나 실제 승인·발행·철회를 실행하지 않습니다.'},
 {screen:'plan',target:'preview',title:'환자 공개 전에 내용을 확인해요',body:'미리보기의 초안·발행본 표시를 확인합니다. 초안 미리보기는 환자에게 공개된 승인 계획이 아닙니다.'},
 {screen:'plan',target:'preview',title:'독립 환자용 B를 직접 체험해요',body:'아래 버튼은 기존 독립 B v1.3 합성 예시를 새 탭에서 엽니다. 현재 A3 환자의 발행본과 다른 데이터 출처입니다.'}
].map((s,i)=>Object.freeze({...s,tag:`${String(i+1).padStart(2,'0')} / 10`})));

// Coordinates always stay inside the real target and viewport, including zoom.
export function placeSpotlight(rect,viewport,tip){
 const w=viewport.width,h=viewport.height,pad=10,gap=16;
 const tw=Math.min(tip.width,w-pad*2),th=Math.min(tip.height,h-pad*2);
 const clamp=(n,a,b)=>Math.max(a,Math.min(n,Math.max(a,b)));
 const center={left:(w-tw)/2,top:(h-th)/2};
 if(!rect||rect.width<=0||rect.height<=0||rect.bottom<=pad||rect.top>=h-pad||rect.right<=pad||rect.left>=w-pad)return {hole:null,tip:center,side:'none'};
 let hole={left:Math.max(pad,rect.left-5),top:Math.max(pad,rect.top-5),right:Math.min(w-pad,rect.right+5),bottom:Math.min(h-pad,rect.bottom+5)};
 const midX=(hole.left+hole.right)/2,midY=(hole.top+hole.bottom)/2;
 let pos,side;
 if(w-hole.right-pad>=tw+gap){side='right';pos={left:hole.right+gap,top:clamp(midY-th/2,pad,h-th-pad)};}
 else if(hole.left-pad>=tw+gap){side='left';pos={left:hole.left-gap-tw,top:clamp(midY-th/2,pad,h-th-pad)};}
 else if(h-hole.bottom-pad>=th+gap){side='below';pos={left:clamp(midX-tw/2,pad,w-tw-pad),top:hole.bottom+gap};}
 else if(hole.top-pad>=th+gap){side='above';pos={left:clamp(midX-tw/2,pad,w-tw-pad),top:hole.top-gap-th};}
 else{
  const bottom=Math.min(hole.bottom,h-th-gap-pad);
  if(bottom-hole.top<36)return {hole:null,tip:center,side:'none'};
  hole.bottom=bottom;side='below';pos={left:clamp(midX-tw/2,pad,w-tw-pad),top:bottom+gap};
 }
 return {hole:{left:hole.left,top:hole.top,width:hole.right-hole.left,height:hole.bottom-hole.top},tip:pos,side};
}

function targetBounds(el){
 if(!el)return null;
 const r=el.getBoundingClientRect();if(r.width&&r.height)return r;
 // Desktop A2 uses display:contents: highlight its real input/result children.
 const rects=[...el.children].map(child=>child.getBoundingClientRect()).filter(r=>r.width&&r.height);
 if(!rects.length)return null;
 const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top)),right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
 return {left,top,right,bottom,width:right-left,height:bottom-top};
}
let activeClose=null;
export function openPatientTour(trigger,bridge,options={}){
 const steps=options.steps||GUIDED_TOUR_STEPS,brief=!!options.brief;
 if(activeClose){activeClose();return;}
 if(!bridge)return;
 const snapshot=bridge.capture(),returnScroll={x:scrollX,y:scrollY};
 const dialog=document.createElement('dialog');dialog.id=brief?'patient-brief-tour':'patient-learning-tour';dialog.className='spotlight-tour';
 dialog.setAttribute('aria-labelledby','tour-step-title');dialog.setAttribute('aria-describedby','tour-description tour-boundary');
 dialog.innerHTML=`<div class="spot-mask spot-top"></div><div class="spot-mask spot-left"></div><div class="spot-mask spot-right"></div><div class="spot-mask spot-bottom"></div><div class="spot-ring"><button type="button" class="spot-try-target" data-tour-control="try" aria-label="강조한 화면 이동 연습" hidden></button></div><section class="spot-tip"><span class="spot-tail" aria-hidden="true"></span><header class="spot-head"><strong id="tour-count"></strong><button type="button" data-tour-control="close" aria-label="튜토리얼 닫기">×</button></header><div class="spot-copy" tabindex="0" role="status" aria-live="polite" aria-atomic="true"><h2 id="tour-step-title"></h2><p id="tour-description"></p><small id="tour-context"></small><p id="tour-boundary">읽기형 화면 안내 · 실제 입력·저장·승인·발행을 실행하지 않아요.</p><p id="tour-fallback" hidden>강조할 영역이 화면 밖에 있거나 표시되지 않았어요. 설명을 읽거나 ‘대상 다시 보기’를 선택하세요.</p></div><footer class="spot-controls"><button type="button" data-tour-control="try" class="spot-primary" hidden></button><button type="button" data-tour-control="previous">이전</button><button type="button" data-tour-control="next" class="spot-primary">다음</button><button type="button" data-tour-control="locate">대상 다시 보기</button><button type="button" data-tour-control="skip">건너뛰기</button><button type="button" id="tour-finish" data-tour-control="finish" class="spot-primary" hidden>안내 마치기</button><a id="tour-open-demo" class="spot-primary" href="../../../patient/index.html" target="_blank" rel="noopener" hidden>독립 B v1.3 직접 체험 ↗</a></footer></section>`;
 document.body.append(dialog);
 const tip=dialog.querySelector('.spot-tip'),ring=dialog.querySelector('.spot-ring');
 let current=0,tried=false,closed=false,frame=0,observed=null,pointerY=null;
 const observer=new ResizeObserver(()=>schedule());
 const tipObserver=new ResizeObserver(()=>schedule());tipObserver.observe(tip);
 const mutations=new MutationObserver(()=>schedule());
 function displayStep(){const s=steps[current];return tried?{...s,screen:s.tryScreen,target:s.tryTarget,body:s.tryBody}:s;}
 function target(){return bridge.target(displayStep().target);}
 function position(){
  frame=0;if(closed)return;
  const el=target();if(el!==observed){observer.disconnect();observed=el;if(el)observer.observe(el);}
  const view=window.visualViewport,w=view?.width||innerWidth,h=view?.height||innerHeight,ox=view?.offsetLeft||0,oy=view?.offsetTop||0;
  tip.style.width=Math.min(370,w-20)+'px';tip.style.maxHeight=Math.max(100,h-20)+'px';
  const raw=targetBounds(el);
  const r=raw?{left:raw.left-ox,right:raw.right-ox,top:raw.top-oy,bottom:raw.bottom-oy,width:raw.width,height:raw.height}:null;
  const box=tip.getBoundingClientRect();
  const placed=placeSpotlight(r,{width:w,height:h},{width:box.width,height:box.height});
  tip.style.left=(ox+placed.tip.left)+'px';tip.style.top=(oy+placed.tip.top)+'px';tip.dataset.side=placed.side;
  const hole=placed.hole;
  dialog.dataset.fallback=hole?'false':'true';dialog.querySelector('#tour-fallback').hidden=!!hole;
  // The notice can change the tooltip size. A second frame settles its geometry.
  const masks=[dialog.querySelector('.spot-top'),dialog.querySelector('.spot-left'),dialog.querySelector('.spot-right'),dialog.querySelector('.spot-bottom')];
  const regions=hole?[[0,0,w,hole.top],[0,hole.top,hole.left,hole.height],[hole.left+hole.width,hole.top,w-hole.left-hole.width,hole.height],[0,hole.top+hole.height,w,h-hole.top-hole.height]]:[[0,0,w,h],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  regions.forEach(([left,top,width,height],i)=>Object.assign(masks[i].style,{left:(ox+left)+'px',top:(oy+top)+'px',width:width+'px',height:height+'px'}));
  ring.hidden=!hole;
  if(hole){Object.assign(ring.style,{left:(ox+hole.left)+'px',top:(oy+hole.top)+'px',width:hole.width+'px',height:hole.height+'px'});
   tip.style.setProperty('--tail-x',Math.max(16,Math.min(box.width-16,hole.left+hole.width/2-placed.tip.left))+'px');
   tip.style.setProperty('--tail-y',Math.max(16,Math.min(box.height-16,hole.top+hole.height/2-placed.tip.top))+'px');}
 }
 function schedule(){if(!frame&&!closed)frame=requestAnimationFrame(position);}
 function locate(){const el=target(),scrollTarget=el&&el.getClientRects().length?el:el?.firstElementChild;scrollTarget?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});schedule();}
 function draw(){
  const step=displayStep();bridge.show(step);
  dialog.dataset.tried=String(tried);
  for(const b of dialog.querySelectorAll('[data-tour-control="try"]')){b.hidden=!brief||!step.tryScreen||tried;b.textContent=b.classList.contains("spot-try-target")?"":step.tryLabel;b.setAttribute("aria-label",step.tryLabel||"화면 이동 연습");}
  dialog.dataset.step=String(current+1);
  dialog.querySelector('#tour-count').textContent=`${brief?'사용 안내':'화면 둘러보기'} ${current+1} / ${steps.length}`;
  dialog.querySelector('#tour-step-title').textContent=step.title;dialog.querySelector('#tour-description').textContent=step.body;
  dialog.querySelector('#tour-context').textContent=bridge.context();
  dialog.querySelector('[data-tour-control="previous"]').disabled=current===0;
  dialog.querySelector('[data-tour-control="next"]').hidden=current===steps.length-1;
  dialog.querySelector('#tour-open-demo').hidden=brief||current!==steps.length-1;
  dialog.querySelector('#tour-finish').hidden=!brief||current!==steps.length-1;
  if(brief)dialog.querySelector('#tour-boundary').textContent='사용법만 둘러봐요. 의료정보·읽음·이해 확인 기록은 바뀌지 않아요.';
  locate();
 }
 function close(){
  if(closed)return;closed=true;activeClose=null;cancelAnimationFrame(frame);observer.disconnect();tipObserver.disconnect();mutations.disconnect();
  window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
  window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
  for(const type of ['click','change','input','submit','keydown','toggle'])document.removeEventListener(type,blockOutside,true);
  dialog.close();dialog.remove();bridge.restore(snapshot);
  const focus=trigger?.isConnected?trigger:bridge.returnTarget();focus?.focus({preventScroll:true});window.scrollTo({left:returnScroll.x,top:returnScroll.y,behavior:'instant'});
 }
 function blockOutside(event){if(!dialog.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}}
 for(const type of ['click','change','input','submit','keydown','toggle'])document.addEventListener(type,blockOutside,true);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{
  const control=event.target.closest('[data-tour-control]');if(!control)return;
  const action=control.dataset.tourControl;
  if(action==='close'||action==='skip'||action==='finish'){close();return;}
  if(action==='locate'){locate();return;}
  if(action==='try'){tried=true;draw();dialog.querySelector('.spot-copy').focus({preventScroll:true});return;}
  tried=false;
  if(action==='next')current=Math.min(steps.length-1,current+1);
  if(action==='previous')current=Math.max(0,current-1);draw();
  const next=dialog.querySelector('[data-tour-control="next"]'),prev=dialog.querySelector('[data-tour-control="previous"]');
  (action==='previous'&&!prev.disabled?prev:next.hidden?dialog.querySelector(brief?'#tour-finish':'#tour-open-demo'):next).focus({preventScroll:true});
 });
 dialog.querySelector('#tour-open-demo').addEventListener('click',()=>setTimeout(close,0));
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Tab'){
   const nodes=[...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
   if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1).focus();}
   else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0].focus();}
  }
  if(['PageDown','PageUp','ArrowDown','ArrowUp'].includes(event.key)&&document.activeElement!==dialog.querySelector('.spot-copy')){event.preventDefault();window.scrollBy({top:(event.key==='PageUp'||event.key==='ArrowUp'?-1:1)*innerHeight*.5,behavior:'instant'});}
 });
 dialog.addEventListener('wheel',event=>{if(!tip.contains(event.target)&&!event.ctrlKey){event.preventDefault();window.scrollBy({top:event.deltaY,behavior:'instant'});}},{passive:false});
 dialog.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!tip.contains(event.target))pointerY=event.clientY;});
 dialog.addEventListener('pointermove',event=>{if(pointerY!==null&&event.pointerType==='touch'){event.preventDefault();window.scrollBy({top:pointerY-event.clientY,behavior:'instant'});pointerY=event.clientY;}});
 for(const type of ['pointerup','pointercancel'])dialog.addEventListener(type,()=>pointerY=null);
 window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
 window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 mutations.observe(document.querySelector('#shell')||document.querySelector('#app'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 activeClose=close;dialog.showModal();draw();dialog.querySelector('[data-tour-control="close"]').focus({preventScroll:true});
}
