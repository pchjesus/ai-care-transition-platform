// A2 v0.5 is the only scoring authority. This adapter only renames presentation fields.
import {DOMAINS} from '../a2/data.js';
import {evaluateAll} from '../a2/engine.js';
export function evaluateForReview(values={}) {
 return evaluateAll(values).map((result,i)=>{
  const domain=DOMAINS[i];
  return {id:result.domain,title:domain.title,status:result.status,grade:result.tier,
   provisionalGrade:result.provisionalTier,requiredDone:result.knownRequired,
   requiredTotal:result.totalRequired,missing:result.missing,conflicting:result.confusions,
   traces:result.traces,
   facts:result.observed.map(fact=>{
    const field=domain.fields.find(field=>field.label===fact.label);
    return {...fact,id:field.id,raw:values[domain.id]?.[field.id]};
   })};
 });
}
export const REVIEW_DOMAINS=DOMAINS.map(d=>({...d,
 fields:d.fields.map(f=>[f.id,f.label,Number(f.required),f.options])}));
