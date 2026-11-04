---
name: node-craft
description: "Core working rules for any Node.js or TypeScript backend change: read the project's own decisions first, test-driven development (Red, Green, Refactor) that never weakens existing tests, honest reporting, a definition of done that covers contract, auth, tenant isolation, locale, data integrity, idempotency, logs and operations, and a map of which node-craft skill to load next. Use when writing, changing or reviewing any backend code (Fastify, NestJS, Express or other Node.js servers, workers, webhooks, migrations), whether the project is new or existing, with or without a mobile or web client."
---

# Working on a Node.js backend

Apply this to every backend change. It holds the rules every other node-craft skill relies on; they refer back to
it by name (`node-craft` → TDD, `node-craft` → done).

## 0. The project decides first

1. Read what the project already decided: `AGENTS.md`, `CLAUDE.md`, `STACK.md`, ADRs (`docs/adr/`), README,
   `package.json`, the lockfile, CI config, the existing framework, ORM, auth and folder structure. These win over
   every default in node-craft.
2. **Existing project:** keep its framework, ORM, identity provider, package manager and module layout. Move toward
   these rules only in the code you touch. Never migrate Express to Fastify, Prisma to Drizzle, npm to Yarn or a
   custom auth to Firebase as a side effect. If a default here would help, write it as a proposal (a short ADR) and
   say so; do not apply it. Details: `references/existing-project.md`.
3. **New project:** start with `node-craft-init`.
4. Do not ask again for what the user or the project already gave. Ask only about gaps that change architecture,
   data safety or business behaviour; for everything else pick a sensible default and list it as an assumption.

## 1. Load the right skill

| Task | Load |
|---|---|
| New project, stack choice, framework or ORM decision, environments, toolchain, project docs | `node-craft-init` |
| Modules, PostgreSQL model, transactions, auth, security, i18n, cache, queues, outbox, notifications, webhooks, files, logs | `node-craft-arch` |
| Endpoints, OpenAPI, validation, error model, locale header, pagination, idempotency keys, versioning, client integration | `node-craft-contract` |
| A bug, a failing test or a regression | `node-craft-fix` |
| Slow endpoint, query, pool exhaustion, event loop lag, queue backlog, load test | `node-craft-perf` |
| Railway, CI gates, migration release, health checks, shutdown, backup and restore, runbooks | `node-craft-ops` |

Most features need two: `node-craft-contract` for the API surface and `node-craft-arch` for what is behind it.

## 2. TDD

Every new business behaviour and every bug fix goes Red → Green → Refactor. The full procedure and the rules that
protect existing tests are in `references/workflow-tdd.md`. The short version:

1. State the expected behaviour, its error cases and the contract it touches.
2. Write the test first; for a bug, a test that reproduces it.
3. Run it and see it fail **for the right reason**. An import error, a missing env var or a broken fixture is not Red.
4. Write the smallest correct implementation. Run the related tests: Green.
5. Refactor with behaviour unchanged; run the affected modules' tests again.
6. Add integration or end-to-end checks that match the risk (real PostgreSQL for queries, constraints and
   transactions; real Redis/BullMQ when used).

Before you change anything, record the current state of the related tests so pre-existing failures are not mixed with
yours. Never delete or weaken an assertion, `skip` a test, drop it from coverage, bulk-update snapshots or turn a
failing integration test into a mock test to get green. Do not write the test after the code and call it TDD. Apply
TDD to behaviour and risk, not to every constant or one-line delegation.

## 3. Rules that apply everywhere

- **Never invent** business rules, endpoints, customer accounts, provider ids, keys or finished integrations. Keep
  test doubles apart from real integrations and name them as such.
- **Build what the product needs.** Firebase, Adapty, FCM, Redis, BullMQ, outbox and object storage are added when a
  feature needs them, not because a node-craft file mentions them.
- **One way per concern:** one HTTP framework, one data access approach, one validation system, one logger, one
  locale resolver, one error mapper, one wrapper per provider. Extend the existing one.
- **The server is the authority.** Identity comes from a verified token; `userId`, `tenantId`, `role` or `isPremium`
  in a request body is data, never permission.
- **No secrets** in the repository, images, examples, fixtures, logs, errors or client bundles. Never ask the user
  to paste a secret into the chat; ask them to set it in the environment.
- **Hard-to-reverse actions** (dropping data, rewriting shared migration history, production deploys, paid
  resources) need the concrete impact stated and explicit approval. Routine reversible development does not.
- **Docs per version:** check the installed version's official docs before using a framework, ORM or SDK API; do
  not copy commands from memory or old examples.

## 4. Done

A change is done only when every item that applies is true. The checklist with the questions to ask is
`references/done-criteria.md`:

business rule and contract correct · TDD followed and reported honestly · existing tests kept, any change to a test
justified · authentication, authorization and tenant isolation · user messages in the right language, machine codes
stable · constraints, indexes, transactions and concurrency handled · idempotency on critical writes · query and
performance budget checked · no secret or personal data in logs, errors or payloads · migrations, OpenAPI, tests and
docs updated · Railway build, start and health check verified, or the unverified part named.

## 5. Report

End with what changed, what was run (commands and results), and what is still blocked. Never present a test, build,
migration, integration, deploy or measurement as done when it was not run; name the check that is missing and why.
