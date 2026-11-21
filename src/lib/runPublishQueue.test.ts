import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPublishQueue } from './runPublishQueue.js';

// Fake `sb` encadenable que registra los filtros de cada query SELECT y
// siempre devuelve filas vacías (así ninguna fase entra a sus loops: no se
// tocan tokens, Meta ni updates — sólo se ejercita el filtrado por `onlyId`).
function makeSb() {
  const queries: Array<{ eqs: Array<[string, unknown]>; lte: [string, unknown] | null }> = [];
  const sb = {
    from() {
      return {
        select() {
          const rec = { eqs: [] as Array<[string, unknown]>, lte: null as [string, unknown] | null };
          queries.push(rec);
          const builder: any = {
            eq(col: string, val: unknown) {
              rec.eqs.push([col, val]);
              return builder;
            },
            lte(col: string, val: unknown) {
              rec.lte = [col, val];
              return builder;
            },
            then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
              return Promise.resolve({ data: [], error: null }).then(resolve, reject);
            },
          };
          return builder;
        },
      };
    },
  };
  return { sb, queries };
}

const hasIdFilter = (eqs: Array<[string, unknown]>, id: string) =>
  eqs.some(([col, val]) => col === 'id' && val === id);

test('runPublishQueue sin onlyId: 3 fases, ninguna filtra por id', async () => {
  const { sb, queries } = makeSb();
  const out = await runPublishQueue(sb as any, {});
  assert.equal(out.results.length, 0);
  assert.equal(out.phase1Error, undefined);
  assert.equal(queries.length, 3, 'una query SELECT por fase');
  for (const q of queries) {
    assert.ok(!q.eqs.some(([col]) => col === 'id'), 'sin onlyId no debe haber filtro por id');
  }
});

test('runPublishQueue con onlyId: cada fase filtra por ese id', async () => {
  const { sb, queries } = makeSb();
  const out = await runPublishQueue(sb as any, { onlyId: 'abc-123' });
  assert.equal(out.results.length, 0);
  assert.equal(queries.length, 3);
  for (const q of queries) {
    assert.ok(hasIdFilter(q.eqs, 'abc-123'), 'cada query debe filtrar por id=abc-123');
  }
});

test('runPublishQueue propaga phase1Error cuando la query de la Fase 1 falla', async () => {
  const sb = {
    from() {
      return {
        select() {
          const builder: any = {
            eq() {
              return builder;
            },
            lte() {
              return builder;
            },
            then(resolve: (v: unknown) => unknown) {
              return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve);
            },
          };
          return builder;
        },
      };
    },
  };
  const out = await runPublishQueue(sb as any, {});
  assert.equal(out.phase1Error, 'boom');
  assert.equal(out.results.length, 0);
});
