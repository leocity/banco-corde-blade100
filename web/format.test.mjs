import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, esc, safeUrl, nameOf, fullName, subline, MARK } from './format.js';

test('fmt: virgola italiana e trattino per i dati mancanti', () => {
  assert.equal(fmt(7.74, 1), '7,7');
  assert.equal(fmt(null), '—');
  assert.equal(fmt(undefined), '—');
  assert.equal(fmt(NaN), '—');
});

test('esc: neutralizza HTML', () => {
  assert.equal(esc('<img src=x onerror="a">&'), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;');
  assert.equal(esc(null), '');
});

test('safeUrl: solo http(s)', () => {
  assert.equal(safeUrl('https://a.b/c'), 'https://a.b/c');
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl(undefined), '#');
});

test('nomi e sottotitolo', () => {
  const r = { brand: 'Re-String', model: 'Zero', gauge_mm: 1.23, shape: 'HEX' };
  assert.equal(nameOf(r), 'Re-String Zero');
  assert.equal(fullName(r), 'Re-String Zero 1,23');
  assert.equal(subline(r), '1,23 mm · esagonale');
});

test('marcatori di affidabilità', () => {
  assert.deepEqual(MARK, { measured: '●', estimated: '◐', missing: '○' });
});

import { fmtN } from './format.js';
test('fmtN: decimali solo se servono', () => {
  assert.equal(fmtN(3), '3');
  assert.equal(fmtN(1.5), '1,5');
  assert.equal(fmtN(12), '12');
  assert.equal(fmtN(null), '—');
  assert.equal(fmtN(NaN), '—');
});
