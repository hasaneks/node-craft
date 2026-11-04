---
name: node-craft-perf
description: "Measures and fixes Node.js/TypeScript backend performance: turns 'fast' into budgets (p95/p99 per endpoint class, query time and count, pool and lock waits, payload size, provider timeouts, queue wait, event loop delay, memory), profiles slow endpoints and queries with EXPLAIN (ANALYZE only where safe), finds N+1 queries, missing or wrong indexes, deep offsets, expensive counts, pool exhaustion, connection budgets across replicas, event loop blocking, unbounded fan-out and stacked retries, then fixes the biggest cost first and proves it with before/after numbers under the same load. Use when an endpoint, query, job or worker is slow, the pool is exhausted, latency or memory grows, before a launch or load spike, or to set performance budgets. Never claims a speed-up without a measurement."
---

# Backend performance

Measure, fix the largest cost, measure again under the same conditions. No caching, new infrastructure or
architecture change without a number that justifies it. Follow `node-craft` for TDD and done.

| Need | Read |
|---|---|
| Setting budgets, what to record | `references/budgets.md` |
| Slow queries, indexes, N+1, pagination, pool and connection budget | `references/queries-pool.md` |
| Event loop delay, CPU work, memory, streaming, backpressure | `references/event-loop.md` |
| Load tests: tools, data, honest reporting | `references/load-testing.md` |

## 1. Define the problem as a number

Which endpoint or job, which percentile, under what load and data volume, against which budget. "The orders list is
slow" becomes "GET /orders p95 is 1.8 s at 50 rps with 2 M orders; budget 300 ms".

## 2. Measure where the time goes

- Request timing split: total, DB time, query count, provider time, serialization. Log per request in a test run,
  or use tracing when it exists.
- PostgreSQL: `pg_stat_statements` for the top queries by total time; `EXPLAIN (ANALYZE, BUFFERS)` on a realistic
  copy for the suspects. `EXPLAIN ANALYZE` executes the statement: wrap writes in `BEGIN; ... ROLLBACK;` and never run
  heavy analysis against production without approval.
- Pool: wait time to acquire, active vs idle, timeouts.
- Process: event loop delay (`perf_hooks.monitorEventLoopDelay`), CPU profile (`node --cpu-prof`, Clinic.js, 0x),
  heap snapshots for growth.
- Queue: wait time, job duration, concurrency, failures.

A good number on a 100-row table proves nothing about 10 M rows.

## 3. Fix the biggest cost first

Typical order: N+1 and per-row queries → missing or wrong index → selecting too much (columns, rows, counts) → deep
offsets → long transactions and lock waits → pool sizing against the real connection budget → event loop blocking →
payload size → unbounded concurrency and stacked retries. Cache only after the query is right, and with the rules in
`node-craft-arch` → `references/redis.md`.

## 4. Prove it

Same data, same load profile, same environment class, before and after: p50/p95/p99, throughput, error rate, query
count, DB time, pool wait. Write the result in the project's performance budget document. A test that counts queries
for the endpoint keeps an N+1 from returning.

## Report

The budget, the before and after numbers with the conditions, what changed, and what was not measured. A load test
that was not run is reported as not run.
