# Requirements coverage

How each of the 34 sections of the backend requirements that shaped node-craft is covered: where the rule lives, how
it is verified, and which eval scenarios (`evals/scenarios/E01`–`E13`) or tested fixture code
(`fixtures/contract-kit`) exercise it. The requirements text itself is not part of this repository; sections are
referenced by number and title.

Rules marked **conditional** apply only when the product has the feature (Firebase, Adapty, FCM, Redis, BullMQ,
files, outbox). They never turn into a required service.

Verification kinds: `lint` (existing ESLint/TypeScript rules), `test`, `contract`, `measurement`, `review`
(see [RULES.md](../RULES.md)). `integrity` in the evidence column means the repository's own `npm test` checks the
structure (links, frontmatter, coverage rows); it does not prove backend behaviour.

| # | Section | Where | Verify | Evidence |
|---|---|---|---|---|
| 1 | Project analysis and scope | [init: intake](../skills/node-craft-init/references/intake.md#product-intake) · [core: project decides first](../skills/node-craft/SKILL.md#0-the-project-decides-first) | `review` | E01, E02, E03 |
| 2 | Core technology policy | [init: decide, then record](../skills/node-craft-init/SKILL.md#3-decide-then-record) · [init: toolchain](../skills/node-craft-init/references/toolchain.md#toolchain) · [init: sources](../skills/node-craft-init/references/sources.md#sources-verified-2026-11-04) | `review`, `lint` | E01, E02 |
| 3 | Fastify or NestJS | [init: framework choice](../skills/node-craft-init/references/framework-choice.md#profiles) · [init: ADR template](../skills/node-craft-init/references/adr-template.md#adr-template) | `review` | E01, E02, E03 |
| 4 | SOLID and module boundaries | [arch: modules](../skills/node-craft-arch/references/modules-solid.md#modules) · [init: structure](../skills/node-craft-init/references/structure.md#boundaries) | `review`, `lint` | E02, E03 |
| 5 | Project setup and tooling | [init: set up](../skills/node-craft-init/SKILL.md#4-set-up) · [init: scripts](../skills/node-craft-init/references/toolchain.md#scripts) · [init: config schema](../skills/node-craft-init/references/environments-config.md#config-schema) | `review`, `test`, `lint` | E01; contract-kit `buildApp` without `listen` |
| 6 | Mandatory TDD and protecting existing tests | [core: TDD](../skills/node-craft/references/workflow-tdd.md#the-loop) · [core: existing tests](../skills/node-craft/references/workflow-tdd.md#existing-tests-are-evidence) · [fix: test preservation](../skills/node-craft-fix/references/test-preservation.md#when-a-test-may-change) | `review`, `test` | E01, E03; contract-kit built Red → Green (see [validation](validation.md)) |
| 7 | Test strategy and isolation | [arch: test layers](../skills/node-craft-arch/references/modules-solid.md#test-layers) · [core: test hygiene](../skills/node-craft/references/workflow-tdd.md#test-hygiene) | `test` | contract-kit integration tests on Testcontainers PostgreSQL |
| 8 | API contract and validation | [contract: OpenAPI and validation](../skills/node-craft-contract/references/openapi-validation.md#validation) · [contract: pagination](../skills/node-craft-contract/references/pagination.md#limits) | `contract`, `test` | E04, E12; contract-kit `api.int.test.ts` (unknown fields, limits, cursor) |
| 9 | Error model | [contract: errors](../skills/node-craft-contract/references/errors.md#wire-format) · [contract: status mapping](../skills/node-craft-contract/references/errors.md#status-mapping-one-central-place) | `contract`, `test` | E04, E06; contract-kit `errors.unit.test.ts` |
| 10 | Backend i18n | [arch: i18n](../skills/node-craft-arch/references/i18n.md#catalogs) · [contract: locale](../skills/node-craft-contract/references/locale-contract.md#resolution-order) | `test` | E06; contract-kit `locale.unit.test.ts`, catalog completeness test |
| 11 | Authentication and authorization | [arch: auth](../skills/node-craft-arch/references/auth.md#verifying-identity) · [arch: authorization](../skills/node-craft-arch/references/auth.md#authorization) · [contract: auth outcomes](../skills/node-craft-contract/references/auth-session-contract.md#outcomes) | `test`, `review` | E05, E08; contract-kit cross-user and cross-tenant 404 test |
| 12 | API security and data protection | [arch: security](../skills/node-craft-arch/references/security.md#input) · [arch: rate limits](../skills/node-craft-arch/references/security.md#rate-limits) · [arch: SSRF](../skills/node-craft-arch/references/security.md#outbound-requests-ssrf) | `test`, `review` | E08; contract-kit no-leak error test |
| 13 | PostgreSQL data model | [arch: integrity](../skills/node-craft-arch/references/postgres-model.md#integrity-in-the-database) · [arch: types](../skills/node-craft-arch/references/postgres-model.md#types) | `test`, `review` | E07, E12; contract-kit `CHECK` rollback test |
| 14 | ORM and data access | [init: ORM choice](../skills/node-craft-init/references/orm-choice.md#rules) | `review` | E01, E03 |
| 15 | Query performance and connection budget | [perf: queries](../skills/node-craft-perf/references/queries-pool.md#query-shape) · [perf: pool budget](../skills/node-craft-perf/references/queries-pool.md#pool-and-connection-budget) | `measurement`, `test` | E03 (bounded pagination); contract-kit keyset query |
| 16 | Transactions, concurrency and idempotency | [arch: transactions](../skills/node-craft-arch/references/transactions-idempotency.md#transactions) · [arch: idempotent writes](../skills/node-craft-arch/references/transactions-idempotency.md#idempotent-writes) | `test` | E07; contract-kit `idempotency.int.test.ts` (repeat, concurrent ×5, different payload, rollback) |
| 17 | Migrations and schema changes | [arch: migrations](../skills/node-craft-arch/references/migrations.md#old-and-new-code-at-the-same-time) · [arch: large tables](../skills/node-craft-arch/references/migrations.md#large-tables) | `test`, `review` | E12, E13 |
| 18 | Redis decision (conditional) | [arch: Redis](../skills/node-craft-arch/references/redis.md#redis-when-and-how) · [arch: Redis down](../skills/node-craft-arch/references/redis.md#when-redis-is-down) | `review`, `test` | E01 (not added when not needed) |
| 19 | BullMQ and workers (conditional) | [arch: queues](../skills/node-craft-arch/references/queues-workers.md#delivery-is-at-least-once) · [arch: process lifecycle](../skills/node-craft-arch/references/queues-workers.md#process-lifecycle) | `test`, `review` | E10, E13 |
| 20 | Transactional outbox (conditional) | [arch: outbox](../skills/node-craft-arch/references/outbox.md#shape) | `test` | E02; contract-kit `outbox.int.test.ts` (atomic write, two dispatchers, failure backoff) |
| 21 | Notification and email language (conditional) | [arch: notifications](../skills/node-craft-arch/references/notifications.md#language) · [arch: device tokens](../skills/node-craft-arch/references/notifications.md#device-tokens) | `test`, `review` | E10, E11 |
| 22 | External services, webhooks and Adapty (conditional) | [arch: webhooks](../skills/node-craft-arch/references/webhooks-adapty.md#receiving-webhooks) · [arch: Adapty](../skills/node-craft-arch/references/webhooks-adapty.md#adapty-when-the-product-sells-subscriptions) | `test`, `contract` | E05, E09 |
| 23 | Files and media (conditional) | [arch: media](../skills/node-craft-arch/references/media.md#upload) | `test`, `review` | Rule only; no eval in this version |
| 24 | Performance and resource budgets | [perf: budgets](../skills/node-craft-perf/references/budgets.md#performance-budgets) · [perf: event loop](../skills/node-craft-perf/references/event-loop.md#keep-the-loop-free) · [perf: load testing](../skills/node-craft-perf/references/load-testing.md#honest-reporting) | `measurement` | Rule only; measurements happen in the target project |
| 25 | Logging, observability and audit | [arch: logs](../skills/node-craft-arch/references/observability.md#logs) · [arch: audit records](../skills/node-craft-arch/references/observability.md#audit-records) | `test`, `review` | contract-kit request id validation and generic 500 message |
| 26 | Environments and secrets | [init: environments](../skills/node-craft-init/references/environments-config.md#environments) · [init: secrets](../skills/node-craft-init/references/environments-config.md#secrets) | `review`, `test` | E05 (client vs server config) |
| 27 | Railway deployment | [ops: Railway](../skills/node-craft-ops/references/railway.md#railway) · [ops: pre-deploy](../skills/node-craft-ops/references/railway.md#pre-deploy-migrations) | `review` | E13 |
| 28 | Health checks and graceful shutdown | [ops: endpoints](../skills/node-craft-ops/references/health-shutdown.md#endpoints) · [ops: shutdown](../skills/node-craft-ops/references/health-shutdown.md#shutdown) | `test`, `review` | E13 |
| 29 | Backup and recovery | [ops: backup and restore](../skills/node-craft-ops/references/backup-restore.md#policy) · [ops: restore tests](../skills/node-craft-ops/references/backup-restore.md#restore-tests) | `review` | E13 |
| 30 | CI/CD quality gates | [ops: CI gates](../skills/node-craft-ops/references/ci-gates.md#cicd-gates) | `test`, `review` | This repository's own CI runs integrity and contract-kit gates |
| 31 | Project documents | [init: project documents](../skills/node-craft-init/SKILL.md#5-project-documents) · [init: STACK.md](../skills/node-craft-init/references/stack-template.md#stackmd-template) | `review` | E01, E02 |
| 32 | Critical acceptance scenarios | [arch: test what can break](../skills/node-craft-arch/SKILL.md#test-what-can-break) · [core: done](../skills/node-craft/references/done-criteria.md#definition-of-done) | `test` | E06–E13; contract-kit integration tests |
| 33 | Done criteria and how the agent works | [core: done](../skills/node-craft/SKILL.md#4-done) · [core: report](../skills/node-craft/SKILL.md#5-report) | `review` | All scenarios (honest reporting is graded where relevant) |
| 34 | Official reference sources | [init: sources](../skills/node-craft-init/references/sources.md#sources-verified-2026-11-04) · [arch: sources](../skills/node-craft-arch/references/sources.md#sources-verified-2026-11-04) · [ops: Railway sources](../skills/node-craft-ops/references/railway.md#sources) | `review` | Checked on 2026-11-04; recheck on use |

## Usage scenarios from the task brief

| Scenario | Eval | Notes |
|---|---|---|
| Plain API with no client | E01 | No rn-craft, Firebase, Redis or Adapty |
| Complex admin and roles domain | E02 | NestJS + FastifyAdapter when the domain calls for it |
| Existing backend | E03 | Synthetic NestJS/Express/Prisma/npm fixture in `evals/fixtures/legacy-nest-express` |
| Next.js or other web client | E04 | No mobile dependency |
| Shared use with rn-craft | E05 | Runs with rn-craft skills installed in both arms |
| Turkish and unsupported locale | E06 | Resolution order, field messages, missing key |
| The same write delivered twice | E07 | Plus contract-kit concurrency test |
| Another tenant's resource | E08 | Plus contract-kit cross-tenant test |
| Out-of-order subscription webhook | E09 | |
| Language change before a queued notification | E10 | |
| Account switch and an old push token | E11 | |
| Old client and new API | E12 | |
| Migration failure and worker shutdown | E13 | |
