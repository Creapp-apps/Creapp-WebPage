import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SERVICES } from '../components/site/services';
import { METHODOLOGY } from '../components/site/methodology';

const FORBIDDEN = /\b(gemini|openai|gpt|claude|google|chatgpt)\b/i;
const PRICE = /(\$|usd|€|\/mes\b|por mes\b|precio)/i;
const texts = (s: typeof SERVICES[number]) => [s.eyebrow, s.lead, ...s.deliverables, ...s.includes.flatMap(i => [i.t, i.d])];

test('ningún servicio nombra proveedor LLM ni precio', () => {
  for (const s of SERVICES) for (const t of texts(s)) {
    assert.ok(!FORBIDDEN.test(t), `prohibido en ${s.slug}: ${t}`);
    assert.ok(!PRICE.test(t), `precio en ${s.slug}: ${t}`);
  }
});

test('todo servicio tiene copy real (no placeholder)', () => {
  for (const s of SERVICES) {
    assert.ok(s.lead.length > 40, `lead corto: ${s.slug}`);
    assert.ok(s.deliverables.length >= 3 && s.includes.length >= 3, `faltan bullets: ${s.slug}`);
  }
});

test('metodología grounded sin proveedor ni precio', () => {
  const all = [METHODOLOGY.title, METHODOLOGY.lead, ...METHODOLOGY.points.flatMap(p => [p.t, p.d])];
  for (const t of all) {
    assert.ok(!FORBIDDEN.test(t), `prohibido en metodología: ${t}`);
    assert.ok(!PRICE.test(t), `precio en metodología: ${t}`);
  }
  assert.ok(METHODOLOGY.points.length >= 3);
});
