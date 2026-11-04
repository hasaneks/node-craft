import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, seedUsers, ids, count, type TestDatabase } from './support/postgres.ts';
import { placeOrder } from '../src/orders.ts';
import { AppError } from '../src/errors.ts';

let db: TestDatabase;
before(async () => {
  db = await startPostgres();
  await seedUsers(db.pool);
});
after(() => db[Symbol.asyncDispose]());
beforeEach(() => db.pool.query('TRUNCATE orders, outbox, idempotency_keys'));

const alice = { tenantId: ids.tenantA, userId: ids.alice };
const bob = { tenantId: ids.tenantA, userId: ids.bob };
const input = { productSku: 'SKU-1', quantity: 2, contactEmail: 'alice@example.com' };

describe('placeOrder with an Idempotency-Key', () => {
  it('replays the stored result for the same key and payload without a second order', async () => {
    const first = await placeOrder(db.pool, alice, input, 'key-0000001');
    const second = await placeOrder(db.pool, alice, input, 'key-0000001');
    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
    assert.deepEqual(second.body, first.body);
    assert.equal(await count(db.pool, 'orders'), 1);
  });

  it('rejects the same key with a different payload and does not run it', async () => {
    await placeOrder(db.pool, alice, input, 'key-0000002');
    await assert.rejects(
      placeOrder(db.pool, alice, { ...input, quantity: 3 }, 'key-0000002'),
      (error: unknown) => error instanceof AppError && error.code === 'IDEMPOTENCY_KEY_REUSED',
    );
    assert.equal(await count(db.pool, 'orders'), 1);
  });

  it('creates one order when the same request arrives five times at once', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => placeOrder(db.pool, alice, input, 'key-0000003')),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const rejected = results.filter((r) => r.status === 'rejected').map((r) => r.reason);
    for (const reason of rejected) {
      assert.ok(reason instanceof AppError && reason.code === 'IDEMPOTENCY_IN_PROGRESS', String(reason));
    }
    assert.ok(fulfilled.length >= 1);
    assert.equal(new Set(fulfilled.map((r) => r.body.data.id)).size, 1);
    assert.equal(await count(db.pool, 'orders'), 1);
  });

  it('scopes keys per user', async () => {
    await placeOrder(db.pool, alice, input, 'key-0000004');
    await placeOrder(db.pool, bob, input, 'key-0000004');
    assert.equal(await count(db.pool, 'orders'), 2);
  });

  it('rolls back the order, the outbox row and the key together when the write fails', async () => {
    await assert.rejects(placeOrder(db.pool, alice, { ...input, quantity: 0 }, 'key-0000005'));
    assert.equal(await count(db.pool, 'orders'), 0);
    assert.equal(await count(db.pool, 'outbox'), 0);
    assert.equal(await count(db.pool, 'idempotency_keys'), 0);
    // A failed attempt does not consume the key, so the corrected request is a normal first request.
    const retry = await placeOrder(db.pool, alice, input, 'key-0000005');
    assert.equal(retry.replayed, false);
    assert.equal(await count(db.pool, 'orders'), 1);
  });
});
