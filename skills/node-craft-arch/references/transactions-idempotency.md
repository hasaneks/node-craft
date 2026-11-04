# Transactions, concurrency and idempotency

## Transactions

- Writes that must succeed or fail together run in one transaction owned by one use case.
- Keep transactions short. Never call a slow provider, send email, upload a file or wait for a user inside one.
  Read what you need, open the transaction, write, commit, then do side effects (through the outbox when they must
  not be lost: `references/outbox.md`).
- Set `statement_timeout`, `lock_timeout` and `idle_in_transaction_session_timeout` so a stuck transaction cannot
  hold locks forever.

## Races

- "Check if it exists, then insert" does not prevent duplicates. Back it with a `UNIQUE` constraint and handle the
  violation (`23505`) as a domain result, or use `INSERT ... ON CONFLICT`.
- Lost updates and quota or capacity overruns: use an atomic update (`UPDATE stock SET qty = qty - $1 WHERE id = $2
  AND qty >= $1`, check the row count), an optimistic `version` column (`WHERE version = $n`, 409 on mismatch), or
  `SELECT ... FOR UPDATE` when you must read then decide.
- Isolation: the default `READ COMMITTED` is enough for most writes with the patterns above. Choose `REPEATABLE READ`
  or `SERIALIZABLE` only for a specific anomaly, and then retry on serialization failures.
- Deadlocks (`40P01`) and serialization failures (`40001`): retry the whole transaction a small, bounded number of
  times with jitter. Side effects must not run inside the retried block, or they repeat.

## Idempotent writes

Use for any endpoint where a repeat would create a second order, charge, entitlement, message or record.

Server side:

1. The client sends `Idempotency-Key` (one per user action; the same key on every retry of that action).
2. Scope the key: `(tenant_id, user_id, operation, key)`. Store a fingerprint of the normalized request (hash of
   method, route and canonical body).
3. Look the key up. Found with the same fingerprint → return the stored response; do not run the work again. Found
   with a different fingerprint → 409 `IDEMPOTENCY_KEY_REUSED`; never run the new payload.
4. Not found → in one transaction: set a short `lock_timeout`, insert the key row (`status = 'in_progress'`) with
   `ON CONFLICT DO NOTHING`, do the business write (and the outbox row), set `status = 'completed'` with the stored
   response, commit.
   - A concurrent duplicate's insert **waits on the unique index** until the first transaction ends. If the first
     commits, the insert does nothing; look the key up again and replay. If the first rolls back, the duplicate
     proceeds as the first request. If the wait exceeds the lock timeout, answer 409 `IDEMPOTENCY_IN_PROGRESS` with
     `Retry-After`.
   - A failure rolls back the key row too, so a failed attempt does not consume the key.
5. Crash windows: the key row and the business write commit together, so a crash before commit leaves neither and the
   retry runs cleanly. The transaction holds only database work. A provider call after commit uses its own
   idempotency key derived from the same key, and the outbox drives it. If the work itself is long, store the key
   row with an `in_progress` status in its own short transaction first, and answer duplicates from that status
   instead of holding a transaction open.
6. Retention: keep keys at least as long as clients may retry (for example 24 hours to 7 days), document it, and
   purge older rows in a scheduled job.

```sql
CREATE TABLE idempotency_keys (
  tenant_id     uuid        NOT NULL,
  user_id       uuid        NOT NULL,
  operation     text        NOT NULL,
  key           text        NOT NULL CHECK (char_length(key) BETWEEN 8 AND 255),
  fingerprint   text        NOT NULL,
  status        text        NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  response_code int,                     -- set when completed
  response_body jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, operation, key)
);
```

Not idempotency: an in-memory `Set` (lost on restart, not shared across replicas), a BullMQ `jobId` alone (forgotten
once the job is removed), or a Redis key with a short TTL as the only guard for money or entitlements.

## External effects

The database and a provider are never one atomic transaction. Use the provider's idempotency key where it exists,
the outbox for delivery, and reconciliation (compare provider state with ours on a schedule) for anything financial.

## Tests

Rollback mid-transaction, two concurrent updates, two concurrent creates of the same unique thing, the same
idempotency key twice (sequential and concurrent), the same key with a different payload, and a retried transaction
after a serialization failure. Run them on real PostgreSQL.
