// Genera tests/fixtures/hybrid_cases.json dal JS della pagina (web/phys.js e web/next.js): è la fonte di verità della matematica
// del letto. Python (pipeline/hybrids.py) e node (web/hybrid_parity.test.mjs) leggono la stessa fixture.
// Uso: node tests/fixtures/make_hybrid_cases.mjs   (dopo aver cambiato phys.js o next.js)
import { readFileSync, writeFileSync } from 'node:fs';
import { bedOf, compareBeds } from '../../web/phys.js';
import { judgePhys, GOALS } from '../../web/next.js';

const data = JSON.parse(readFileSync(new URL('../../data/strings.json', import.meta.url)));
const IDS = ['toroline-o-toro-17', 'toroline-o-toro-tour-17', 'solinco-confidential-16l', 're-string-slap-17', 're-string-zero-17', 'solinco-hyper-g-round-17'];
const pick = (r) => ({ id: r.id, brand: r.brand, model: r.model, shape: r.shape, lab: { twu: r.lab.twu, rp: r.lab.rp, est: r.lab.est } });
const strings = IDS.map((i) => data.strings.find((r) => r.id === i));
if (strings.some((r) => !r || (r.derived.twu_flag))) throw new Error('stringhe mancanti o contestate: la parità vale solo senza twu_flag');
const by = Object.fromEntries(strings.map((r) => [r.id, pick(r)]));
const ref = { id: 're-string-slap-17', kg: [22, 21] };
const refBed = bedOf(by[ref.id], by[ref.id], ref.kg);
const num = (x) => (x === null || x === undefined ? null : Number(x.toPrecision(12)));
const bedOut = (b) => ({ kNow: b.kNow && { v: num(b.kNow.v), est: b.kNow.est }, kAfter: b.kAfter && { v: num(b.kAfter.v), est: b.kAfter.est },
  loss: b.loss && { v: num(b.loss.v), est: b.loss.est }, spin: b.spin && { v: num(b.spin.v), est: b.spin.est }, roundCross: b.roundCross, hybrid: b.hybrid });
const cases = [];
for (const V of IDS) for (const O of IDS) for (const kg of [[22, 21], [23, 22]]) {
  const bed = bedOf(by[V], by[O], kg);
  const rows = compareBeds(bed, refBed);
  cases.push({ main: V, cross: O, kg, bed: bedOut(bed),
    rows: rows.map((r) => ({ key: r.key, level: r.level, dir: r.dir, word: r.word, diff: num(r.diff), est: r.est, estA: r.estA })),
    judge: Object.fromEntries(GOALS.map((g) => [g.key, (({ ok, score }) => ({ ok, score: num(score) }))(judgePhys(g.key, rows))])) });
}
writeFileSync(new URL('./hybrid_cases.json', import.meta.url), `${JSON.stringify({ reference: ref, strings: Object.values(by), cases })}\n`);
console.log(cases.length, 'casi');
