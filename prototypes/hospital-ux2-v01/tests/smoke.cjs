// Pure rendering smoke checks; does not claim browser validation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const el=()=>({innerHTML:'',textContent:'',hidden:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){},replaceChildren(){},addEventListener(){}});
const nodes=new Map();
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el());return nodes.get(id)},querySelectorAll(){return []},addEventListener(){}};
const window={scrollTo(){},addEventListener(){}};
const ctx={document,window,location:{hash:''},clearTimeout,setTimeout,console};vm.createContext(ctx);vm.runInContext(src,ctx);
const ev=q=>vm.runInContext(q,ctx);
assert.equal(ev('domains.length'),6);
assert.equal(ev('domains.reduce((sum,d)=>sum+d.fields.length,0)'),30);
assert(nodes.get('main-content').innerHTML.includes('퇴원관리 업무'));
ev("state.patientId='SYN-002'");
for(const view of ['home','patients','inbox','overview','assessment','plan','review','guide']){const html=ev(view+'()');assert(html.length>500,view);assert(!html.includes('undefined'),view);}
ev("state.search='윤미경'");
assert(ev('patients()').includes('윤미경'));
assert(!ev('patients()').includes('최도현'));
ev("state.values['SYN-002.followup']='확정됨'");
assert.equal(ev('savedInputCount()'),1);
ev("state.notes['SYN-002.today']='임시 안내';state.planTab='today'");
assert(ev('plan()').includes('임시 안내'));
assert.equal(ev("routeFor('assessment')"),'#/patient/SYN-002/assessment');
assert(!src.includes('localStorage'));
console.log('PASS: UI render and transient interaction structure');
