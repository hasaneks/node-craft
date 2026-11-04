# node-craft rules

The rules the node-craft skills apply to a Node.js/TypeScript backend. Each rule has:

- **Rule:** what to do.
- **Why:** what goes wrong otherwise.
- **How:** the usual way to do it.
- **Verify:** how the rule is checked. One or more of:
  - `lint`: an existing ESLint or TypeScript check (node-craft ships no lint plugin);
  - `test`: an automated test, usually on real PostgreSQL;
  - `contract`: an OpenAPI or payload check;
  - `measurement`: a number under stated conditions;
  - `review`: a person or agent reads the change.
- **Exceptions:** when the rule does not apply.
- **Skill:** where the details live.

Most backend failures that matter (wrong transaction boundary, missing tenant filter, a non-idempotent retry, a
reordered webhook) cannot be proven from syntax. That is why most rules here are `test`, `contract` or `review`, and
why node-craft does not ship a lint plugin in this version.

A project's own `STACK.md`, ADRs and existing decisions win over these defaults.

- [Working method](#working-method)
- [Project setup](#project-setup)
- [Architecture](#architecture)
- [Data and consistency](#data-and-consistency)
- [Security](#security)
- [API contract](#api-contract)
- [Language](#language)
- [Async work and integrations](#async-work-and-integrations)
- [Performance](#performance)
- [Operations](#operations)

## Working method

### project-decides-first
**Rule:** Read `AGENTS.md`, `CLAUDE.md`, `STACK.md`, ADRs and the existing code before changing anything; keep the
project's framework, ORM, auth, package manager and layout.
**Why:** Silent migrations break clients, teams and deploys that depend on the current choices.
**How:** Propose bigger shifts as an ADR with status `proposed`; apply defaults only to code you are already changing.
**Verify:** `review` of the diff for unrequested framework, ORM, auth or package manager changes.
**Exceptions:** The user explicitly asked for the migration.
**Skill:** `node-craft` → `references/existing-project.md`

### tdd-red-green-refactor
**Rule:** Every new behaviour and bug fix starts with a test that fails for the right reason, then the smallest
correct code, then refactoring with the tests green.
**Why:** Tests written after the code tend to confirm what the code does, not what it should do.
**How:** State the behaviour; write the test; see it fail on the assertion; implement; run related tests; refactor.
**Verify:** `test`, plus `review` of the reported Red and Green runs.
**Exceptions:** Constants, configuration lines and simple delegation without behaviour.
**Skill:** `node-craft` → `references/workflow-tdd.md`

### keep-existing-tests
**Rule:** Never delete or weaken assertions, skip tests, bulk-update snapshots, replace integration tests with mocks or
lower thresholds to get green.
**Why:** It turns a detected regression into a hidden one.
**How:** Change a test only for an approved behaviour change or a test that was wrong, and say which and why.
**Verify:** `review` of every test file in the diff.
**Exceptions:** None for the listed shortcuts.
**Skill:** `node-craft-fix` → `references/test-preservation.md`

### honest-report
**Rule:** Report only checks that were run, with their results; name what was not run and why.
**Why:** A claimed but unrun test, deploy or measurement leads others to ship broken work.
**How:** End each task with changes, commands run and results, and remaining blockers.
**Verify:** `review` of the final report against the session's command history.
**Exceptions:** None.
**Skill:** `node-craft` → `references/done-criteria.md`

### no-invented-facts
**Rule:** Do not invent business rules, endpoints, accounts, provider credentials or finished integrations; mark test
doubles as such.
**Why:** Invented details look real and get shipped.
**How:** Ask about gaps that change architecture or behaviour; record other assumptions in the intake.
**Verify:** `review`.
**Exceptions:** Clearly labelled examples in documentation.
**Skill:** `node-craft-init` → `references/intake.md`

## Project setup

### active-lts-node
**Rule:** New projects use the current Active LTS Node.js at its latest patch, verified on the day, pinned in project
metadata, CI and the deploy build.
**Why:** Current lines change fast and leave support; mismatched versions break builds.
**How:** Check the official release page; set `engines`, `.nvmrc`, CI `node-version-file` and the Railway build.
**Verify:** `review` of `package.json`, `.nvmrc` and CI config.
**Exceptions:** A dependency that does not yet support the new line; stay on the previous LTS and record why.
**Skill:** `node-craft-init` → `references/toolchain.md`

### pinned-yarn-one-lockfile
**Rule:** Yarn pinned per project with `packageManager`, one lockfile, `yarn install --immutable` in CI.
**Why:** Different package managers and floating versions give different dependency trees.
**How:** `yarn set version`, commit `yarn.lock`, remove other lockfiles in new projects.
**Verify:** `test` in CI (immutable install fails on drift).
**Exceptions:** Existing projects keep their package manager.
**Skill:** `node-craft-init` → `references/toolchain.md`

### strict-typescript
**Rule:** `strict` TypeScript, type-aware ESLint, no unexplained `any`, non-null assertions, casts or suppressions.
**Why:** Loose types hide null and shape errors until runtime.
**How:** `tsc --noEmit` and `typescript-eslint` `recommendedTypeChecked` with `no-floating-promises`,
`no-misused-promises`, `no-non-null-assertion`, `switch-exhaustiveness-check`.
**Verify:** `lint` with the typescript-eslint rules named above, and `tsc`.
**Exceptions:** A suppression with a reason on the same line.
**Skill:** `node-craft-init` → `references/toolchain.md`

### framework-from-intake
**Rule:** Choose Fastify or NestJS with the Fastify adapter from the product, record an ADR, never Express in a new
project.
**Why:** The framework shapes every module; a benchmark-only or default choice fits the product badly.
**How:** Use the profiles in the framework reference; ADR with need, options, decision, reasons, revisit condition.
**Verify:** `review` of the ADR.
**Exceptions:** Existing projects keep their framework and adapter.
**Skill:** `node-craft-init` → `references/framework-choice.md`

### one-data-access-approach
**Rule:** PostgreSQL with one main data access approach (Prisma or Drizzle) chosen from the workload, raw SQL only in a
narrow, typed, tested boundary.
**Why:** Mixed ORMs split transactions, types and migrations.
**How:** ADR from the ORM reference; check migration, transaction and pool behaviour in the installed version.
**Verify:** `review`.
**Exceptions:** Existing projects keep their data layer.
**Skill:** `node-craft-init` → `references/orm-choice.md`

### validated-config
**Rule:** Parse and validate configuration once at startup; refuse to start on missing or invalid values; secrets only
in the environment.
**Why:** A typo in a variable otherwise fails later, in production, in a confusing way.
**How:** A schema (Zod, TypeBox, env-schema); `.env.example` with safe samples; names but never values in errors.
**Verify:** `test` that startup fails with a clear message on a missing variable.
**Exceptions:** None.
**Skill:** `node-craft-init` → `references/environments-config.md`

### build-app-without-listen
**Rule:** Building the app and listening on a port are separate, so tests create the app without a port.
**Why:** Tests that open ports are slow, flaky and leak handles.
**How:** `buildApp()` in `app.ts`, `listen()` in `server.ts`; tests use `inject` or the framework's testing module.
**Verify:** `review` of the entry points; `test` suites run without `listen`.
**Exceptions:** End-to-end tests against a deployed environment.
**Skill:** `node-craft-init` → `references/structure.md`

## Architecture

### feature-modules
**Rule:** Feature modules with HTTP, application, domain and infrastructure layers; routes hold no business rules;
domain imports no framework; modules do not touch each other's tables.
**Why:** Rules scattered across routes, workers and webhooks drift apart.
**How:** One use case per action, called from every entry point; dependency injection at real seams only.
**Verify:** `review`.
**Exceptions:** Tiny services may merge layers inside a module if the boundaries stay clear.
**Skill:** `node-craft-arch` → `references/modules-solid.md`

### need-before-infrastructure
**Rule:** Redis, BullMQ, outbox, Firebase, FCM, Adapty, object storage and tracing are added only for a product need or
a measured problem, with an ADR.
**Why:** Unneeded services add cost, failure modes and setup burden for people who only need an API.
**How:** Record the need and what happens if the service is lost.
**Verify:** `review` of new dependencies against the intake and ADRs.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/redis.md`

### real-postgres-tests
**Rule:** Queries, constraints, transactions, migrations and concurrency are tested on real PostgreSQL, isolated from
any shared database.
**Why:** SQLite and mocks do not behave like PostgreSQL for constraints, isolation and `ON CONFLICT`.
**How:** Testcontainers or a disposable service container; a guard against non-test database URLs.
**Verify:** `test`.
**Exceptions:** Pure unit tests of domain logic.
**Skill:** `node-craft-arch` → `references/modules-solid.md`

## Data and consistency

### constraints-in-database
**Rule:** Integrity rules live in `NOT NULL`, `UNIQUE`, `FOREIGN KEY` and `CHECK` constraints, tenant-aware where
tenants exist.
**Why:** Application validation is bypassed by races, scripts and other code paths.
**How:** Constraints in migrations; handle violations as domain results.
**Verify:** `test` that violating writes fail.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/postgres-model.md`

### exact-money-and-time
**Rule:** Money as `numeric` or integer minor units with a currency, large integers as strings in JSON, instants as
`timestamptz` and ISO 8601, calendar dates as `date`.
**Why:** Floats lose cents; JavaScript numbers lose precision past 2^53; time zones shift dates.
**How:** Column types and response schemas as in the data model reference.
**Verify:** `contract` (OpenAPI types and formats) and `test` round-trips.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/postgres-model.md`

### unique-not-check-then-insert
**Rule:** Prevent duplicates and lost updates with constraints, atomic updates, version columns or row locks, not with
a read followed by a write.
**Why:** Two concurrent requests both pass the check.
**How:** `ON CONFLICT`, `UPDATE ... WHERE qty >= $1`, `WHERE version = $n`, `FOR UPDATE`.
**Verify:** `test` with concurrent requests.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/transactions-idempotency.md`

### short-transactions
**Rule:** Transactions are short and hold only database work; no provider calls, emails or uploads inside.
**Why:** Long transactions hold locks and connections and tie two systems' failures together.
**How:** Commit, then do side effects through the outbox.
**Verify:** `review`; `measurement` of transaction duration and lock waits.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/transactions-idempotency.md`

### idempotent-critical-writes
**Rule:** Writes whose repetition would duplicate an order, charge, entitlement or message accept an
`Idempotency-Key`, stored in PostgreSQL scoped by user, tenant and operation, with a payload fingerprint.
**Why:** Mobile networks and retries repeat requests; memory checks and queue job ids forget.
**How:** Key row and business write in one transaction; replay on match; 409 on a different payload.
**Verify:** `test` for repeat, concurrent repeat and different payload; `contract` for the header and 409.
**Exceptions:** Naturally idempotent writes (`PUT` of a full state).
**Skill:** `node-craft-arch` → `references/transactions-idempotency.md`

### reviewed-migrations
**Rule:** Every schema change is a versioned, reviewed migration that works with the previous code version; risky
changes go expand, migrate, switch, contract.
**Why:** Old code and old clients run during and after deploys; schema rollbacks are slow or impossible.
**How:** Test on empty and previous schemas; `CONCURRENTLY` and `NOT VALID` on large tables; `lock_timeout`.
**Verify:** `test` in CI on both schemas; `review` of lock impact.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/migrations.md`

## Security

### verified-identity
**Rule:** Identity comes from a verified token (Firebase Admin `verifyIdToken` when Firebase Auth is used); body or
header fields like `userId`, `role`, `tenantId` or `isPremium` grant nothing.
**Why:** Clients can send anything.
**How:** Verify per request; map provider uid to the backend user; check revocation on risky actions.
**Verify:** `test` with forged body fields and invalid tokens.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/auth.md`

### resource-authorization
**Rule:** Every protected endpoint checks that this user may do this action on this resource in this tenant, in the
query itself.
**Why:** Authentication alone lets any user read any id they can guess.
**How:** `WHERE id = $1 AND owner_id = $2 AND tenant_id = $3`; policies for complex rules; consistent 403/404 policy.
**Verify:** `test` with another user's and another tenant's ids.
**Exceptions:** Public resources, documented as such.
**Skill:** `node-craft-arch` → `references/auth.md`

### bounded-input
**Rule:** Limit body, header, URL, array, string, file and batch sizes; reject unknown fields; allowlist sort and
filter fields.
**Why:** Unbounded input exhausts memory and CPU; unknown fields cause mass assignment.
**How:** Schema limits, `bodyLimit`, `additionalProperties: false`, field maps. In Fastify also set Ajv
`removeAdditional: false`; its default strips unknown fields silently instead of rejecting them.
**Verify:** `test` for oversized and unknown input; `contract` for limits in OpenAPI.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/security.md`

### redact-secrets
**Rule:** Logs, errors, telemetry, jobs and push payloads carry no secrets and no personal data beyond the need.
**Why:** Logs and payloads are copied to many systems and kept for a long time.
**How:** Central Pino redaction; generic error messages; ids instead of content in payloads.
**Verify:** `test` that an error response and a log line contain no token or SQL; `review` of payloads.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/observability.md`

### shared-rate-limits
**Rule:** Login, token, OTP, search, upload and expensive endpoints are rate limited by user, tenant and cost as well
as IP, with a shared store when there are several replicas.
**Why:** A per-process limit multiplies with replicas; IP-only limits miss abuse behind shared addresses.
**How:** `@fastify/rate-limit` with Redis when global; 429 with `Retry-After`.
**Verify:** `test` for 429 and `Retry-After`.
**Exceptions:** Internal-only endpoints behind other controls.
**Skill:** `node-craft-arch` → `references/security.md`

## API contract

### one-schema-source
**Rule:** OpenAPI and runtime validation come from one schema source, regenerated and checked in CI.
**Why:** Two hand-maintained sources drift; types alone do not validate data.
**How:** Code-first (TypeBox + `@fastify/swagger`, Nest DTOs + swagger) or schema-first with generated validators.
**Verify:** `contract` (generated spec equals committed spec).
**Exceptions:** None.
**Skill:** `node-craft-contract` → `references/openapi-validation.md`

### no-entity-responses
**Rule:** Responses are declared schemas; ORM entities are never serialized directly.
**Why:** New columns (password hashes, internal flags) leak to clients.
**How:** Response schemas per status; explicit mapping.
**Verify:** `contract` and `test` asserting the exact field set.
**Exceptions:** None.
**Skill:** `node-craft-contract` → `references/openapi-validation.md`

### error-envelope
**Rule:** Errors use the right HTTP status and `{ error: { code, message, details? }, locale, requestId }`, with stable
codes and localized messages; no `200` with `success: false`; no internal details.
**Why:** Clients need machine codes and field paths; users need safe messages in their language.
**How:** One error handler and one code registry.
**Verify:** `test` per status; `contract` for the shared error schema.
**Exceptions:** An existing project's established error format, extended compatibly.
**Skill:** `node-craft-contract` → `references/errors.md`

### conflict-vs-rate-limit
**Rule:** 409 means the state does not allow the request; 429 means slow down (with `Retry-After`); 503 means a
temporary outage; none of them invites blind write retries.
**Why:** Mixing them makes clients retry what cannot succeed or give up on what would.
**How:** Central status mapping; documented retry semantics. The one retryable 409 is `IDEMPOTENCY_IN_PROGRESS`,
which carries `Retry-After` and is retried with the same key.
**Verify:** `contract` and `test`.
**Exceptions:** None.
**Skill:** `node-craft-contract` → `references/errors.md`

### cursor-pagination
**Rule:** Lists are bounded (default 20, max 100) and growing lists use a validated cursor with a unique tie-breaker.
**Why:** Unbounded lists and deep offsets do not scale; unstable sorts skip or repeat rows.
**How:** Keyset query on `(created_at, id)`, `limit + 1` for `hasMore`, signed opaque cursor.
**Verify:** `test` paging through all rows with no duplicates; `contract` for `meta`.
**Exceptions:** Small bounded admin tables with offset and a cap.
**Skill:** `node-craft-contract` → `references/pagination.md`

### backward-compatible
**Rule:** Old clients in the support window keep working; breaking changes go through add, migrate clients, remove.
**Why:** Mobile users do not update immediately.
**How:** OpenAPI diff against the previous release in CI; recorded old-client responses in tests.
**Verify:** `contract`.
**Exceptions:** Security fixes that must break, announced with a minimum version.
**Skill:** `node-craft-contract` → `references/versioning.md`

## Language

### locale-resolution-order
**Rule:** Resolve the locale from a supported `X-App-Locale`, then the verified profile, then `Accept-Language` by
quality, then the fallback (`en`); skip unsupported candidates.
**Why:** A single unsupported header should not throw a Turkish user back to English.
**How:** One resolver before validation; `Content-Language` and `Vary` on responses.
**Verify:** `test` for each step, regional variants and anonymous requests.
**Exceptions:** A project that documents a different order.
**Skill:** `node-craft-contract` → `references/locale-contract.md`

### backend-catalogs
**Rule:** Backend text comes from backend catalogs; codes never change with language; a missing key in a supported
locale yields the generic message in that locale and is caught in CI.
**Why:** Hard-coded or raw provider text reaches users in the wrong language.
**How:** One i18n library and resolver; catalog completeness check in CI.
**Verify:** `test` (catalog completeness, missing key fallback).
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/i18n.md`

### recipient-locale-async
**Rule:** Push and email use the recipient's current locale and preferences at send time; jobs carry template keys and
parameters, not pre-rendered text.
**Why:** The sender's or server's language is not the recipient's, and preferences change before the job runs.
**How:** Versioned templates; resolve in the handler.
**Verify:** `test` changing the locale before a queued notification runs.
**Exceptions:** A deliberate locale snapshot recorded as a product decision.
**Skill:** `node-craft-arch` → `references/notifications.md`

## Async work and integrations

### idempotent-jobs
**Rule:** Job handlers are idempotent at the database or provider level; queue job ids and deduplication are not the
only guard.
**Why:** Queues deliver at least once; removed jobs no longer deduplicate.
**How:** Unique business keys or provider idempotency keys; bounded retries with backoff; visible failed jobs.
**Verify:** `test` running the same job twice with real Redis and BullMQ.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/queues-workers.md`

### transactional-outbox
**Rule:** When a database change and its side effect must not be lost apart, write an outbox row in the same
transaction and dispatch it with at-least-once delivery.
**Why:** PostgreSQL commit and Redis enqueue are not atomic.
**How:** `SKIP LOCKED` claim with a lease, send outside the transaction, mark, consumers dedupe by message id.
**Verify:** `test` that rollback removes both and that concurrent dispatchers send each message once.
**Exceptions:** Side effects that can be lost or recomputed.
**Skill:** `node-craft-arch` → `references/outbox.md`

### verified-ordered-webhooks
**Rule:** Authenticate webhooks by the provider's documented method, store by event id with a unique constraint,
acknowledge fast, and never let an older event overwrite newer state.
**Why:** Webhooks are retried, duplicated, delayed and reordered.
**How:** Raw-body signature or configured authorization header; `UNIQUE (provider, event_id)`; compare event time per
subject; reconcile with the provider's API.
**Verify:** `test` with duplicate and out-of-order events.
**Exceptions:** None.
**Skill:** `node-craft-arch` → `references/webhooks-adapty.md`

### server-side-entitlements
**Rule:** Premium access comes from trusted provider data (webhooks, server API) stored in the backend, never from a
client flag.
**Why:** `isPremium: true` from a client is free premium for anyone.
**How:** Entitlements table updated by events and reconciliation; the backend user id as the provider's customer id.
**Verify:** `test` that a client flag grants nothing and a refund removes access.
**Exceptions:** Products without paid access.
**Skill:** `node-craft-arch` → `references/webhooks-adapty.md`

### push-token-lifecycle
**Rule:** Device tokens are bound to the verified user, re-bound on account switch, removed on sign-out and when the
provider reports them invalid; push bodies carry no sensitive data.
**Why:** Otherwise the previous account's notifications reach the next person on the device.
**How:** Unique installation and token; upsert re-binds; check the binding at send time.
**Verify:** `test` for account switch and sign-out.
**Exceptions:** Products without push.
**Skill:** `node-craft-arch` → `references/notifications.md`

### private-files
**Rule:** Uploaded files have an owner and access policy, are uploaded through short-lived authorized URLs, checked on
completion by content, and downloaded only after an authorization check.
**Why:** Container disks are ephemeral and public URLs leak private files.
**How:** Object storage, server-generated keys, presigned PUT and GET, cleanup of incomplete uploads.
**Verify:** `test` for another user's download and a wrong content type.
**Exceptions:** Public assets by design.
**Skill:** `node-craft-arch` → `references/media.md`

## Performance

### budgets-before-optimizing
**Rule:** Define budgets per endpoint class and measure before and after any optimization under the same data and load.
**Why:** Without numbers, optimizations add complexity and may not help.
**How:** p95/p99, query count and time, pool wait, event loop delay; record in the performance document.
**Verify:** `measurement`.
**Exceptions:** None.
**Skill:** `node-craft-perf` → `references/budgets.md`

### no-n-plus-one
**Rule:** No per-row queries in loops or relation loading; query count per request is bounded and tested.
**Why:** Query count grows with data and pools run dry.
**How:** Joins, batched `ANY($1)` lookups, ORM includes.
**Verify:** `test` asserting query count; `measurement` with realistic data.
**Exceptions:** None.
**Skill:** `node-craft-perf` → `references/queries-pool.md`

### connection-budget
**Rule:** One pool per process, sized so all API, worker, migration and operations connections fit the database
limit with headroom; timeouts set and documented.
**Why:** Replicas multiply pools until the database refuses connections.
**How:** Budget formula; `statement_timeout`, `lock_timeout`, acquire timeout.
**Verify:** `review` of the budget; `measurement` of pool wait under load.
**Exceptions:** None.
**Skill:** `node-craft-perf` → `references/queries-pool.md`

### free-event-loop
**Rule:** No synchronous I/O or heavy CPU work on request paths; fan-out and retries are bounded.
**Why:** One blocked loop delays every request on the process.
**How:** Worker threads or the worker process for CPU work; `p-limit`; one retry layer; timeouts on every call.
**Verify:** `review`; `measurement` of event loop delay.
**Exceptions:** Startup code and build scripts may use sync I/O.
**Skill:** `node-craft-perf` → `references/event-loop.md`

## Operations

### migrate-once-in-pre-deploy
**Rule:** Migrations run once per release in the pre-deploy step with a lock; a failure stops the release; build never
migrates.
**Why:** Replicas racing to migrate, or new code receiving traffic on a failed schema, corrupt releases.
**How:** Railway pre-deploy command on one service; migration tool lock.
**Verify:** `review` of deploy configuration; staging run.
**Exceptions:** None.
**Skill:** `node-craft-ops` → `references/railway.md`

### honest-health-checks
**Rule:** Separate liveness and readiness; readiness checks required dependencies with timeouts; responses reveal
nothing internal; never faked to pass a deploy.
**Why:** Liveness tied to the database restarts every replica during a blip; fake success sends traffic to broken code.
**How:** `/health/live` without dependencies, `/health/ready` with `SELECT 1` and the shutdown flag.
**Verify:** `test` for ready and unready states.
**Exceptions:** None.
**Skill:** `node-craft-ops` → `references/health-shutdown.md`

### graceful-shutdown
**Rule:** On `SIGTERM`, stop accepting work, finish in-flight requests and jobs within a bound shorter than the
platform's draining time, close connections, exit.
**Why:** Deploys otherwise cut requests and jobs in half.
**How:** `app.close()`, `worker.close()`, `pool.end()`, a timer that forces exit.
**Verify:** `test` that an interrupted job is retried safely.
**Exceptions:** None.
**Skill:** `node-craft-ops` → `references/health-shutdown.md`

### ci-gates
**Rule:** CI runs immutable install, format, lint, typecheck, unit, integration on real PostgreSQL, contract and
migration checks, build and scans; no gate is bypassed.
**Why:** A gate that can be skipped is not a gate.
**How:** The gate list in the CI reference.
**Verify:** `review` of the CI workflow; `test` (the pipeline itself).
**Exceptions:** Gates for technologies the project does not use.
**Skill:** `node-craft-ops` → `references/ci-gates.md`

### tested-restores
**Rule:** RPO and RTO are defined, backups match them, and restores are tested in isolation on a schedule.
**Why:** An untested backup fails when it is needed.
**How:** Platform backups plus logical dumps when needed; recorded restore tests.
**Verify:** `review` of restore test records.
**Exceptions:** None.
**Skill:** `node-craft-ops` → `references/backup-restore.md`
