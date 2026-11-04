---
name: node-craft-arch
description: "Architecture and integration rules for what sits behind a Node.js/TypeScript API: feature modules and SOLID boundaries, PostgreSQL data model and constraints, transactions, concurrency and idempotent writes, migrations (expand/contract, backfill), Firebase ID token auth and resource/tenant authorization, API security (limits, CORS, proxies, rate limits, SSRF, redaction, audit), backend i18n catalogs, Redis caching, BullMQ workers, transactional outbox, push and email in the recipient's language, webhooks and Adapty entitlements, file uploads, logging and audit. Use when building or reviewing any of these in a backend, or deciding whether Redis, a queue or an outbox is needed. Not for HTTP contract shape (node-craft-contract) or deployment (node-craft-ops)."
---

# Build what is behind the API

Follow `node-craft` for the working rules: the project's own decisions win, TDD for every behaviour, done means the
whole checklist. Open the reference for the area you touch before writing code:

| Area | Read |
|---|---|
| Modules, layers, dependencies, test layers | `references/modules-solid.md` |
| Tables, constraints, ids, money, time, deletes, indexes | `references/postgres-model.md` |
| Transactions, locking, races, idempotent writes | `references/transactions-idempotency.md` |
| Schema changes, backfills, release order | `references/migrations.md` |
| Token verification, user mapping, roles, tenants, sessions | `references/auth.md` |
| Input limits, CORS, proxies, rate limits, SSRF, redaction, audit, privacy | `references/security.md` |
| Backend translations, locale storage, formatting | `references/i18n.md` |
| Whether and how to cache in Redis | `references/redis.md` |
| Background jobs, retries, schedulers, workers | `references/queues-workers.md` |
| DB change + side effect that must not be lost | `references/outbox.md` |
| Push, email, device tokens, deep links | `references/notifications.md` |
| Provider adapters, webhooks, Adapty subscriptions | `references/webhooks-adapty.md` |
| Uploads, downloads, object storage | `references/media.md` |
| Logs, request ids, metrics, tracing, audit records | `references/observability.md` |
| Official docs, verified dates | `references/sources.md` |

## Rules that apply everywhere

- **Need first.** Redis, BullMQ, outbox, Firebase, FCM, Adapty, object storage and tracing are added for a product
  need or a measured problem, recorded in an ADR. A plain CRUD API needs none of them. Decide per flow, not per
  project: even when an outbox exists, only the side effects that must not be lost go through it.
- **PostgreSQL is the source of truth.** Integrity lives in constraints, not only in validation. Redis, queues and
  caches can be lost; define what happens when they are.
- **Use cases own workflows.** Routes, workers and webhooks call the same use case. The use case owns the
  transaction boundary.
- **Identity from a verified token; permission per resource.** Authentication answers who; authorization checks
  this user may do this action on this resource in this tenant. Body fields never grant access.
- **Retries happen.** Every handler that can run twice (HTTP retry, job retry, webhook redelivery, outbox
  redispatch) is idempotent at the database or provider level, not by an in-memory check or a queue job id alone.
- **No long work inside a transaction.** No provider call, email, file upload or user wait while a DB transaction is
  open.
- **Bounded everything:** request sizes, page sizes, concurrency, retries, timeouts, queue retention, `Promise.all`
  fan-out.
- **Private by default:** no secrets or unneeded personal data in logs, errors, jobs, events or push payloads.

## Test what can break

Integration tests on real PostgreSQL for constraints, transactions, concurrency and migrations; real Redis and
BullMQ when used. No SQLite or mock repository stand-in for PostgreSQL behaviour. The scenarios that must have a test
or a recorded check when the feature exists:

| Scenario | Expected |
|---|---|
| Another user's or tenant's resource id | Access denied, nothing leaked (status, timing of existence policy) |
| Same record created concurrently | Unique rule holds; no uncontrolled duplicate |
| Same idempotency key repeated | Effect not repeated; the defined result returned |
| Same key, different payload | Documented conflict |
| Failure mid-transaction | All related writes rolled back |
| Duplicate or out-of-order webhook | Access and data not wrongly re-applied or reverted |
| Job redelivered after processing | Idempotency holds within provider limits |
| Redis down | Defined behaviour per use: cache bypass, queue, auth or quota protection |
| PostgreSQL slow | Timeouts and pool limits; no unbounded waiting or pile-up |
| Push after sign-out or account switch | No notification through the old account-token link |
| Locale changed before a queued notification | The recipient's current language (or the recorded policy) |
