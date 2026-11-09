(async function hospitalUxV06() {
  'use strict';
  const root = new URL('../integrated-v10/', location.href);
  let storage, workflow, library;
  try {
    [storage, workflow, library] = await Promise.all([
      import(new URL('a3/storage.js', root).href),
      import(new URL('a3/workflow.js', root).href),
      import(new URL('a3/source-library.js', root).href)
    ]);
  } catch (error) {
    console.warn('UX2 v0.6 needs the integrated-v10 modules on the same HTTP(S) origin.', error);
    return;
  }
  const roles = {NURSE:'작성 간호사', PHARMACIST:'약사', PHYSICIAN:'담당 의사', APPROVER:'지정 최종 승인자'};
  const ui = {tab:'items', role:'NURSE', files:new Map(), seen:null, stale:false};
  const key = storage.STORAGE_KEYS.normal;
  const writable = () => /^https?:$/.test(location.protocol) && source.mode!=='invalid' && !ui.stale;
  const editable = r => !!r && !['PUBLISHED','REVOKED'].includes(r.draft.status);
  const itemPermitted = section => ui.role==='APPROVER' || (section==='medication' ? ['PHARMACIST','PHYSICIAN'].includes(ui.role) : ['followup','warning'].includes(section) ? ui.role==='PHYSICIAN' : ['NURSE','PHYSICIAN'].includes(ui.role));
  const issuePermitted = domain => ui.role==='APPROVER' || (domain==='medication' ? ['PHARMACIST','PHYSICIAN'].includes(ui.role) : domain==='medical' ? ui.role==='PHYSICIAN' : ['NURSE','PHYSICIAN'].includes(ui.role));
  const options = (current, list) => list.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('');
  const sectionLabels = {today:'오늘 해야 할 일',medication:'복약·약물 안내',followup:'외래·검사 일정',warning:'주의사항',contact:'문의 안내',support:'생활·이동 지원'};
  const getRecord = () => record(state.patientId);
  const linked = item => workflow.linkedSources(item);
  const sourcesFor = () => library.recordsForPatient(state.patientId, getRecord()?.unlockedSources||[]);
  const dateLabel = x => {try{return x ? new Date(x).toLocaleString('ko-KR'):'—';}catch{return '—';}};
  function refTitle(id) { return sourcesFor().find(s=>s.id===id)?.title || id || '연결 기록 없음'; }
  function entryStatus(r) {
    return `<span class="ux6-state">${esc(PLAN_STATES[r.draft.status]||r.draft.status)} · 초안 v${esc(r.draft.version)}</span>`;
  }
  function accessLine(r) {
    return `<div class="ux6-toolbar"><div><strong>기록 편집 · 합성 사례</strong><p class="small-muted">기존 A3 저장·근거 검증 엔진을 사용합니다. 역할 전환은 모의 권한입니다.</p></div>
      <label class="ux6-role-label">현재 작업 역할<select data-v6-role aria-label="시연용 의료진 역할">${options(ui.role,Object.entries(roles))}</select></label>
      ${entryStatus(r)}</div>
      ${ui.stale?'<p class="ux6-alert">다른 탭에서 기록이 변경되었습니다. 새로고침 후 다시 편집하세요.</p>':''}
      ${!writable()?'<p class="ux6-alert">저장 기능을 사용할 수 없습니다. 저장 기록/실행 환경을 확인하세요. 안전을 위해 편집을 중지했습니다.</p>':''}
      ${!editable(r)?'<p class="ux6-alert">발행·철회된 계획은 수정하지 않습니다. 원본 A3에서 새 버전 개정을 시작하세요.</p>':''}`;
  }
  function sourceDetail(s) {
    return `<details class="ux6-source-detail"><summary>${esc(s.title)} · ${esc(s.verificationStatus)}</summary><p>${esc(s.summary)} ${esc(s.detail)}</p><small>${esc(s.id)} · ${esc(s.encounterId)} · ${esc(s.observedAt)}</small></details>`;
  }
  function renderItems(r) {
    const d = r.draft, items=d.items;
    const selected=items.find(i=>i.id===state.planTab)||items[0];
    const canEdit=writable()&&editable(r);
    const verified=selected.verified&&workflow.validItemSources(r,selected);
    const possible=sourcesFor().filter(s=>library.usableSource(s,'item',selected.section,state.patientId) && !linked(selected).includes(s.id));
    const appointment=selected.section==='followup' ? (selected.appointment||{status:'PENDING',date:'',time:'',place:''}) : null;
    return `<div class="plan-grid ${state.planLayout==='focus'?'focus-mode':''}">
      <section class="surface plan-editor ux6-editor">
        <div class="plan-editor-head"><div><h2 class="section-title">환자 안내문 작성</h2><p class="section-caption">원본 계획 항목 6개 · 실제 합성 기록 저장</p></div>
        <div class="layout-toggle" role="group" aria-label="편집 레이아웃"><button class="btn" data-action="plan-split">나란히</button><button class="btn" data-action="plan-focus">집중</button></div></div>
        <div class="ux6-section-tabs" aria-label="계획 항목">${items.map(i=>`<button type="button" class="ux6-section-tab ${i.id===selected.id?'active':''}" data-plan-tab="${esc(i.id)}" aria-pressed="${i.id===selected.id}">${esc(sectionLabels[i.section]||i.title)}${i.verified&&workflow.validItemSources(r,i)?' ✓':''}</button>`).join('')}</div>
        <div class="ux6-form">
          <div class="ux6-edit-head"><h3>${esc(selected.title)}</h3>${statBadge(verified?'근거·검토 확인':'재검토 필요',verified?'green':'amber')}</div>
          <label for="ux6-plan-text">환자에게 공개할 안내 문구</label>
          <textarea id="ux6-plan-text" rows="6" data-v6-text ${canEdit?'':'disabled'}>${esc(selected.text)}</textarea>
          <div class="ux6-actions"><button type="button" class="btn btn-primary" data-v6-action="save-text" ${canEdit?'':'disabled'}>안내문 저장</button><small>저장 후 해당 항목의 검토 확인은 다시 필요합니다.</small></div>
          ${appointment?`<fieldset class="ux6-appointment" ${canEdit?'':'disabled'}><legend>가상 외래 일정 (선택)</legend><p>실제 예약이 아닙니다. 모든 값과 담당 역할 확인 후 발행되어야 환자 앱에 나타납니다.</p>
            <div class="ux6-fields"><label>상태<select data-v6-appointment="status">${options(appointment.status,[['PENDING','미확정'],['CONFIRMED','확정됨 (가상)']])}</select></label>
              <label>날짜<input type="date" data-v6-appointment="date" value="${esc(appointment.date||'')}"></label>
              <label>시간<input type="time" data-v6-appointment="time" value="${esc(appointment.time||'')}"></label>
              <label>장소<input type="text" maxlength="160" data-v6-appointment="place" value="${esc(appointment.place||'')}"></label></div>
            <button type="button" class="btn" data-v6-action="save-appointment">일정 저장</button></fieldset>`:''}
          <div class="ux6-source-section"><h3>연결한 원천자료 (${linked(selected).length}건)</h3>
            ${linked(selected).length?linked(selected).map(id=>`<div class="ux6-linked"><span>${esc(refTitle(id))}</span><button type="button" class="btn btn-quiet" data-v6-action="unlink" data-v6-id="${esc(id)}" ${canEdit?'':'disabled'} aria-label="${esc(refTitle(id))} 연결 해제">해제</button></div>`).join(''):'<p class="small-muted">연결된 원천자료가 없습니다.</p>'}
            <div class="ux6-actions"><label class="ux6-selectgrow">확인 자료 추가<select id="ux6-add-source" ${canEdit&&possible.length?'':'disabled'}><option value="">근거 선택</option>${possible.map(s=>`<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}</select></label>
            <button type="button" class="btn" data-v6-action="link" ${canEdit&&possible.length?'':'disabled'}>자료 연결</button></div>
            ${sourcesFor().filter(s=>linked(selected).includes(s.id)).map(sourceDetail).join('')}
          </div>
          <div class="ux6-verify-row"><label><input type="checkbox" data-v6-verified ${selected.verified?'checked':''} ${canEdit?'':'disabled'}> 담당 역할로 안내 내용 검토 완료</label><span class="small-muted">${itemPermitted(selected.section)?'현재 역할에서 검토 가능':'이 항목은 다른 담당 역할의 검토가 필요합니다.'}</span></div>
          <div class="ux6-visibility"><label>환자 공개 범위<select data-v6-visibility ${canEdit?'':'disabled'}>${options(selected.visibility,[['PATIENT','환자 공개 대상'],['INTERNAL','의료진 전용']])}</select></label></div>
        </div></section>
      <aside class="surface preview-panel ux6-preview"><h2 class="section-title">환자 안내 미리보기</h2><p class="small-muted">현재 초안 미리보기 · 발행본이 아닙니다.</p>
      <div class="phone-preview"><div class="preview-brand">나의 퇴원안내</div><h3>퇴원 후 필요한 내용을 확인하세요.</h3><div class="preview-content"><strong>${esc(selected.title)}</strong><p id="ux6-preview-text">${esc(selected.text)}</p></div></div>
      <span class="preview-tag">의료진 승인·발행 전에는 환자에게 공개되지 않습니다.</span></aside>
    </div>`;
  }
  function renderIssues(r) {
    const canEdit=writable()&&editable(r);
    const results=r.assessment.domainResults||[];
    return `<section class="surface ux6-card"><h2 class="section-title">평가 근거 및 미해결 항목</h2><p class="section-caption">A2의 인계된 평가 결과와 원본 A3 이슈 검증 규칙을 함께 사용합니다.</p>
      ${r.a2Dirty?'<p class="ux6-alert">A2 수정값이 아직 A3에 인계되지 않았습니다. 먼저 평가 탭에서 인계하세요.</p>':''}
      <div class="ux6-result-grid">${results.map(x=>`<div class="ux6-result"><strong>${esc(domains.find(d=>d.id===x.id)?.name||x.id)}</strong><span>${esc(x.status==='READY'?'평가 완료':x.status==='UNKNOWN'?'미평가':'상충')} · ${x.status==='READY'?esc(String(x.grade))+'등급':'판단 보류'}</span><small>필수 ${Number(x.requiredDone)||0}/${Number(x.requiredTotal)||0}</small></div>`).join('')}</div>
      ${r.draft.issues.length?r.draft.issues.map(issue=>{
        const choices=sourcesFor().filter(s=>library.usableSource(s,'issue',issue,state.patientId));
        const resolved=issue.status==='RESOLVED';
        return `<article class="ux6-issue" data-v6-issue="${esc(issue.id)}"><div class="ux6-edit-head"><h3>${esc(issue.title)}</h3>${statBadge(resolved?'해결 기록됨':'확인 필요',resolved?'green':'amber')}</div><p>${esc(issue.reason)}</p>
          <label>확인한 원천자료<select data-v6-issue-source ${canEdit&&!resolved?'':'disabled'}><option value="">선택하세요</option>${choices.map(s=>`<option value="${esc(s.id)}" ${issue.source===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label>
          <label>검토 내용 (최소 10자)<textarea rows="3" data-v6-resolution ${canEdit&&!resolved?'':'disabled'}>${esc(issue.resolution)}</textarea></label>
          ${resolved?`<p class="small-muted">확인 역할: ${esc(issue.reviewer)} · 근거: ${esc(refTitle(issue.source))}</p>`:`<button type="button" class="btn btn-primary" data-v6-action="resolve" ${canEdit?'':'disabled'}>근거 확인·해결 저장</button>`}
          <p class="small-muted">${issuePermitted(issue.domain)?'현재 역할에서 해결 가능':'이 항목은 담당 역할의 확인이 필요합니다.'}</p>
        </article>`;
      }).join(''):'<p class="ux6-empty">별도 미해결 이슈가 없습니다. 계획 항목별 확인도 완료해야 합니다.</p>'}</section>`;
  }
  function renderDocs(r) {
    const canEdit=writable()&&editable(r);
    return `<section class="surface ux6-card"><h2 class="section-title">안내문 · PDF 문서 관리</h2>
      <p class="section-caption">4MB 이하 PDF 원본의 형식·해시를 검사합니다. 파일 원본은 탭 메모리에서만 유지되고, 메타데이터만 로컬에 저장됩니다.</p>
      <label class="ux6-file">PDF 선택<input type="file" accept=".pdf,application/pdf" data-v6-pdf ${canEdit?'':'disabled'}></label>
      <div class="ux6-doc-list">${r.draft.docs.length?r.draft.docs.map(d=>`<article class="ux6-doc" data-v6-doc="${esc(d.id)}">
        <div class="ux6-edit-head"><h3>${esc(d.name)}</h3>${statBadge(d.status==='REVIEWED'?'검토 완료':'검토 필요',d.status==='REVIEWED'?'green':'amber')}</div>
        <p class="small-muted">${(Number(d.size)/1024).toFixed(1)} KB · SHA-256 ${esc(d.fileHash.slice(0,18))}… · ${ui.files.has(d.id)?'원본 연결됨':'원본 재첨부 필요'}</p>
        <div class="ux6-fields"><label>공개 범위<select data-v6-doc-visibility ${canEdit?'':'disabled'}>${options(d.visibility,[['INTERNAL','의료진 전용'],['PATIENT','환자 공개']])}</select></label>
        <label>문서 분류<select data-v6-doc-category ${canEdit?'':'disabled'}>${options(d.category||'GENERAL',[['GENERAL','일반 안내'],['MEDICATION','복약 안내']])}</select></label></div>
        <div class="ux6-actions"><button type="button" class="btn" data-v6-action="open-pdf" ${ui.files.has(d.id)?'':'disabled'}>PDF 보기</button>
        <button type="button" class="btn" data-v6-action="review-pdf" ${canEdit&&ui.files.has(d.id)?'':'disabled'}>내용 검토 확인</button>
        <button type="button" class="btn" data-v6-action="remove-pdf" ${canEdit?'':'disabled'}>제외</button></div>
      </article>`).join(''):'<p class="ux6-empty">첨부된 문서가 없습니다.</p>'}</div>
      <p class="ux6-alert">새로고침 또는 원본 A3로 이동하면 PDF 파일을 다시 첨부해야 합니다. 검토 표시만으로 환자에게 문서가 발행되지는 않습니다.</p>
    </section>`;
  }
  function planV6() {
    const r=getRecord(), count=r.draft.items.filter(i=>i.verified&&workflow.validItemSources(r,i)).length;
    return `<section class="screen">${renderHeading('환자별 업무 / 계획 작성','퇴원계획 · 근거 · 문서','기존 A3 기록을 이 화면에서 직접 수정하고 저장합니다. 발행은 별도의 승인 절차 이후에 진행됩니다.')}
      ${patientBanner()}${accessLine(r)}
      <nav class="ux6-main-tabs" aria-label="퇴원계획 작업 유형">
        ${[['items','퇴원계획 작성'],['issues','평가 근거·미해결'],['docs','안내문·문서']].map(([id,label])=>`<button type="button" data-v6-tab="${id}" class="${ui.tab===id?'active':''}" aria-pressed="${ui.tab===id}">${label}</button>`).join('')}
        <span class="small-muted">계획 확인 ${count}/${r.draft.items.length} · 미해결 ${r.draft.issues.filter(i=>i.status!=='RESOLVED').length}건</span>
      </nav>
      ${ui.tab==='items'?renderItems(r):ui.tab==='issues'?renderIssues(r):renderDocs(r)}
      <div class="ux6-original-link"><a class="btn" href="${esc(new URL('../integrated-v10/a3/index.html?screen=plan&patient='+encodeURIComponent(state.patientId),location.href).href)}" target="_blank" rel="noopener noreferrer">원본 A3에서 검토·승인·발행 이어가기 ${icon('arrow-up-right')}</a><p class="small-muted">같은 출처에서 열린 경우에만 합성 저장 기록이 공유됩니다.</p></div>
    </section>`;
  }
  function reviewV6() {
    const r=getRecord(), d=r.draft, available=new Set(ui.files.keys());
    const blocking=workflow.blockers(r,available);
    const currentPublication=workflow.currentPublished(r);
    return `<section class="screen">${renderHeading('환자별 업무 / 검토·발행','검토·승인·발행 상태','기존 A3의 발행 차단 규칙을 그대로 계산하여 미해결 사유와 기록을 확인합니다. 이 버전에서는 발행·개정·철회를 수행하지 않습니다.')}
      ${patientBanner()}${accessLine(r)}
      <div class="review-state">${statBadge(PLAN_STATES[d.status]||d.status,d.status==='PUBLISHED'?'green':'blue')}
        <span class="review-counter">초안 ${esc(d.version)} · 현재 공개 중인 발행본: ${currentPublication?'v'+esc(currentPublication.snapshot.planVersion):'없음'}</span></div>
      <div class="ux6-review-grid"><section class="surface ux6-card"><h2 class="section-title">발행 전 확인 사항 · ${blocking.length}건</h2>
        ${blocking.length?`<ul class="ux6-blockers">${blocking.map(b=>`<li><strong>${esc(b.group||'확인')}</strong><span>${esc(b.label)}</span></li>`).join('')}</ul>`:'<p class="ux6-empty">현재 탭에 연결된 PDF까지 포함해 차단 사유가 없습니다. 최종 역할·승인은 별도 원본 A3에서 확인합니다.</p>'}
        <div class="ux6-actions"><button type="button" class="btn" data-view="assessment">A2 평가 확인</button><button type="button" class="btn" data-view="plan">계획·문서 수정</button></div>
      </section><aside class="surface ux6-card"><h2 class="section-title">계획 및 발행 이력</h2>
        <p>승인 기록: ${d.approval?esc(d.approval.role)+' · '+esc(dateLabel(d.approval.at)):'없음'}</p>
        <p>변경 이력 ${r.audit.length}건 · 발행 기록 ${r.publications.length}건</p>
        <details><summary>변경 이력 보기</summary><ol class="ux6-history">${r.audit.slice(0,30).map(x=>`<li><b>${esc(x.event)}</b> · ${esc(x.role)}<small>${esc(dateLabel(x.at))} · ${esc(x.details)}</small></li>`).join('')}</ol></details>
        <a class="btn btn-primary" href="${esc(new URL('../integrated-v10/a3/index.html?screen=plan&patient='+encodeURIComponent(state.patientId),location.href).href)}" target="_blank" rel="noopener noreferrer">원본 A3에서 후속 승인 업무 진행 ${icon('arrow-up-right')}</a>
        <p class="small-muted">의료진 역할은 시연용입니다. 승인·발행은 자동으로 이뤄지지 않습니다.</p>
      </aside></div>
    </section>`;
  }
  function commit(mutator, event, description) {
    const id=state.patientId, beforeSeen=ui.seen, person=CANONICAL.cases.find(c=>c.id===id);
    if(!person || !writable()){toast('저장할 수 없습니다. 현재 기록을 확인하세요.');return false;}
    try {
      const box=storage.loadRepository(localStorage,key);
      if(box.error)throw Error('기존 합성 저장자료가 손상되어 저장을 중지했습니다.');
      if(box.serialized!==beforeSeen)throw Error('다른 탭에서 기록이 수정되었습니다. 새로고침 후 다시 확인하세요.');
      storage.initializePatients(box.records);
      const prev=box.records[id];
      if(!prev || !editable(prev))throw Error('발행되거나 철회된 계획은 개정 전 편집할 수 없습니다.');
      const copy=workflow.deepCopy(prev);
      const changed=mutator(copy);
      if(changed===false)return false;
      if(['APPROVED','REVIEW_REQUESTED','CHANGES_REQUESTED'].includes(copy.draft.status)){
        copy.draft.status='DRAFT';
        copy.draft.approval=null;
        workflow.audit(copy,ui.role,'APPROVAL_INVALIDATED','계획·근거·문서 변경으로 재검토 필요');
      }
      workflow.audit(copy,ui.role,event,description);
      box.records[id]=copy;
      storage.persistRepository(localStorage,key,box);
      ui.stale=false;
      refreshSource();
      render({keepScroll:true});
      toast('합성 기록 저장 완료 · 승인/발행 상태를 확인하세요.');
      return true;
    } catch(error) {
      ui.stale=true;
      toast('저장 실패 · 원본 보존: '+(error.message||'오류'));
      render({keepScroll:true});
      return false;
    }
  }
  function targetItem() { return getRecord()?.draft.items.find(i=>i.id===state.planTab)||getRecord()?.draft.items[0]; }
  function saveText() {
    const item=targetItem(), text=document.getElementById('ux6-plan-text')?.value;
    if(!item || typeof text!=='string')return;
    if(text===item.text){toast('변경된 내용이 없습니다.');return;}
    commit(r=>{const x=r.draft.items.find(i=>i.id===item.id);x.text=text;x.verified=false;},'PLAN_EDIT',item.title+' · 안내문');
  }
  function linkSource(id,remove=false) {
    const item=targetItem();if(!item || !id)return;
    commit(r=>{
      const x=r.draft.items.find(i=>i.id===item.id), existing=linked(x);
      if(remove&&!existing.includes(id))return false;
      if(!remove && (existing.includes(id)||existing.length>=12))throw Error('이미 연결된 기록이거나 근거 최대 12건을 초과했습니다.');
      if(!remove && !library.usableSource(library.findSource(id,state.patientId,r.unlockedSources||[]),'item',x.section,state.patientId))throw Error('환자·입원건·검토 항목에 맞는 확인 자료가 아닙니다.');
      const next=remove?existing.filter(s=>s!==id):[...existing,id];
      if(next.length)x.sources=next;else delete x.sources;
      x.source=next[0]||''; x.verified=false;
    },remove?'EVIDENCE_UNLINKED':'EVIDENCE_LINKED',item.title+' · '+id);
  }
  function saveAppointment() {
    const item=targetItem();if(!item||item.section!=='followup')return;
    const fields={};
    for(const x of document.querySelectorAll('[data-v6-appointment]')) fields[x.dataset.v6Appointment]=x.value;
    commit(r=>{
      const x=r.draft.items.find(i=>i.id===item.id);
      const next={status:fields.status,date:fields.date,time:fields.time,place:fields.place,
        ...(x.appointment?.destination?{destination:x.appointment.destination}:{})};
      if(!workflow.validAppointment(next))throw Error('가상 확정 일정에는 유효한 날짜·시간·장소가 필요합니다.');
      x.appointment=next;x.verified=false;
    },'SYNTHETIC_APPOINTMENT_EDIT','가상 외래 일정 수정 · 재검토 필요');
  }
  function verify() {
    const item=targetItem(), checked=document.querySelector('[data-v6-verified]')?.checked;
    if(!item)return;
    commit(r=>{
      const x=r.draft.items.find(i=>i.id===item.id);
      if(checked && !itemPermitted(x.section))throw Error('해당 항목을 확인할 담당 역할이 아닙니다.');
      if(checked && (!x.text.trim()||!workflow.validItemSources(r,x)))throw Error('안내문과 해당 항목에 맞는 확인 자료가 필요합니다.');
      x.verified=!!checked;
    },'PLAN_EDIT',item.title+' · 직종 검토 변경');
  }
  function setVisibility(value) {
    const item=targetItem();
    if(!item||!['PATIENT','INTERNAL'].includes(value))return;
    commit(r=>{
      const x=r.draft.items.find(i=>i.id===item.id);
      if(x.visibility===value)return false;
      x.visibility=value;x.verified=false;
    },'PLAN_EDIT',item.title+' · 공개 범위 변경');
  }
  function resolveIssue(box) {
    const id=box?.dataset.v6Issue;
    const sourceId=box?.querySelector('[data-v6-issue-source]')?.value;
    const resolution=box?.querySelector('[data-v6-resolution]')?.value.trim()||'';
    if(!id)return;
    commit(r=>{
      const x=r.draft.issues.find(i=>i.id===id);
      if(!x||x.status==='RESOLVED')throw Error('이미 해결되었거나 존재하지 않는 검토 항목입니다.');
      if(!issuePermitted(x.domain))throw Error('이 영역의 근거를 확인할 담당 역할이 아닙니다.');
      if(!library.usableSource(library.findSource(sourceId,state.patientId,r.unlockedSources||[]),'issue',x,state.patientId)||resolution.length<10)
        throw Error('해당 문제에 맞는 원천자료와 10자 이상의 확인 기록이 필요합니다.');
      x.source=sourceId;x.resolution=resolution;x.reviewer=roles[ui.role];x.status='RESOLVED';
    },'ISSUE_RESOLVED',id+' · 근거 확인');
  }
  function changeDoc(target, field) {
    const root=target.closest('[data-v6-doc]'), id=root?.dataset.v6Doc;
    const value=target.value;
    if(!id)return;
    commit(r=>{
      const d=r.draft.docs.find(x=>x.id===id);
      if(!d)throw Error('문서가 없습니다.');
      if(field==='visibility'){if(!['INTERNAL','PATIENT'].includes(value))throw Error('공개 범위 오류');d.visibility=value;}
      if(field==='category'){if(!['GENERAL','MEDICATION'].includes(value))throw Error('분류 오류');d.category=value;}
      d.status='REGISTERED';
    },'PDF_EDIT',id+' · 공개 범위/분류');
  }
  function docAction(target,action) {
    const id=target.closest('[data-v6-doc]')?.dataset.v6Doc;
    if(!id)return;
    if(action==='open-pdf'){
      const file=ui.files.get(id);
      if(!file){toast('PDF 원본을 다시 첨부하세요.');return;}
      const u=URL.createObjectURL(file);
      const opened=window.open(u,'_blank','noopener,noreferrer');
      if(!opened)toast('팝업이 차단되었을 수 있습니다.');
      setTimeout(()=>URL.revokeObjectURL(u),60000);
      return;
    }
    if(action==='review-pdf' && !['PHYSICIAN','APPROVER'].includes(ui.role)){toast('문서 검토는 담당 의사·최종 승인자 역할에서 가능합니다.');return;}
    if(action==='review-pdf' && !ui.files.has(id)){toast('PDF 원본을 다시 첨부해야 합니다.');return;}
    const done=commit(r=>{
      const d=r.draft.docs.find(x=>x.id===id);if(!d)throw Error('문서가 없습니다.');
      if(action==='review-pdf')d.status='REVIEWED';
      if(action==='remove-pdf')r.draft.docs=r.draft.docs.filter(x=>x.id!==id);
    },action==='review-pdf'?'PDF_REVIEWED':'PDF_REMOVED',id);
    if(done && action==='remove-pdf')ui.files.delete(id);
  }
  async function attachPdf(file) {
    if(!file)return;
    const id=state.patientId, stamp=ui.seen;
    if(!writable()||!editable(getRecord())){toast('현재 계획에는 첨부할 수 없습니다.');return;}
    try {
      if(!file.name.toLowerCase().endsWith('.pdf')||file.size>4*1024*1024||file.size<5)throw Error('4MB 이하 PDF만 첨부 가능합니다.');
      if(!crypto.subtle)throw Error('SHA-256을 사용할 수 없는 환경입니다.');
      const buffer=await file.arrayBuffer();
      if(new TextDecoder().decode(buffer.slice(0,5))!=='%PDF-')throw Error('PDF 원본의 형식이 올바르지 않습니다.');
      const digest=await crypto.subtle.digest('SHA-256',buffer);
      const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(id!==state.patientId||stamp!==ui.seen||!editable(getRecord()))throw Error('검사 중 선택 환자나 기록이 변경됐습니다.');
      const existing=getRecord().draft.docs.find(d=>d.name===file.name&&d.size===file.size&&d.fileHash===hash);
      if(existing){ui.files.set(existing.id,file);render({keepScroll:true});toast('동일한 PDF 원본을 다시 연결했습니다.');return;}
      const documentId='DOC-'+Date.now()+'-'+Math.round(Math.random()*99999);
      if(commit(r=>{r.draft.docs.push({id:documentId,name:file.name,size:file.size,fileHash:hash,visibility:'INTERNAL',status:'REGISTERED',at:workflow.now()});},'PDF_ATTACHED',file.name)){
        ui.files.set(documentId,file);
        render({keepScroll:true});
      }
    }catch(error){toast('문서 첨부 보류: '+error.message);}
  }
  views.plan=planV6;
  views.review=reviewV6;
  const priorRender=render;
  render=function(opts){
    priorRender(opts);
    const snapshot=storage.loadRepository(localStorage,key);
    ui.seen=snapshot.serialized;
    if(snapshot.error)ui.stale=true;
    const pill=document.querySelector('.prototype-pill');
    if(pill)pill.textContent='UX 2.0 v0.6 · 합성 데이터';
  };
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-v6-tab]');
    if(tab){e.preventDefault();e.stopImmediatePropagation();ui.tab=tab.dataset.v6Tab;render({keepScroll:true});return;}
    const action=e.target.closest('[data-v6-action]');
    if(!action)return;
    e.preventDefault();e.stopImmediatePropagation();
    const name=action.dataset.v6Action;
    if(name==='save-text')saveText();
    else if(name==='save-appointment')saveAppointment();
    else if(name==='link')linkSource(document.getElementById('ux6-add-source')?.value);
    else if(name==='unlink')linkSource(action.dataset.v6Id,true);
    else if(name==='resolve')resolveIssue(action.closest('[data-v6-issue]'));
    else if(['open-pdf','review-pdf','remove-pdf'].includes(name))docAction(action,name);
  },true);
  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.matches('[data-v6-role]')){e.stopImmediatePropagation();ui.role=t.value;render({keepScroll:true});return;}
    if(t.matches('[data-v6-verified]')){e.stopImmediatePropagation();verify();return;}
    if(t.matches('[data-v6-visibility]')){e.stopImmediatePropagation();setVisibility(t.value);return;}
    if(t.matches('[data-v6-doc-visibility]')){e.stopImmediatePropagation();changeDoc(t,'visibility');return;}
    if(t.matches('[data-v6-doc-category]')){e.stopImmediatePropagation();changeDoc(t,'category');return;}
    if(t.matches('[data-v6-pdf]')){e.stopImmediatePropagation();attachPdf(t.files?.[0]);}
  },true);
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-v6-text]')){
      const preview=document.getElementById('ux6-preview-text');
      if(preview)preview.textContent=e.target.value;
    }
  },true);
  window.addEventListener('storage',event=>{
    if(event.key===key){ui.stale=true;toast('다른 탭에서 합성 기록이 변경되었습니다. 새로고침 후 편집하세요.');}
  });
  render({keepScroll:true});
})();
