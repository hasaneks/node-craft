import { createHash } from 'node:crypto';
import type pg from 'pg';
import { AppError } from './errors.ts';
import { encodeCursor, decodeCursor } from './cursor.ts';

export interface Actor {
  tenantId: string;
  userId: string;
}

export interface OrderInput {
  productSku: string;
  quantity: number;
  contactEmail: string;
}

export interface OrderDto {
  id: string;
  productSku: string;
  quantity: number;
  contactEmail: string;
  status: string;
  createdAt: string;
}

interface OrderRow {
  id: string;
  product_sku: string;
  quantity: number;
  contact_email: string;
  status: string;
  created_at: Date;
}

const toDto = (row: OrderRow): OrderDto => ({
  id: row.id,
  productSku: row.product_sku,
  quantity: row.quantity,
  contactEmail: row.contact_email,
  status: row.status,
  createdAt: row.created_at.toISOString(),
});

/** Stable hash of the request: same fields in any key order give the same fingerprint. */
const fingerprint = (input: OrderInput) =>
  createHash('sha256')
    .update(JSON.stringify(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))))
    .digest('hex');

async function insertOrder(client: pg.PoolClient, actor: Actor, input: OrderInput): Promise<OrderDto> {
  const { rows } = await client.query<OrderRow>(
    `INSERT INTO orders (tenant_id, user_id, product_sku, quantity, contact_email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, product_sku, quantity, contact_email, status, created_at`,
    [actor.tenantId, actor.userId, input.productSku, input.quantity, input.contactEmail],
  );
  const order = toDto(rows[0]!);
  // Same transaction as the order: either both exist or neither does.
  await client.query(`INSERT INTO outbox (topic, payload) VALUES ('orders.placed', $1)`, [
    { v: 1, orderId: order.id, userId: actor.userId, tenantId: actor.tenantId },
  ]);
  return order;
}

/**
 * Places an order. With an idempotency key, the key row, the order and the outbox message commit together:
 * - a repeat with the same payload returns the stored response and does nothing else;
 * - a repeat with a different payload is IDEMPOTENCY_KEY_REUSED;
 * - a concurrent duplicate blocks on the key's unique index until the first commits, then replays;
 *   if it waits longer than the lock timeout it gets IDEMPOTENCY_IN_PROGRESS;
 * - a failed attempt rolls back the key too, so the client can retry with the same key.
 * The transaction only does database work. Provider calls happen later, driven by the outbox.
 */
export async function placeOrder(
  pool: pg.Pool,
  actor: Actor,
  input: OrderInput,
  idempotencyKey?: string,
): Promise<{ replayed: boolean; body: { data: OrderDto } }> {
  const scope: unknown[] = [actor.tenantId, actor.userId, 'orders.place', idempotencyKey];
  const print = fingerprint(input);

  const stored = async () => {
    const { rows } = await pool.query(
      `SELECT fingerprint, status, response_body FROM idempotency_keys
       WHERE tenant_id = $1 AND user_id = $2 AND operation = $3 AND key = $4`,
      scope,
    );
    const row = rows[0];
    if (!row) return undefined;
    if (row.fingerprint !== print) throw new AppError('IDEMPOTENCY_KEY_REUSED');
    // Only reachable when the key row is written in its own transaction before long work (see the reference).
    if (row.status !== 'completed') throw new AppError('IDEMPOTENCY_IN_PROGRESS', { retryAfterSeconds: 1 });
    return { replayed: true, body: row.response_body };
  };

  if (idempotencyKey) {
    const previous = await stored();
    if (previous) return previous;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (idempotencyKey) {
      await client.query(`SET LOCAL lock_timeout = '2s'`);
      const claimed = await client.query(
        `INSERT INTO idempotency_keys (tenant_id, user_id, operation, key, fingerprint)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [...scope, print],
      );
      if (claimed.rowCount === 0) {
        // Another request with this key committed while we waited.
        await client.query('ROLLBACK');
        const previous = await stored();
        if (previous) return previous;
        throw new AppError('IDEMPOTENCY_IN_PROGRESS', { retryAfterSeconds: 1 });
      }
    }
    const body = { data: await insertOrder(client, actor, input) };
    if (idempotencyKey) {
      await client.query(
        `UPDATE idempotency_keys SET status = 'completed', response_code = 201, response_body = $5
         WHERE tenant_id = $1 AND user_id = $2 AND operation = $3 AND key = $4`,
        [...scope, body],
      );
    }
    await client.query('COMMIT');
    return { replayed: false, body };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if ((error as { code?: string }).code === '55P03') {
      throw new AppError('IDEMPOTENCY_IN_PROGRESS', { retryAfterSeconds: 1, cause: error });
    }
    throw error;
  } finally {
    client.release();
  }
}

/** The owner's order, or RESOURCE_NOT_FOUND for anyone else (other user or tenant), so existence does not leak. */
export async function getOrder(pool: pg.Pool, actor: Actor, orderId: string): Promise<OrderDto> {
  const { rows } = await pool.query<OrderRow>(
    `SELECT id, product_sku, quantity, contact_email, status, created_at FROM orders
     WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
    [orderId, actor.tenantId, actor.userId],
  );
  if (!rows[0]) throw new AppError('RESOURCE_NOT_FOUND');
  return toDto(rows[0]);
}

/** Newest first, keyset pagination on (created_at, id) with one extra row to detect the next page. */
export async function listOrders(
  pool: pg.Pool,
  actor: Actor,
  page: { limit: number; cursor?: string | undefined },
  cursorSecret: string,
): Promise<{ data: OrderDto[]; meta: { nextCursor: string | null; hasMore: boolean; limit: number } }> {
  const sort = 'created_desc';
  const after = page.cursor ? decodeCursor(page.cursor, sort, cursorSecret) : undefined;
  // The cursor keeps the column's full microsecond precision as text; a JS Date would cut it to milliseconds and
  // rows inside the same millisecond would be skipped.
  const { rows } = await pool.query<OrderRow & { cursor_ts: string }>(
    `SELECT id, product_sku, quantity, contact_email, status, created_at,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_ts
     FROM orders
     WHERE tenant_id = $1 AND user_id = $2
       AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::uuid))
     ORDER BY created_at DESC, id DESC
     LIMIT $5`,
    [actor.tenantId, actor.userId, after?.createdAt ?? null, after?.id ?? null, page.limit + 1],
  );
  const hasMore = rows.length > page.limit;
  const pageRows = rows.slice(0, page.limit);
  const last = pageRows.at(-1);
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.cursor_ts, id: last.id }, sort, cursorSecret) : null;
  const data = pageRows.map(toDto);
  return { data, meta: { nextCursor, hasMore, limit: page.limit } };
}
