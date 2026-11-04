import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres, seedUsers, ids, count, type TestDatabase } from './support/postgres.ts';
import { placeOrder } from '../src/orders.ts';
import { dispatchOutbox, type OutboxMessage } from '../src/outbox.ts';

let db: TestDatabase;
before(async () => {
  db = await startPostgres();
  await seedUsers(db.pool);
});
after(() => db[Symbol.asyncDispose]());
beforeEach(() => db.pool.query('TRUNCATE orders, outbox, idempotency_keys'));

const alice = { tenantId: ids.tenantA, userId: ids.alice };
const order = (n: number) => ({ productSku: `SKU-${n}`, quantity: 1, contactEmail: 'alice@example.com' });

describe('transactional outbox', () => {
  it('writes the outbox message in the same transaction as the order', async () => {
    const { body } = await placeOrder(db.pool, alice, order(1), 'outbox-key-1');
    const { rows } = await db.pool.query('SELECT topic, payload FROM outbox');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].topic, 'orders.placed');
    assert.deepEqual(rows[0].payload, { v: 1, orderId: body.data.id, userId: ids.alice, tenantId: ids.tenantA });
  });

  it('lets two dispatchers share the work without sending a message twice', async () => {
    for (let n = 0; n < 20; n++) await placeOrder(db.pool, alice, order(n), `outbox-key-${n}`);
    const sent: string[] = [];
    const send = async (message: OutboxMessage) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      sent.push(message.id);
    };
    const [a, b] = await Promise.all([
      dispatchOutbox(db.pool, send, { batchSize: 5, maxBatches: 10 }),
      dispatchOutbox(db.pool, send, { batchSize: 5, maxBatches: 10 }),
    ]);
    assert.equal(a + b, 20);
    assert.equal(new Set(sent).size, 20);
    assert.equal(sent.length, 20);
    assert.equal(Number((await db.pool.query('SELECT count(*) FROM outbox WHERE dispatched_at IS NULL')).rows[0].count), 0);
  });

  it('keeps a failed message pending with a later retry time and the attempt counted', async () => {
    await placeOrder(db.pool, alice, order(1), 'outbox-key-fail');
    const dispatched = await dispatchOutbox(
      db.pool,
      async () => {
        throw new Error('provider timeout');
      },
      { batchSize: 5, maxBatches: 1 },
    );
    assert.equal(dispatched, 0);
    const { rows } = await db.pool.query(
      'SELECT attempts, dispatched_at, available_at > now() AS later, last_error FROM outbox',
    );
    assert.deepEqual(rows[0], { attempts: 1, dispatched_at: null, later: true, last_error: 'Error' });
    assert.equal(await count(db.pool, 'outbox'), 1);
  });

  it('parks a message that reached the attempt limit instead of retrying it forever', async () => {
    await placeOrder(db.pool, alice, order(1), 'outbox-key-parked');
    await db.pool.query('UPDATE outbox SET attempts = 5, available_at = now() - interval \'1 minute\'');
    let sent = 0;
    const dispatched = await dispatchOutbox(
      db.pool,
      async () => {
        sent++;
      },
      { batchSize: 5, maxBatches: 1, maxAttempts: 5 },
    );
    assert.equal(dispatched, 0);
    assert.equal(sent, 0);
    const { rows } = await db.pool.query('SELECT attempts, dispatched_at FROM outbox');
    assert.deepEqual(rows[0], { attempts: 5, dispatched_at: null });
  });
});
