# Background jobs and workers (BullMQ)

Use a queue when the product has work that is slow, retryable or must survive a request: email, push, reports, media
processing, provider sync. A project without such work does not need one.

## Redis for BullMQ

Confirm from the installed BullMQ version's docs: the minimum Redis version, persistence (AOF) settings, and
`maxmemory-policy noeviction`. A cache's eviction policy applied to the queue loses jobs silently.

## Delivery is at least once

- A queue is not exactly-once. A job can run twice (stalled job, crash after work before completion, retry).
- Every handler is idempotent: running it twice creates no second email, entitlement or row. Guard with a database
  record (unique on `(job_type, business_key)`) or the provider's idempotency key.
- `jobId` and BullMQ deduplication only dedupe while the job is remembered. After removal they no longer protect.
  Critical uniqueness lives in PostgreSQL or the provider.
- State the provider's limits honestly: if an email API has no idempotency key, a timeout after send can still
  duplicate; record that residual risk.

## Retries and failures

- Per queue: attempts, exponential backoff with jitter, and which errors are permanent (validation, 4xx from a
  provider, missing record) and go straight to failed with `UnrecoverableError`.
- Failed jobs are visible: a dashboard or admin endpoint, an alert on count or age, an inspection path, and a
  controlled retry. Not just a log line.
- Retention: `removeOnComplete` and `removeOnFail` with an age or count, so Redis does not grow forever.

## Capacity

- Concurrency per queue is set together with the DB pool, provider rate limits and CPU. Ten workers × concurrency 20
  against a pool of 10 connections is a queue of database waits.
- Use the queue's rate limiter for provider limits. No unbounded `Promise.all` over thousands of items; batch with a
  concurrency limit (`p-limit` or chunks).
- CPU-heavy work (image transforms, PDF rendering, large parsing) never runs on the API event loop. Use the worker
  process, `worker_threads`, or a dedicated service.

## Payloads

- Small and versioned: ids and parameters, `{ v: 2, userId, templateKey, params }`. Load fresh data in the handler.
- No secrets, no tokens, no personal data that is not needed.
- New workers read old payloads during a deploy. Add fields compatibly; for an incompatible change, a new version
  with a handler for both until old jobs drain.

## Process lifecycle

- Separate worker entry (`yarn start:worker`), same image as the API when that is simpler; scaled as its own Railway
  service.
- Graceful shutdown: on `SIGTERM`, `worker.close()` (stop taking jobs, let active ones finish within the platform's
  grace period), then close Redis and the DB pool. Test that a job interrupted by shutdown is safely retried.
- Stalled job settings match the real job length; long jobs report progress or extend their lock.

## Scheduled work

No `setInterval` or in-process cron for critical schedules: every replica would run it, and a restart loses it. Use
BullMQ job schedulers (repeatable jobs) or an external scheduler, plus idempotency for the period (`UNIQUE (job,
period_start)`). Check that the platform does not sleep or scale the worker to zero while schedules must fire.
