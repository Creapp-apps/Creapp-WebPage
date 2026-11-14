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

test('createRealProbes rechaza URLs con forma inválida o sin https', () => {
  assert.throws(() => createRealProbes({ ...OK, supabaseUrl: 'no es una url' }), /supabaseUrl no es una URL válida/);
  assert.throws(() => createRealProbes({ ...OK, r2Url: 'http://r2.example.com' }), /r2Url debe ser https/);
  assert.throws(() => createRealProbes({ ...OK, supabaseUrl: 'ftp://x.supabase.co' }), /supabaseUrl debe ser https/);
});
