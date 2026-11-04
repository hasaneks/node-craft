import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, seedUsers, ids, type TestDatabase } from './support/postgres.ts';
import { listOrders } from '../src/orders.ts';

let db: TestDatabase;
before(async () => {
  db = await startPostgres();
  await seedUsers(db.pool);
});
after(() => db[Symbol.asyncDispose]());

const alice = { tenantId: ids.tenantA, userId: ids.alice };

describe('listOrders cursor precision', () => {
  it('returns every row once when several rows share a millisecond but differ in microseconds', async () => {
    // A bulk import or concurrent inserts: timestamps inside one millisecond, ids in no particular order.
    await db.pool.query(
      `INSERT INTO orders (tenant_id, user_id, product_sku, quantity, contact_email, created_at)
       SELECT $1, $2, 'SKU-' || n, 1, 'alice@example.com',
              timestamptz '2026-11-04 08:30:00.123000+00' + make_interval(secs => (n * 37 % 1000) / 1000000.0)
       FROM generate_series(1, 30) AS n`,
      [ids.tenantA, ids.alice],
    );
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await listOrders(db.pool, alice, { limit: 7, cursor }, 'test-cursor-secret');
      seen.push(...page.data.map((o) => o.id));
      cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    assert.equal(new Set(seen).size, 30);
    assert.equal(seen.length, 30);
  });
});
