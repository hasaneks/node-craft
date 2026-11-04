# Queries, indexes and connections

## Query shape

- Select the columns you return, not `SELECT *` on wide tables.
- No N+1: load relations with a join, a batched `WHERE id = ANY($1)`, the ORM's include/with, or a DataLoader-style
  batch. Count queries per request in a test to keep it fixed.
- No query per row inside a loop; batch writes (`INSERT ... SELECT unnest(...)`, multi-row `VALUES`, `COPY` for bulk).
  Measure one giant query too; it can be worse than a few batches.
- Deep `OFFSET` scans and discards rows. Use cursor pagination with a stable order
  (`node-craft-contract` → `references/pagination.md`).
- Do not compute exact `count(*)` on every list request for large tables. Use `hasMore`, an estimate
  (`pg_class.reltuples`), or a separate endpoint.
- Large exports and backfills stream or batch (cursor or keyset loop); never load the whole result into memory.
- Search: first PostgreSQL (`pg_trgm`, full-text search with `tsvector` and GIN). A separate search service only when
  these are measured to fall short.

## Indexes

- Read the plan: `EXPLAIN (ANALYZE, BUFFERS)` on realistic data; look for sequential scans on large tables, row
  estimate errors, sorts spilling to disk, nested loops over many rows.
- Composite indexes match the query: equality columns first, then range or sort columns, matching the sort direction
  (`(tenant_id, user_id, created_at DESC, id DESC)` for a per-user newest-first list).
- Partial indexes for hot subsets (`WHERE status = 'pending'`), covering indexes (`INCLUDE`) when they save heap reads.
- Foreign key columns used in joins or parent deletes need their own index.
- Every index costs writes and memory. Find unused ones (`pg_stat_user_indexes.idx_scan = 0` over a representative
  period) and duplicates before adding more.
- Indexes ship in migrations; large tables use `CREATE INDEX CONCURRENTLY`.

## Safety

`EXPLAIN ANALYZE` runs the query. For `INSERT`/`UPDATE`/`DELETE`, wrap in a transaction and roll back. Do not run heavy
analysis on production without approval; use a restored copy.

## Pool and connection budget

- One pool per process, created at startup and closed at shutdown. Never a pool or client per request.
- Budget all connections against the database limit, with headroom (for example 20 %):

```text
api replicas × api pool max
+ worker replicas × worker pool max
+ migration / pre-deploy job
+ admin, analytics and operational connections
≤ database max_connections − superuser reserve − headroom
```

- Set per pool: `max`, connection timeout (acquire), idle timeout. Per session or role: `statement_timeout`,
  `lock_timeout`, `idle_in_transaction_session_timeout`. Write the values and the reason in the performance document.
- Watch acquire wait time, timeouts, active connections, slow queries and lock waits. Pool exhaustion usually means
  long transactions, slow queries or worker concurrency above the pool size, not a pool that is too small.
- With a pooler (PgBouncer, a managed pooler), check the mode: transaction pooling breaks session features (`SET`
  without `LOCAL`, advisory session locks, `LISTEN`, some prepared statement handling). Configure the driver and ORM
  for it and test.
