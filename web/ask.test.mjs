import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAskPrompt, makeTools, askDigest, stringData } from './ask.js';

const DATA = JSON.parse(readFileSync(new URL('../data/strings.json', import.meta.url)));
const ALL = DATA.strings, meta = DATA.lab_meta;
DATA.plan = JSON.parse(readFileSync(new URL('../data/plan_page.json', import.meta.url))); // come fa pipeline/build_page.py
const state = { equipped: { id: 're-string-slap-17', kg: [22, 21], since: '2026-10-31T13:29:43.457Z' }, liked: ['solinco-confidential-16l', 'toroline-o-toro-17'], disliked: ['babolat-rpm-blast-17'],
  stock: [{ id: 'toroline-o-toro-tour-17', size: 'mezza', n: 3 }, { id: 'solinco-confidential-17', size: 'intera', n: 1 }],
  sessions: [{ ts: '1', date: '2026-11-17', hours: 1.5, life: '2026-10-31T13:29:43.457Z', feel: 3, tag: 'pastosa' }], lives: [] };

test('il prompt contiene la domanda, la montata con i valori (e il loro tipo), la scorta e i consigli', () => {
  const p = buildAskPrompt({ question: 'cosa provo dopo?', state, ALL, meta, focus: null, tools: false });
  assert.match(p, /cosa provo dopo\?/);
  assert.match(p, /Re-String Slap 1,23/);
  assert.match(p, /ricavata dai dati/);
  assert.match(p, /O-Toro Tour 1,23: 3 mezza matassina/);
  assert.match(p, /una mezza \(6 m\) solo per metà ibrido/);
  assert.match(p, /consigli_dell_app/);
  assert.ok(p.length < 60000, `prompt troppo lungo: ${p.length}`);
});

test('riassunto: le corde in casa confrontate con la montata dal modello fisico', () => {
  const d = askDigest(state, ALL, meta);
  assert.equal(d.corde_in_casa_contro_la_montata.length, 2);
  assert.ok(d.corde_in_casa_contro_la_montata[0].righe.some((r) => r.grandezza === 'Lancio della palla'));
});

test('strumenti: cerca, dati di una corda, confronto fino a 4, consigli', () => {
  const tools = Object.fromEntries(makeTools(() => state, ALL, meta).map((t) => [t.name, t]));
  const hits = tools.cerca_corde.execute({ testo: 'o-toro tour' });
  assert.ok(hits.some((h) => h.id === 'toroline-o-toro-tour-17'));
  const d = tools.dati_corda.execute({ id: 'toroline-o-toro-tour-17' });
  assert.equal(d.valori['Rigidità in campo'].tipo, 'misurata');
  assert.throws(() => tools.dati_corda.execute({ id: 'nessuna' }));
  const c = tools.confronta_con_la_montata.execute({ ids: ['toroline-o-toro-tour-17', 'toroline-o-toro-17'] });
  assert.equal(c.length, 2);
  assert.match(c[0].frase, /Slap/);
  const a = tools.consigli.execute({ domanda: 'lower' });
  assert.equal(a.domanda, 'Palla più bassa');
  for (const t of Object.values(tools)) assert.ok(JSON.stringify(t.inputSchema || {}).length < 4096 && t.description.length < 1024);
});

test('dati di una corda: nessuna stima vecchia, solo il blocco lab', () => {
  const s = stringData(ALL.find((r) => r.id === 're-string-slap-17'));
  assert.equal(s.valori['Rigidità da ferma'].tipo, 'misurata');
  assert.equal(s.valori['Rigidità in campo'].tipo, 'ricavata dai dati');
});

test('piano di prove: nel riassunto la prossima prova con ore e ipotesi; lo strumento dà tutte le prove', () => {
  const p = buildAskPrompt({ question: 'quale provo?', state, ALL, meta, focus: null, tools: false, plan: DATA.plan });
  assert.match(p, /piano_di_prove/);
  assert.match(p, /"prossima":\{"n":1,"id":"full-o-toro-tour"/);
  assert.ok(p.length < 60000, `prompt troppo lungo: ${p.length}`);
  const tools = Object.fromEntries(makeTools(() => state, ALL, meta, DATA.plan).map((t) => [t.name, t]));
  const all = tools.piano_prove.execute({});
  assert.equal(all.prove.length, DATA.plan.rows.length);
  assert.deepEqual(all.prove[0].ore_ipotesi_piano, [12, 16]);
  assert.equal(makeTools(() => state, ALL, meta).some((t) => t.name === 'piano_prove'), false);
});
