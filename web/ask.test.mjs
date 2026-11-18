import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAskPrompt } from './ask.js';

const BY_ID = {
  slap: { id: 'slap', brand: 'Re-String', model: 'Slap', gauge_mm: 1.23, shape: 'HEX', lab: { twu: null, rp: { kgmm: 0.75 }, excel: { stretch50: 3.3 } }, stiffness: { value_lbin: 194, kind: 'da Racketpedia' } },
  conf: { id: 'conf', brand: 'Solinco', model: 'Confidential', gauge_mm: 1.25, shape: 'SQ', lab: { twu: null, rp: null, excel: null } },
};
const state = { equipped: { id: 'slap', kg: [22, 21], since: '2026-10-31T13:29:43.457Z' }, liked: ['conf'], disliked: [], stock: [{ id: 'conf', size: 'mezza', n: 1 }],
  sessions: [{ ts: '1', date: '2026-11-17', hours: 1.5, life: '2026-10-31T13:29:43.457Z', feel: 3, tag: 'pastosa' }], lives: [] };

test('il prompt contiene la domanda, la montata, le misure e la scorta; niente stime', () => {
  const p = buildAskPrompt({ question: 'cosa provo dopo?', state, BY_ID, focus: null });
  assert.match(p, /cosa provo dopo\?/);
  assert.match(p, /Re-String Slap 1,23/);
  assert.match(p, /"rp.kgmm":0.75/);
  assert.match(p, /"twu.stiffness":null/);
  assert.match(p, /mezza/);
  assert.match(p, /pastosa/);
  assert.doesNotMatch(p, /194/); // la rigidità stimata non va all'AI come se fosse una misura
  assert.match(p, /controllo e potenza non sono misure/);
});

test('con una corda in esame la include', () => {
  assert.match(buildAskPrompt({ question: 'x', state, BY_ID, focus: 'conf' }), /"corda_in_esame":\{"nome":"Solinco Confidential 1,25"/);
});
