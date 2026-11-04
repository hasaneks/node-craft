# Redis: when and how

Redis is not part of a new project by default. Add it, with an ADR, for one of these:

- a measured cache need that query and index work did not solve;
- a rate limit or lock that must be shared across replicas;
- short-lived distributed state (one-time codes, short dedup windows that are not the only guard);
- BullMQ (`references/queues-workers.md`).

PostgreSQL stays the source of truth. For each Redis use, write down what happens if Redis loses its data.

## Caching

- Fix the query and index first; a cache over a bad query hides the problem until the cache misses.
- For each cache, record: owning module, key format, TTL, invalidation trigger, acceptable staleness.
- Keys carry environment, schema version and, as needed, tenant, user and locale:
  `prod:v3:catalog:tenant:42:locale:tr:product:981`.
- User-specific data never goes into a key another user can hit.
- Stampede: TTL jitter, single-flight regeneration (one request rebuilds while others wait or serve stale), or a
  short lock, as the load requires.
- Use `SCAN` (incremental), never `KEYS`, in production; prefer key design that does not need scanning.

## When Redis is down

Decide per use, document it, and test it:

| Use | Typical behaviour |
|---|---|
| Read cache | Fail open: bypass the cache, read the database, watch the load |
| Rate limit on login or expensive endpoints | Fail closed or fall back to a conservative in-process limit |
| Quota or entitlement enforcement | Do not silently allow; fall back to the database or reject with 503 |
| Queue | Producers fail visibly (or use the outbox so nothing is lost); readiness reflects it |

## Operations

- Set client timeouts and connection limits; watch latency, memory, evictions and connection count.
- Not exposed to the internet; private network, auth, TLS where the platform offers it; separate instances per
  environment.
- Cache and queue on the same server conflict: caches want an eviction policy (`allkeys-lru`), BullMQ needs
  `noeviction`. Logical databases (`SELECT 1`) share memory and the eviction policy, so they do not separate this. Use
  separate instances when both are needed.
