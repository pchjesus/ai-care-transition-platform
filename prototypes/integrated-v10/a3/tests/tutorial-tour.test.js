import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDED_TOUR_STEPS,placeSpotlight} from '../tutorial-tour.js';
test('real-screen read-only tour follows the ten contracted A1/A2/A3 stages',()=>{
 assert.equal(GUIDED_TOUR_STEPS.length,10);
 assert.deepEqual(GUIDED_TOUR_STEPS.map(s=>s.screen),['patients','patients','assessment','assessment','plan','plan','plan','plan','plan','plan']);
 assert.deepEqual(GUIDED_TOUR_STEPS.map(s=>s.target),['patients','patient-context','assessment-domains','assessment-work','plan-item','plan-sources','roles','workflow','preview','preview']);
 assert(GUIDED_TOUR_STEPS.every(s=>s.title&&s.body&&s.tag));
 assert.match(GUIDED_TOUR_STEPS[3].body,/임상 위험도/);assert.match(GUIDED_TOUR_STEPS[9].body,/독립 B v1.3/);
});
test('spotlight layout stays in viewport without covering highlighted content at mobile, desktop and zoom sizes',()=>{
 for(const width of [320,390,768,1024,1440])for(const height of [350,650,950])for(const top of [-500,20,180,500]){
  const rect={left:20,right:width-20,top,bottom:top+700,width:width-40,height:700};
  const tip={width:Math.min(370,width-20),height:Math.min(320,height-20)};
  const layout=placeSpotlight(rect,{width,height},tip);
  assert(layout.tip.left>=0&&layout.tip.top>=0);
  assert(layout.tip.left+tip.width<=width+.1&&layout.tip.top+tip.height<=height+.1);
  if(layout.hole){const h=layout.hole;assert(h.left>=0&&h.top>=0&&h.left+h.width<=width&&h.top+h.height<=height);
   const overlapX=Math.max(0,Math.min(h.left+h.width,layout.tip.left+tip.width)-Math.max(h.left,layout.tip.left));
   const overlapY=Math.max(0,Math.min(h.top+h.height,layout.tip.top+tip.height)-Math.max(h.top,layout.tip.top));assert.equal(overlapX*overlapY,0);
  }
 }
});
test('missing, hidden and offscreen anchors fall back to a readable centered explanation',()=>{
 for(const rect of [null,{left:0,top:0,right:0,bottom:0,width:0,height:0},{left:20,right:100,top:1200,bottom:1500,width:80,height:300}]){
  const p=placeSpotlight(rect,{width:390,height:650},{width:370,height:300});assert.equal(p.hole,null);assert.equal(p.side,'none');assert(p.tip.top>=0);
 }
});
