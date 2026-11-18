import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleOf, layoutLabels, nearest } from './rulers.js';

test('scala: margini e posizione in percentuale', () => {
  const s = scaleOf([100, 200]);
  assert.ok(s.min < 100 && s.max > 200);
  assert.ok(s.x(100) > 0 && s.x(200) < 100);
  assert.equal(Math.round(s.x((s.min + s.max) / 2)), 50);
});

test('etichette: nessuna sovrapposizione nella stessa riga, al massimo 3 righe', () => {
  const items = [
    { id: 'a', x: 50, label: 'Slap' }, { id: 'b', x: 52, label: 'Zero' }, { id: 'c', x: 54, label: 'Confidential' },
    { id: 'd', x: 55, label: 'O-Toro' }, { id: 'e', x: 90, label: 'Tour' },
  ];
  const out = layoutLabels(items, 360, 7);
  const byLane = {};
  for (const l of out.filter((x) => x.lane !== null)) (byLane[l.lane] ||= []).push(l);
  for (const lane of Object.values(byLane)) {
    lane.sort((p, q) => p.left - q.left);
    for (let i = 1; i < lane.length; i += 1) assert.ok(lane[i].left >= lane[i - 1].right, `${lane[i - 1].id} e ${lane[i].id} si sovrappongono`);
  }
  assert.ok(out.every((x) => x.lane === null || x.lane < 3));
  // la montata (prima) ha sempre un'etichetta
  assert.notEqual(out[0].lane, null);
});

test('etichette: restano dentro il righello', () => {
  const out = layoutLabels([{ id: 'a', x: 0, label: 'Una corda lunga' }, { id: 'b', x: 100, label: 'Altra corda lunga' }], 300, 7);
  for (const l of out) { assert.ok(l.left >= 0); assert.ok(l.right <= 300); }
});

test('tocco: la corda più vicina al punto toccato', () => {
  const pts = [{ id: 'a', x: 10 }, { id: 'b', x: 40 }, { id: 'c', x: 41 }];
  assert.equal(nearest(pts, 38).id, 'b');
  assert.equal(nearest(pts, 0).id, 'a');
  assert.equal(nearest([], 10), null);
});
