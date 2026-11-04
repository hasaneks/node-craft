# Transactional outbox

Use it when a database change and the message, job or provider call it causes must not be lost apart: an order
placed and its confirmation, an entitlement granted and its sync, a deletion and its downstream cleanup. Do not add it
to every simple endpoint.

Committing to PostgreSQL and adding a job to Redis are two systems. Without an outbox, a crash between them loses the
job, or a job runs for a transaction that rolled back.

## Shape

```sql
CREATE TABLE outbox (
  id            uuid        PRIMARY KEY,
  topic         text        NOT NULL,
  payload       jsonb       NOT NULL,          -- versioned, small, no secrets
  created_at    timestamptz NOT NULL DEFAULT now(),
  available_at  timestamptz NOT NULL DEFAULT now(),
  attempts      int         NOT NULL DEFAULT 0,
  dispatched_at timestamptz,
  last_error    text
);
CREATE INDEX outbox_pending ON outbox (available_at) WHERE dispatched_at IS NULL;
```

1. The use case writes business rows **and** the outbox row in the same transaction.
2. A dispatcher **claims** a batch in one short statement: it picks pending rows with `FOR UPDATE SKIP LOCKED`, counts
   the attempt and pushes `available_at` forward by a lease, so other dispatchers skip them. It sends each message
   **outside** any transaction (enqueue a job, call a provider), then marks `dispatched_at`. On failure it sets
   `available_at` to a backoff time and stores a short error marker (not the raw provider text).
3. The dispatcher can crash after sending and before marking; the lease then expires and the message is sent again.
   So delivery is at least once: the consumer uses the outbox `id` (or a business key) for idempotency. When
   enqueueing to BullMQ, use the outbox id as `jobId` to cut most duplicates; the consumer's database guard handles
   the rest.

```sql
UPDATE outbox SET attempts = attempts + 1, available_at = now() + make_interval(secs => $2)  -- the lease
WHERE id IN (
  SELECT id FROM outbox
  WHERE dispatched_at IS NULL AND available_at <= now() AND attempts < $3  -- at the cap: parked
  ORDER BY available_at
  FOR UPDATE SKIP LOCKED
  LIMIT $1
)
RETURNING id, topic, payload, attempts;
```
4. Consumers that lose their acknowledgment after doing the work must be safe to run again.

## Operate

- Metrics and alerts: age of the oldest pending row, attempts distribution, rows past max attempts (parked for
  inspection, not deleted).
- Retention: delete or archive dispatched rows after a period.
- Run one or more dispatchers; `SKIP LOCKED` lets them share work. Run it in the worker process, not the API.

## User impact

Eventual consistency is a product decision: say what the user sees between commit and delivery (order placed,
confirmation email may take a minute). Creating the record is not proof the notification arrived.
