# Modules, SOLID and test layers

## Modules

- Group code by feature or domain (`modules/orders`, `modules/accounts`), not by technical type (one global
  `controllers/`, `services/`, `repositories/`).
- Inside a module: routes/controllers (HTTP only) → application use cases (workflow, transaction owner) → domain
  (rules, state transitions) → infrastructure (DB queries, provider adapters).
- Routes do not hold business rules or heavy queries. A route validates, calls one use case, maps the result.
- Domain code imports no framework. Domain errors (`OrderNotCancellable`) are plain classes with a stable code;
  one error handler maps them to HTTP (`node-craft-contract` → `references/errors.md`).
- One module never reads or writes another module's tables directly. It calls that module's use case or a published
  query function. Shared reference data (countries, currencies) can live in a shared read module.
- A cross-module workflow that needs one transaction has one named owner: the use case that opens it and passes the
  transaction handle to the functions it calls.
- The same rule is implemented once. Route, worker, webhook and admin action call the same use case.

## SOLID where it pays

- **Single responsibility:** split classes that collect unrelated work (`UserService` with billing, email and
  avatars). A use case per action is a good default.
- **Dependency inversion at real seams:** database, providers, clock, id generation, randomness, file storage. Inject
  them (constructor, factory argument, Fastify decorator, Nest provider) so tests replace them.
- **No ceremony:** no empty interfaces, abstract base classes or "repository per table" without a second
  implementation or a test seam to justify it.
- **No cycles:** module A importing B importing A is a boundary mistake; move the shared part down or invert it.
- **Types are honest:** no gratuitous `any`, `!` or `as`; a lint suppression carries a reason on the same line.

## Test layers

| Layer | What it proves | Infrastructure |
|---|---|---|
| Unit | Business rules, decisions, state transitions, locale resolution, error mapping | None |
| Integration | Queries, constraints, transactions, migrations | Real PostgreSQL (container) |
| API / E2E | Auth, authorization, validation, HTTP contract, critical flows | App built in-process with `inject`, real DB |
| Worker | Retry, duplicate job, idempotency, failure, restart | Real Redis + BullMQ when used |
| Contract | OpenAPI, old client expectations, provider payload mapping | Spec + recorded payloads |
| Performance | Critical endpoints and queries against budgets | Realistic data volume |

- No SQLite or in-memory fake for PostgreSQL behaviour (constraints, isolation, `jsonb`, `ON CONFLICT`).
- Isolate the test database: Testcontainers or a disposable Compose service; a guard refuses non-test URLs.
- Parallel tests use a database or schema per worker, or unique tenant and user per test.
- API and worker use different connections; one wrapping test transaction does not roll back both.
- Clock, randomness and network are controllable. Wait for conditions with a deadline, not fixed sleeps.
- Unit tests fake external services; integrations are checked against sandboxes or recorded contracts.
- Every test closes its pools, clients, workers and timers. No `forceExit` to hide leaks.
- Coverage is not the goal. Authorization, data integrity and error paths are tested no matter what the number says;
  agreed thresholds are not lowered.
- After a change: run the module's tests; if shared code changed, the affected modules; before merge, the defined CI
  suite.
