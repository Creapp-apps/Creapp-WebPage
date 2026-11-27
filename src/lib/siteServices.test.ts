import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SERVICES, getService, servicePath, servicesByGroup, GROUP_LABELS } from '../components/site/services';

test('8 servicios, slugs únicos por grupo', () => {
  assert.equal(SERVICES.length, 8);
  const keys = SERVICES.map(s => `${s.group}/${s.slug}`);
  assert.equal(new Set(keys).size, 8);
});

test('grupos válidos y labels', () => {
  const groups = new Set(SERVICES.map(s => s.group));
  assert.deepEqual([...groups].sort(), ['desarrollo', 'marketing', 'seguridad']);
  assert.equal(GROUP_LABELS.marketing, 'Marketing & Contenidos');
});

test('servicePath y getService', () => {
  assert.equal(servicePath({ group: 'seguridad', slug: 'soc' }), '/seguridad/soc');
  assert.equal(getService('seguridad', 'soc')?.title, 'Análisis SOC');
  assert.equal(getService('desarrollo', 'noexiste'), undefined);
});

test('seguridad marcada ilustrativa; firma interactivas', () => {
  assert.ok(SERVICES.filter(s => s.group === 'seguridad').every(s => s.illustrative));
  assert.deepEqual(SERVICES.filter(s => s.interactive).map(s => s.slug).sort(), ['ia', 'pentesting']);
});

test('servicesByGroup agrupa 3/3/2', () => {
  const g = servicesByGroup();
  assert.equal(g.desarrollo.length, 3);
  assert.equal(g.seguridad.length, 3);
  assert.equal(g.marketing.length, 2);
});
