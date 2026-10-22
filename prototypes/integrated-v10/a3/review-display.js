import {TIER_LABELS} from '../a2/engine.js';

// Presentation only: 0 fills no steps; 1–3 fill exactly that many of three steps.
export function gradeMeter(grade){
 const ready=Number.isInteger(grade)&&grade>=0&&grade<=3;
 return `<span class="grade-meter" role="img" aria-label="${ready?grade+'등급 · '+TIER_LABELS[grade]:'판단 보류 · 등급 미확정'} · 업무 검토 우선도, 임상 위험도 아님">${[1,2,3].map(n=>`<span class="grade-cell ${ready&&n<=grade?'filled':''} ${ready&&n===grade?'current':''}" aria-hidden="true"></span>`).join('')}</span>`;
}

export function priorityDomains(record){
 return record.assessment.domainResults.filter(d=>d.status==='READY'&&d.grade===3);
}
