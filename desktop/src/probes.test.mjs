import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRealProbes } from './probes.mjs';

// Sólo validación de parámetros: no toca la red ni corre git.
const OK = { supabaseUrl: 'https://x.supabase.co', r2Url: 'https://r2.example.com', creappPath: '/repo' };

test('createRealProbes valida supabaseUrl con un error claro', () => {
  assert.throws(() => createRealProbes({ ...OK, supabaseUrl: undefined }), /falta supabaseUrl/);
});

test('createRealProbes valida r2Url y creappPath', () => {
  assert.throws(() => createRealProbes({ ...OK, r2Url: '  ' }), /falta r2Url/);
  assert.throws(() => createRealProbes({ ...OK, creappPath: null }), /falta creappPath/);
});

test('createRealProbes con parámetros válidos devuelve las tres probes', () => {
  const p = createRealProbes(OK);
  assert.deepEqual(Object.keys(p).sort(), ['git', 'r2', 'supabase']);
});
