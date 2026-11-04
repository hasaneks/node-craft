# Sources (verified 2026-11-04)

Check these again before relying on a detail; providers change behaviour between versions.

| Topic | Observed on 2026-11-04 | Source |
|---|---|---|
| Foreign key indexes | Declaring a foreign key does not create an index on the referencing columns | https://www.postgresql.org/docs/current/ddl-constraints.html |
| Isolation | Read Committed is the default; Repeatable Read and Serializable callers must retry on serialization failures (SQLSTATE 40001) | https://www.postgresql.org/docs/current/transaction-iso.html |
| EXPLAIN ANALYZE | Executes the statement; wrap writes in `BEGIN` … `ROLLBACK`. PostgreSQL 18 includes buffers by default | https://www.postgresql.org/docs/current/using-explain.html |
| Fastify validation | JSON Schema with Ajv; response schemas serialize with fast-json-stringify; schemas are code, never user-provided | https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ |
| Fastify logging | Pino; `redact` option; a client-supplied request id header is not validated by Fastify | https://fastify.dev/docs/latest/Reference/Logging/ · https://fastify.dev/docs/latest/Reference/Server/ |
| Firebase ID tokens | `verifyIdToken` checks format, expiry and signature for the configured project; it does not check revocation unless `checkRevoked` is true (an extra network call). Admin SDK 14 needs Node 22+ and module entry points | https://firebase.google.com/docs/auth/admin/verify-id-tokens · https://firebase.google.com/docs/auth/admin/manage-sessions |
| BullMQ | 6.x; Redis 6.2 or newer; AOF persistence; `maxmemory-policy noeviction` is the only safe policy; workers use `maxRetriesPerRequest: null`; jobs are kept forever unless removal is set; job data is stored in clear text | https://docs.bullmq.io/guide/going-to-production |
| BullMQ ids and dedup | A duplicate `jobId` is ignored only while the job exists; after removal the same id is accepted again | https://docs.bullmq.io/guide/queues/auto-removal-of-jobs · https://docs.bullmq.io/guide/jobs/deduplication · https://docs.bullmq.io/patterns/idempotent-jobs |
| Redis on Railway private network | ioredis and BullMQ need `family: 0` to resolve IPv6 / dual-stack internal hosts | https://docs.railway.com/networking/private-networking/library-configuration |
| Adapty webhooks | Optional `Authorization` header value set in the dashboard per environment; retries up to 24 hours on errors or slow replies; dedupe on `profile_event_id`; events may arrive out of order | https://adapty.io/docs/set-up-webhook-integration · https://adapty.io/docs/webhook-event-types-and-fields |
| Adapty server API | Profile with access levels by customer user id; `Authorization: Api-Key <secret>` | https://adapty.io/docs/ss-authorization · https://adapty.io/docs/api-adapty/operations/getProfile |
| FCM | Payload limits and message types | https://firebase.google.com/docs/cloud-messaging/concept-options |
| OWASP | Password storage, SSRF prevention | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html |
