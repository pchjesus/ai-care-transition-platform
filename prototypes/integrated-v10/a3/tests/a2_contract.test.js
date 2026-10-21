import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMAINS as original,CASES as originalCases} from '../../hospital-a2/data.js';
import {evaluateAll} from '../../hospital-a2/engine.js';
import {DOMAINS,CASES} from '../data.js';
import {evaluateA2} from '../workflow.js';
test('copied A3 schema retains all 30 approved A2 fields, options and scores',()=>{
 for(const d of original){const candidate=DOMAINS.find(x=>x.id===d.id);
  assert.deepEqual(candidate.fields.map(([id,label,required,options])=>[id,label,!!required,options]),d.fields.map(f=>[f.id,f.label,!!f.required,f.options]));
 }
 for(let i=0;i<originalCases.length;i++)assert.deepEqual(CASES[i].values,originalCases[i].values);
});
test('A3 evaluation matches untouched A2 for every option, missing and conflict input',()=>{
 const check=values=>{
  const before=evaluateAll(values),after=evaluateA2({values});
  for(let i=0;i<before.length;i++)assert.deepEqual([after[i].status,after[i].grade,after[i].provisionalGrade,after[i].requiredDone],[before[i].status,before[i].tier,before[i].provisionalTier,before[i].knownRequired]);
 };
 for(const c of originalCases)check(c.values);
 for(const domain of original)for(const field of domain.fields)for(const option of [null,'CONFLICT','unknown-option',...field.options.map(x=>x[0])]){
  const values=structuredClone(originalCases[1].values);values[domain.id][field.id]=option;check(values);
 }
});
