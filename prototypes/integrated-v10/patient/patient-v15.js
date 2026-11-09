
/* Patient B v1.5: optional, comprehensible navigation; no clinical data writes. */
const key='carebridge-patient-visual-rail-v15';
let collapsed=false,menuOpen=false,previousTab=null;
try{collapsed=localStorage.getItem(key)==='1'}catch{}
function isSmall(){const frame=document.getElementById('app-frame');return (frame?.clientWidth||innerWidth)<=760;}
const shortLabels={today:'오늘',schedule:'일정',help:'도움',reminders:'알림',profile:'정보'};
const menuIcon='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
function decoratePatient(){
 const layout=document.querySelector('.app-layout'),side=layout?.querySelector('.side');
 if(!layout||!side)return;
 const selected=side.querySelector('.side-nav[aria-current="page"]')?.dataset.view||'today';
 if(previousTab!==null&&selected!==previousTab&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.getElementById('main-content')?.classList.add('patient-content-enter');
 }
 if(previousTab!==null&&selected!==previousTab)menuOpen=false;
 previousTab=selected;
 const brand=side.querySelector('.side-brand');
 if(brand&&!brand.querySelector('.patient-sidebar-toggle')){
  const toggle=document.createElement('button');toggle.type='button';toggle.className='patient-sidebar-toggle';toggle.dataset.pat15='collapse';toggle.setAttribute('aria-label','옆 메뉴 접기');
  toggle.setAttribute('title','옆 메뉴 접기 또는 펼치기');
  brand.append(toggle);
 }
 for(const nav of side.querySelectorAll('.side-nav[data-view]')){
  if(nav.querySelector('.patient-nav-full'))continue;
  const label=[...nav.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
  for(const node of [...nav.childNodes])if(node.nodeType===3)node.remove();
  const full=document.createElement('span');full.className='patient-nav-full';full.textContent=label;
  const mini=document.createElement('span');mini.className='patient-nav-short';mini.textContent=shortLabels[nav.dataset.view]||label;
  nav.append(full,mini);
  nav.title=label;nav.setAttribute('aria-label',label);
 }
 const header=layout.querySelector('.topline');
 if(header&&!header.querySelector('.patient-menu-launch')){
  const b=document.createElement('button');b.type='button';b.className='patient-menu-launch';b.dataset.pat15='menu';b.innerHTML=menuIcon+'<span>전체 메뉴</span>';
  header.insertBefore(b,header.firstChild);
 }
 if(!layout.querySelector('.patient-side-scrim')){
  const scrim=document.createElement('div');scrim.className='patient-side-scrim';scrim.hidden=true;scrim.dataset.pat15='close';layout.insertBefore(scrim,layout.firstChild);
 }
 updateControls(layout);
}
function updateControls(layout=document.querySelector('.app-layout')){
 if(!layout)return;
 const small=isSmall();if(!small)menuOpen=false;
 layout.classList.toggle('patient-nav-collapsed',collapsed);
 layout.classList.toggle('patient-menu-open',small&&menuOpen);
 const side=layout.querySelector('.side'),scrim=layout.querySelector('.patient-side-scrim');
 if(scrim)scrim.hidden=!(small&&menuOpen);
 if(side)side.inert=small&&!menuOpen;
 const collapse=layout.querySelector('.patient-sidebar-toggle');
 if(collapse){
  collapse.textContent=collapsed?'›':'‹';
  collapse.setAttribute('aria-expanded',String(!collapsed));
  collapse.setAttribute('aria-label',collapsed?'옆 메뉴 펼치기':'옆 메뉴 접기');
  collapse.title=collapsed?'옆 메뉴 펼치기':'옆 메뉴 접기';
 }
 const launch=layout.querySelector('.patient-menu-launch');
 if(launch){launch.setAttribute('aria-expanded',String(small&&menuOpen));launch.setAttribute('aria-controls','patient-side-menu')}
 if(side)side.id='patient-side-menu';
}
window.addEventListener('patient-render',decoratePatient);
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-pat15]');
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 switch(button.dataset.pat15){
  case 'collapse':
   collapsed=!collapsed;
   try{localStorage.setItem(key,collapsed?'1':'0')}catch{}
   updateControls();button.focus();break;
  case 'menu':
   menuOpen=!menuOpen;updateControls();button.focus();break;
  case 'close':
   menuOpen=false;updateControls();document.querySelector('.patient-menu-launch')?.focus();break;
 }
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&menuOpen){
  menuOpen=false;updateControls();document.querySelector('.patient-menu-launch')?.focus();
 }
});
window.addEventListener('resize',()=>updateControls());
const observer=new ResizeObserver(()=>updateControls());
const appFrame=document.getElementById('app-frame');if(appFrame)observer.observe(appFrame);
decoratePatient();
