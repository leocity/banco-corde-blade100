// La fixture tests/fixtures/hybrid_cases.json è generata da questo stesso codice (make_hybrid_cases.mjs) e letta anche da
// pipeline/hybrids.py: se phys.js o next.js cambiano e la fixture no, questo test fallisce e dice di rigenerarla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bedOf, compareBeds } from './phys.js';
import { judgePhys, GOALS } from './next.js';

const fx = JSON.parse(readFileSync(new URL('../tests/fixtures/hybrid_cases.json', import.meta.url)));
const by = Object.fromEntries(fx.strings.map((r) => [r.id, r]));
const num = (x) => (x === null || x === undefined ? null : Number(x.toPrecision(12)));
const refBed = bedOf(by[fx.reference.id], by[fx.reference.id], fx.reference.kg);

test('fixture degli ibridi aggiornata: letto, confronto e giudizio per ogni caso', () => {
  assert.ok(fx.cases.length >= 72);
  for (const c of fx.cases) {
    const bed = bedOf(by[c.main], by[c.cross], c.kg);
    const rows = compareBeds(bed, refBed);
    const where = `${c.main} + ${c.cross} a ${c.kg}: rigenera con node tests/fixtures/make_hybrid_cases.mjs`;
    for (const k of ['kNow', 'kAfter', 'loss', 'spin']) assert.equal(bed[k] && num(bed[k].v), c.bed[k] && c.bed[k].v, `${k} ${where}`);
    assert.deepEqual(rows.map((r) => [r.key, r.level, r.dir, num(r.diff)]), c.rows.map((r) => [r.key, r.level, r.dir, r.diff]), where);
    for (const g of GOALS) assert.deepEqual({ ok: judgePhys(g.key, rows).ok, score: num(judgePhys(g.key, rows).score) }, c.judge[g.key], `${g.key} ${where}`);
  }
});
