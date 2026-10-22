import {TIER_LABELS} from '../a2/engine.js';

// Presentation only: zero is the baseline, not an additional filled segment.
export function gradeMeter(grade){
 const ready=Number.isInteger(grade)&&grade>=0&&grade<=3;
 return `<span class="grade-meter" role="img" aria-label="${ready?grade+'등급 · '+TIER_LABELS[grade]:'판단 보류 · 등급 미확정'} · 업무 검토 우선도, 임상 위험도 아님">${[0,1,2,3].map(n=>`<span class="grade-cell ${n===0?'baseline':''} ${ready&&n>0&&n<=grade?'filled':''} ${ready&&n===grade?'current':''}" aria-hidden="true"></span>`).join('')}</span>`;
}

export function priorityDomains(record){
 return record.assessment.domainResults.filter(d=>d.status==='READY'&&d.grade===3);
}
