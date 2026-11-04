import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { startPostgres, seedUsers, ids, type TestDatabase } from './support/postgres.ts';
import { buildApp } from '../src/app.ts';

let db: TestDatabase;
let app: FastifyInstance;

// Test identities stand in for verified tokens. The real authenticate() verifies a Firebase ID token and maps
// its uid to users.id; here the token is the user id so tests stay offline.
const tokens: Record<string, { tenantId: string; userId: string }> = {
  alice: { tenantId: ids.tenantA, userId: ids.alice },
  bob: { tenantId: ids.tenantA, userId: ids.bob },
  mallory: { tenantId: ids.tenantB, userId: ids.mallory },
};

before(async () => {
  db = await startPostgres();
  await seedUsers(db.pool);
  app = await buildApp({
    pool: db.pool,
    cursorSecret: 'test-cursor-secret',
    supportedLocales: ['en', 'tr'],
    fallbackLocale: 'en',
    authenticate: async (header) => tokens[header?.replace(/^Bearer /, '') ?? ''],
  });
});
after(async () => {
  await app.close();
  await db[Symbol.asyncDispose]();
});
beforeEach(() => db.pool.query('TRUNCATE orders, outbox, idempotency_keys'));

const as = (user: string, extra: Record<string, string> = {}) => ({ authorization: `Bearer ${user}`, ...extra });
const valid = { productSku: 'SKU-1', quantity: 1, contactEmail: 'alice@example.com' };
const create = (user: string, body: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: '/api/v1/orders', headers: as(user, headers), payload: body as object });

describe('POST /api/v1/orders', () => {
  it('returns a Turkish validation error with stable codes and per-field messages', async () => {
    const res = await create('alice', { productSku: 'SKU-1', contactEmail: 'not-an-email' }, { 'x-app-locale': 'tr' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.headers['content-language'], 'tr');
    const body = res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.message, 'Lütfen işaretli alanları kontrol edin.');
    assert.deepEqual(body.error.details, [
      { field: 'contactEmail', code: 'INVALID_EMAIL', message: 'Geçerli bir e-posta adresi girin.' },
      { field: 'quantity', code: 'REQUIRED', message: 'Bu alan zorunludur.' },
    ]);
    assert.equal(body.locale, 'tr');
    assert.equal(body.requestId, res.headers['x-request-id']);
  });

  it('uses the Turkish profile when the explicit header is unsupported', async () => {
    const res = await create('alice', {}, { 'x-app-locale': 'de', 'accept-language': 'en' });
    assert.equal(res.json().locale, 'tr');
  });

  it('rejects unknown fields instead of saving them', async () => {
    const res = await create('alice', { ...valid, userId: ids.bob, isPremium: true });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(
      res.json().error.details.map((d: { field: string }) => d.field),
      ['isPremium', 'userId'],
    );
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/orders', payload: valid });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error.code, 'AUTH_REQUIRED');
  });

  it('creates once and replays for the same Idempotency-Key', async () => {
    const first = await create('alice', valid, { 'idempotency-key': 'http-key-001' });
    const second = await create('alice', valid, { 'idempotency-key': 'http-key-001' });
    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 201);
    assert.equal(second.headers['idempotency-replayed'], 'true');
    assert.equal(second.json().data.id, first.json().data.id);
  });

  it('answers 409 when a key is reused with a different payload', async () => {
    await create('alice', valid, { 'idempotency-key': 'http-key-002' });
    const res = await create('alice', { ...valid, quantity: 5 }, { 'idempotency-key': 'http-key-002' });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, 'IDEMPOTENCY_KEY_REUSED');
  });
});

describe('GET /api/v1/orders/:orderId', () => {
  it('hides another user’s and another tenant’s order as not found', async () => {
    const id = (await create('alice', valid)).json().data.id;
    for (const user of ['bob', 'mallory']) {
      const res = await app.inject({ url: `/api/v1/orders/${id}`, headers: as(user) });
      assert.equal(res.statusCode, 404, user);
      assert.equal(res.json().error.code, 'RESOURCE_NOT_FOUND');
      assert.doesNotMatch(res.body, new RegExp(id));
    }
    const own = await app.inject({ url: `/api/v1/orders/${id}`, headers: as('alice') });
    assert.equal(own.statusCode, 200);
    assert.deepEqual(Object.keys(own.json().data).sort(), ['contactEmail', 'createdAt', 'id', 'productSku', 'quantity', 'status']);
  });
});

describe('GET /api/v1/orders', () => {
  it('pages through every order once with a stable cursor and ends with a null cursor', async () => {
    for (let n = 0; n < 25; n++) await create('alice', { ...valid, productSku: `SKU-${n}` });
    await create('bob', valid);
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query: string = cursor ? `?limit=10&cursor=${cursor}` : '?limit=10';
      const res = await app.inject({ url: `/api/v1/orders${query}`, headers: as('alice') });
      assert.equal(res.statusCode, 200);
      const { data, meta } = res.json();
      seen.push(...data.map((o: { id: string }) => o.id));
      cursor = meta.nextCursor;
      assert.equal(meta.hasMore, cursor !== null);
      pages++;
    } while (cursor);
    assert.equal(pages, 3);
    assert.equal(seen.length, 25);
    assert.equal(new Set(seen).size, 25);
  });

  it('rejects a page size above the maximum and an invalid cursor', async () => {
    const big = await app.inject({ url: '/api/v1/orders?limit=101', headers: as('alice') });
    assert.equal(big.statusCode, 400);
    assert.equal(big.json().error.details[0].field, 'limit');
    const bad = await app.inject({ url: '/api/v1/orders?cursor=abc.def', headers: as('alice') });
    assert.equal(bad.statusCode, 400);
    assert.equal(bad.json().error.code, 'INVALID_CURSOR');
  });
});
