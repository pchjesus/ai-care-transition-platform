import {TIER_LABELS} from '../a2/engine.js';
import {DOMAINS as ENGINE_DOMAINS} from '../a2/data.js';

// Presentation only: 0 fills no steps; 1–3 fill exactly that many of three steps.
export function gradeMeter(grade){
 const ready=Number.isInteger(grade)&&grade>=0&&grade<=3;
 return `<span class="grade-meter" role="img" aria-label="${ready?grade+'등급 · '+TIER_LABELS[grade]:'판단 보류 · 등급 미확정'} · 업무 검토 우선도, 임상 위험도 아님">${[1,2,3].map(n=>`<span class="grade-cell ${ready&&n<=grade?'filled':''} ${ready&&n===grade?'current':''}" aria-hidden="true"></span>`).join('')}</span>`;
}

export function priorityDomains(record){
 return record.assessment.domainResults.filter(d=>d.status==='READY'&&d.grade===3);
}

const auditEventNames={
 EVALUATION_EDITED:'평가 수정',ASSESSMENT_IMPORTED:'평가 A3 반영',
 PLAN_EDIT:'계획 수정',APPROVAL_INVALIDATED:'기존 승인 무효화',
 ISSUE_RESOLVED:'미해결 항목 검토',REVIEW_REQUESTED:'의료진 검토 요청',
 CHANGES_REQUESTED:'보완 요청',APPROVED:'최종 승인',PUBLISHED:'발행 완료',
 REVISION_START:'새 버전 개정',REVOCATION_REQUESTED:'발행 철회 요청',
 REVOCATION_REJECTED:'발행 철회 요청 반려',REVOKED:'발행 철회',
 PDF_ATTACHED:'PDF 첨부',PDF_REMOVED:'PDF 제외',PDF_REVIEWED:'PDF 검토 완료',
 PDF_RESTORED:'PDF 원본 복원',PDF_SCOPE_CHANGED:'PDF 공개 범위 변경',
 DESTINATION_EDIT:'연계 목적지 수정',SYNTHETIC_APPOINTMENT_EDIT:'가상 일정 수정',
 SYNTHETIC_REPLY_RECEIVED:'가상 회신 수신',EVIDENCE_LINKED:'근거자료 연결',
 EVIDENCE_UNLINKED:'근거자료 연결 해제'
};
// Display-only translation. The stored event code and details remain unchanged.
export function formatAuditEvent(ev){
 const event=String(ev?.event??''),rawDetails=String(ev?.details??'');
 let title=auditEventNames[event]||event,description=rawDetails;
 if(event==='EVALUATION_EDITED'){
  const match=/^([^. ·]+)\.([^ ·]+) · (.*)$/.exec(rawDetails);
  if(match){
   const field=ENGINE_DOMAINS.find(d=>d.id===match[1])?.fields.find(f=>f.id===match[2]);
   if(field){title+=' · '+field.label;description=match[3];}
  }
 }else if(event==='ASSESSMENT_IMPORTED')description='A2 평가를 계획에 반영했습니다. 관련 항목을 다시 검토하세요.';
 else if(event==='APPROVED')description='최종 승인자가 계획을 승인했습니다.';
 return {title,description};
}
