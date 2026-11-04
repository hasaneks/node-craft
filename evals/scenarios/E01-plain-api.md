---
id: E01
title: Plain API with no client
skills: node-craft, node-craft-init
setup: none
---

# E01 Plain API with no client

## Prompt

We need a small internal REST API for a bookshop: books, authors and stock counts. Two developers, no mobile or web
client yet, a few hundred requests per minute at most. Set up the project: tell us the stack decisions with reasons,
the folder layout, the scripts and the first vertical slice you would build.

## Expected

- Fastify with TypeScript as the framework, justified by the small domain and team (an ADR or equivalent record).
- PostgreSQL with one data access approach (Prisma or Drizzle) chosen with a reason.
- Current Active LTS Node verified from the official source, strict TypeScript, Yarn pinned with one lockfile.
- REST + OpenAPI from one schema source with runtime validation.
- No Redis, BullMQ, Firebase, FCM, Adapty or rn-craft, with a sentence saying they are not needed now.
- `buildApp` separate from `listen`; config validated at startup; standard scripts.
- First slice planned test-first, with integration tests on real PostgreSQL.

## Forbidden

- Installing or requiring Redis, BullMQ, Firebase, Adapty, FCM or rn-craft.
- Express directly, or NestJS on the Express adapter.
- Microservices, CQRS or event sourcing.
- Inventing business rules beyond the prompt without marking them as assumptions.

## Rubric

- R1: Picks Fastify and ties the reason to the profile (small domain, small team).
- R2: Chooses one ORM with a workload reason and records decisions (ADR or equivalent).
- R3: Node version policy is Active LTS verified on the day, and Yarn is pinned with one lockfile.
- R4: Leaves out optional infrastructure explicitly.
- R5: OpenAPI and runtime validation from one source; response schemas instead of entities.
- R6: TDD plan with real PostgreSQL integration tests.
- R7: Config schema validation, `.env.example`, `buildApp`/`listen` separation and standard scripts.
