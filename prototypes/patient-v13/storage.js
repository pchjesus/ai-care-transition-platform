import {initialProfile} from './data.js';
export const PROFILE_KEY='discharge_navigator_v13_mock_profile';
export const PLAN_KEY='discharge_navigator_v13_mock_plan';
export const FONT_KEY='discharge_navigator_v13_font_preference';
export const LEGACY_PROFILE_KEY='discharge_navigator_v12_mock_profile';
export const LEGACY_FONT_KEY='discharge_navigator_v12_font_preference';
const defaultProfile=()=>({profile:{...initialProfile},revision:0,lastRequest:null});
const defaultPlan=()=>({published:true,version:1,planChanged:false});
export function validProfile(x){
 if(x?.schemaVersion!==1||typeof x.profile?.address!=='string'||typeof x.profile?.contact!=='string'||!x.profile.address.trim()||!x.profile.contact.trim()||x.profile.address.length>120||x.profile.contact.length>50||!Number.isSafeInteger(x.revision)||x.revision<0)return false;
 const r=x.lastRequest;
 return r===null||(r&&r.status==='LOCAL_ONLY'&&r.revision===x.revision&&r.revision>0&&typeof r.requestId==='string'&&/^DEMO-\d+$/.test(r.requestId)&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt)));
}
export function validPlan(x){return x?.schemaVersion===1&&typeof x.published==='boolean'&&Number.isSafeInteger(x.version)&&x.version>=1&&typeof x.planChanged==='boolean'&&x.planChanged===(x.version>1);}
export function createDemoRepository(provided){
 let storage;try{storage=provided===undefined?globalThis.localStorage:provided;}catch{}
 let profileRaw=null,planRaw=null,profileError=false,planError=false;
 return {
  load(){
   try{
    profileRaw=storage.getItem(PROFILE_KEY);
    const legacy=profileRaw===null?storage.getItem(LEGACY_PROFILE_KEY):null;
    const raw=profileRaw??legacy;
    if(raw===null)return defaultProfile();
    const x=JSON.parse(raw);if(!validProfile(x))throw Error('Invalid saved profile');
    const data={profile:{address:x.profile.address,contact:x.profile.contact},revision:x.revision,lastRequest:x.lastRequest};
    if(profileRaw===null){profileRaw=JSON.stringify({schemaVersion:1,...data});storage.setItem(PROFILE_KEY,profileRaw);}
    return data;
   }catch{profileError=true;return defaultProfile();}
  },
  persist(data){
   try{
    const x={schemaVersion:1,profile:{...data.profile},revision:data.revision,lastRequest:data.lastRequest??null};
    if(profileError||!validProfile(x)||storage.getItem(PROFILE_KEY)!==profileRaw)return false;
    const raw=JSON.stringify(x);storage.setItem(PROFILE_KEY,raw);profileRaw=raw;return true;
   }catch{return false;}
  },
  loadPlan(){
   try{planRaw=storage.getItem(PLAN_KEY);if(planRaw===null)return defaultPlan();const x=JSON.parse(planRaw);if(!validPlan(x))throw Error('Invalid plan');return {published:x.published,version:x.version,planChanged:x.planChanged};}
   catch{planError=true;return {published:false,version:1,planChanged:false};}
  },
  persistPlan(data){
   try{const x={schemaVersion:1,published:data.published,version:data.version,planChanged:data.planChanged};if(planError||!validPlan(x)||storage.getItem(PLAN_KEY)!==planRaw)return false;const raw=JSON.stringify(x);storage.setItem(PLAN_KEY,raw);planRaw=raw;return true;}catch{return false;}
  },
  clear(){
   const previousProfile=profileRaw;
   try{
    if(profileError||planError||storage.getItem(PROFILE_KEY)!==profileRaw||storage.getItem(PLAN_KEY)!==planRaw)return false;
    const profile=JSON.stringify({schemaVersion:1,...defaultProfile()}),plan=JSON.stringify({schemaVersion:1,...defaultPlan()});
    storage.setItem(PROFILE_KEY,profile);
    try{storage.setItem(PLAN_KEY,plan);}catch(error){
     try{if(previousProfile===null)storage.removeItem(PROFILE_KEY);else storage.setItem(PROFILE_KEY,previousProfile);}catch{profileError=true;}
     throw error;
    }
    profileRaw=profile;planRaw=plan;return true;
   }catch{return false;}
  },
  loadLarge(){try{return (storage.getItem(FONT_KEY)??storage.getItem(LEGACY_FONT_KEY))==='true';}catch{return false;}},
  saveLarge(value){try{storage.setItem(FONT_KEY,String(!!value));return true;}catch{return false;}},
  get failed(){return profileError||planError;}
 };
}
