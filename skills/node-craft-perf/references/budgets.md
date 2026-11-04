# Performance budgets

Turn "it should be fast" into numbers during intake. For each number, say whether it is a **target** (agreed goal) or
a **measurement** (observed result), with the date and conditions.

| Area | Define |
|---|---|
| API latency | p95 and p99 per endpoint class, at a stated load |
| Database | Critical query time, queries per request, pool acquire wait, lock wait |
| Responses | Maximum page size, body size, file size |
| External services | Timeout, concurrency, retries, provider rate limit |
| Workers | Queue wait time, job duration, concurrency |
| Runtime | CPU, memory, event loop delay, restart behaviour |
| Operations | Normal load, peak load, acceptable error rate |

## Endpoint classes

Do not give every endpoint the same target.

| Class | Example | Example target (adjust per product) |
|---|---|---|
| Simple read by key | `GET /me`, `GET /orders/{id}` | p95 < 100 ms |
| List with filters | `GET /orders?status=` | p95 < 300 ms |
| Write with transaction | `POST /orders` | p95 < 400 ms |
| Report or export | `GET /reports/monthly` | Asynchronous job; API answers `202` fast |
| Provider-bound | `POST /payments` | Provider timeout + margin; idempotent |

The example targets above are placeholders for the conversation, not recommendations; record the project's own.

## Realistic conditions

- Data volume close to production in a year (row counts, distribution, large tenants).
- Concurrency at expected peak, plus a spike.
- Same instance class and region layout as production, or the difference stated.

## Record

`docs/performance.md`: budgets, the data and load used, results with dates, and the commit measured.
