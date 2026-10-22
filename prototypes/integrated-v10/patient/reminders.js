// Patient-local preferences only. Never writes clinical records or infers a prescription.
export const reminderKey=c=>`carebridge-reminders-v1:${c.source}:${c.patientId}:${c.encounterId}`;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n;
export function validZone(zone){try{new Intl.DateTimeFormat('en',{timeZone:zone});return text(zone,80)}catch{return false}}
export function localInstant(date,time,zone){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!validZone(zone))return NaN;
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number),wanted=Date.UTC(y,m-1,d,h,min);
 if(new Date(wanted).toISOString().slice(0,10)!==date)return NaN;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let instant=wanted;
 for(let i=0;i<4;i++){const p=Object.fromEntries(fmt.formatToParts(instant).map(x=>[x.type,x.value]));const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);if(actual===wanted)return instant;instant+=wanted-actual;}
 return NaN; // Nonexistent local time (DST), invalid calendar date or zone.
}
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(localInstant(x,'12:00','UTC'));
const time=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
export function emptyPreferences(c){return {schema:1,source:c.source,patientId:c.patientId,encounterId:c.encounterId,revision:0,zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul',plans:{},seen:{}}}
export function validPreferences(p,c){
 return object(p)&&p.schema===1&&['connected','independent'].includes(p.source)&&p.source===c.source&&p.patientId===c.patientId&&p.encounterId===c.encounterId&&text(p.patientId,80)&&text(p.encounterId,100)&&Number.isSafeInteger(p.revision)&&p.revision>=0&&validZone(p.zone)&&object(p.plans)&&Object.keys(p.plans).length<=100&&Object.entries(p.plans).every(([id,s])=>text(id,120)&&object(s)&&text(s.version,30)&&text(s.assessmentId,100)&&typeof s.important==='boolean'&&Array.isArray(s.personal)&&s.personal.length<=50&&new Set(s.personal.map(m=>m.id)).size===s.personal.length&&s.personal.every(m=>object(m)&&text(m.id,100)&&text(m.label,80)&&date(m.date)&&time(m.time)&&[0,10,30].includes(m.lead)&&typeof m.enabled==='boolean')&&object(s.followups)&&Object.entries(s.followups).every(([id,a])=>text(id,80)&&object(a)&&typeof a.enabled==='boolean'&&typeof a.dayBefore==='boolean'&&typeof a.sameDay==='boolean'&&time(a.time)))&&object(p.seen)&&Object.keys(p.seen).length<=2000&&Object.entries(p.seen).every(([k,v])=>text(k,300)&&v===true);
}
export function createReminderRepository(storage,c){
 const key=reminderKey(c);let raw,error;
 return {key,load(){try{raw=storage?.getItem(key);if(raw===undefined)throw Error('저장소를 사용할 수 없어요.');const data=raw===null?emptyPreferences(c):JSON.parse(raw);if(!validPreferences(data,c))throw Error('저장 자료가 손상됐어요.');error=null;return {data,error:null}}catch(e){error=e;return {data:emptyPreferences(c),error:e}}},save(next){if(error)throw Error('기존 저장 자료를 확인할 수 없어 덮어쓰지 않았어요.');if(!validPreferences(next,c))throw Error('설정값을 확인해 주세요.');if(storage?.getItem(key)!==raw)throw Error('다른 탭에서 설정이 변경됐어요. 최신 설정을 다시 열어 주세요.');const value=JSON.stringify(next);storage.setItem(key,value);raw=value;}};
}
export function planPreferences(data,pub){
 const s=data.plans[pub?.publicationId];
 return s&&s.version===pub.planVersion&&s.assessmentId===pub.assessmentId?s:{version:pub?.planVersion,assessmentId:pub?.assessmentId,personal:[],followups:{},important:false};
}
const previousDate=d=>new Date(Date.parse(d+'T12:00:00Z')-86400000).toISOString().slice(0,10);
export function calculateReminders(c,data,now=Date.now()){
 const pub=c.publication;
 if(c.status!=='PUBLISHED'||!pub||pub.patientId!==c.patientId||pub.encounterId!==c.encounterId||!validPreferences(data,c))return [];
 const s=planPreferences(data,pub),out=[];
 const add=(type,itemId,title,at,extra={})=>{if(!Number.isFinite(at))return;out.push({id:`${type}:${pub.publicationId}:${itemId}:${at}`,type,itemId,title,at,publicationId:pub.publicationId,version:pub.planVersion,...extra})};
 for(const m of s.personal){if(!m.enabled)continue;const target=localInstant(m.date,m.time,data.zone);if(target<=now||!Number.isFinite(target))continue;add('PERSONAL',m.id,m.label,target-m.lead*60000,{target,lead:m.lead,personal:true});}
 for(const item of pub.items){
  const a=item.appointment,f=s.followups[item.id];if(item.section!=='followup'||!a||!f?.enabled||!date(a.date))continue;
  const target=localInstant(a.date,a.time||'23:59',data.zone);if(!Number.isFinite(target)||target<=now)continue;
  if(f.dayBefore)add('APPOINTMENT_PREVIOUS',item.id,item.title,localInstant(previousDate(a.date),f.time,data.zone),{target,dateOnly:!a.time});
  if(f.sameDay){const at=localInstant(a.date,f.time,data.zone);if(at<=target)add('APPOINTMENT_TODAY',item.id,item.title,at,{target,dateOnly:!a.time});}
 }
 // Due reminders are shown only on their due local day, and only while target is future.
 const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:data.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(t);
 return [...new Map(out.filter(x=>x.at>now||day(x.at)===day(now)).map(x=>[x.id,x])).values()].sort((a,b)=>a.at-b.at);
}
export function inboxEvents(c,data,now=Date.now()){
 // Lifecycle entries are metadata only; no revoked clinical content is projected.
 const events=(c.events||[]).map(e=>({...e,seen:!!data.seen[e.id]}));
 const pub=c.publication;
 if(c.status==='PUBLISHED'&&pub){
  for(const r of calculateReminders(c,data,now).filter(x=>x.at<=now))events.push({...r,title:r.personal?'개인 알림 시연 · '+r.title:'외래 준비 알림 · '+r.title,seen:!!data.seen[r.id]});
  if(planPreferences(data,pub).important){for(const item of pub.items.filter(i=>i.section==='warning'&&!c.understanding?.[i.id])){const id=`IMPORTANT:${pub.publicationId}:${item.id}`;events.push({id,title:'아직 확인하지 않은 중요 안내가 있어요',publicationId:pub.publicationId,version:pub.planVersion,seen:!!data.seen[id]});}}
 }
 return [...new Map(events.map(e=>[e.id,e])).values()];
}
