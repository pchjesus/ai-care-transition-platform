import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDED_TOUR_STEPS} from '../tutorial-tour.js';
test('guided synthetic tour keeps A1, A2, A3 approval and B in order',()=>{
 assert.equal(GUIDED_TOUR_STEPS.length,6);
 assert.deepEqual(GUIDED_TOUR_STEPS.map(s=>s.target),['patients','assessment','plan','approve','today','schedule']);
 assert.deepEqual(GUIDED_TOUR_STEPS.map(s=>s.scene),['hospital','hospital','hospital','hospital','patient','patient']);
 assert.ok(GUIDED_TOUR_STEPS.every(s=>s.title&&s.body&&s.tag));
 assert.match(GUIDED_TOUR_STEPS[5].body,/독립 B v1\.3|기존 합성 예시/);
});
