// Display names only. Stored IANA identifiers and scheduling arithmetic stay unchanged.
const places={
 'Asia/Seoul':'한국 시간(서울', 'Asia/Tokyo':'일본 시간(도쿄',
 'America/New_York':'미국 동부 시간(뉴욕', 'America/Los_Angeles':'미국 서부 시간(로스앤젤레스',
 'Europe/London':'영국 시간(런던', 'Europe/Paris':'프랑스 시간(파리'
};
export function zoneLabel(zone,at=Date.now()){
 try{
  const offset=new Intl.DateTimeFormat('ko-KR',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(at).find(p=>p.type==='timeZoneName').value.replace('GMT','UTC');
  if(['UTC','Etc/UTC','Etc/GMT','GMT'].includes(zone))return '세계 표준시(UTC+0)';
  const place=places[zone]||'지역 시간('+zone.split('/').at(-1).replaceAll('_',' ');
  return `${place}, ${offset==='UTC'?'UTC+0':offset})`;
 }catch{return '시간대를 확인해 주세요';}
}
export const commonZones=current=>[...new Set([current,'Asia/Seoul','UTC','America/New_York','America/Los_Angeles','Asia/Tokyo','Europe/London','Europe/Paris'])];
