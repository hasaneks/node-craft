import type pg from 'pg';

export interface OutboxMessage {
  id: string;
  topic: string;
  payload: unknown;
  attempts: number;
}

export interface DispatchOptions {
  batchSize: number;
  maxBatches: number;
  /** How long a claimed message stays invisible to other dispatchers while it is being sent. */
  leaseSeconds?: number;
  /** Messages at this many attempts are parked: no longer claimed, left for inspection and alerting. */
  maxAttempts?: number;
}

const backoffSeconds = (attempts: number) => Math.min(2 ** attempts * 5, 3600) + Math.random() * 5;

/**
 * Claims pending messages in a short transaction (SKIP LOCKED + a lease), sends them outside any transaction,
 * then marks each one. A crash after sending and before marking lets the lease expire and the message is sent
 * again: delivery is at least once, so consumers dedupe on the message id.
 */
export async function dispatchOutbox(
  pool: pg.Pool,
  send: (message: OutboxMessage) => Promise<void>,
  options: DispatchOptions,
): Promise<number> {
  const lease = options.leaseSeconds ?? 60;
  const maxAttempts = options.maxAttempts ?? 10;
  let dispatched = 0;
  for (let batch = 0; batch < options.maxBatches; batch++) {
    const { rows } = await pool.query<OutboxMessage>(
      `UPDATE outbox SET attempts = attempts + 1, available_at = now() + make_interval(secs => $2)
       WHERE id IN (
         SELECT id FROM outbox
         WHERE dispatched_at IS NULL AND available_at <= now() AND attempts < $3
         ORDER BY available_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       RETURNING id, topic, payload, attempts`,
      [options.batchSize, lease, maxAttempts],
    );
    if (rows.length === 0) break;
    for (const message of rows) {
      try {
        await send(message);
        await pool.query(`UPDATE outbox SET dispatched_at = now(), last_error = NULL WHERE id = $1`, [message.id]);
        dispatched++;
      } catch (error) {
        // Store a short, non-sensitive marker; the full error goes to the logs with the message id.
        await pool.query(
          `UPDATE outbox SET available_at = now() + make_interval(secs => $2), last_error = $3 WHERE id = $1`,
          [message.id, backoffSeconds(message.attempts), (error as Error).name ?? 'Error'],
        );
      }
    }
  }
  return dispatched;
}
