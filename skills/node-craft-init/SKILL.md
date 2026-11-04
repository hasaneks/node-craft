---
name: node-craft-init
description: "Starts a new Node.js/TypeScript backend, or brings an existing one onto a written project standard: product intake, current Active LTS Node verified from official sources, strict TypeScript, pinned Yarn, Fastify or NestJS with the Fastify adapter chosen from the product (recorded in an ADR), PostgreSQL with one data access approach (Prisma or Drizzle), a validated config schema, environments and secrets, Docker Compose or Testcontainers for local services, standard scripts, a feature-based modular monolith layout and STACK.md. Use when asked to create, bootstrap or scaffold a backend or API, choose its framework, ORM or toolchain, add environments, or write the project's architecture decisions. Not for changing the stack of an existing project without approval."
---

# Start a Node.js backend

Work as a senior backend engineer setting up a service that will ship and be maintained. Follow `node-craft` for the
working rules (project decides first, TDD, done). For an existing project read `node-craft` → `references/existing-project.md`
first; this skill then only fills gaps and never replaces a chosen technology silently.

| Step | Read |
|---|---|
| Product intake | `references/intake.md` |
| Fastify or NestJS | `references/framework-choice.md` |
| Prisma or Drizzle | `references/orm-choice.md` |
| Node, TypeScript, Yarn, lint, scripts, module format | `references/toolchain.md` |
| Environments, config schema, secrets | `references/environments-config.md` |
| Folders and module boundaries | `references/structure.md` |
| Recording a decision | `references/adr-template.md` |
| `STACK.md` | `references/stack-template.md` |
| Official docs, verified dates | `references/sources.md` |

## 1. Intake

Extract the product, clients, domain, identity, authorization, data, traffic, languages, consistency needs,
integrations, operations and quality targets from what you were given (`references/intake.md`). Do not ask again for
what was given. Ask only about gaps that change architecture, data safety or business behaviour; list the rest as
assumptions. Then share in a few lines: assumptions, blocking questions, a short plan.

A backend with no client yet, a web or admin client, a separate mobile app or a React Native app built with rn-craft
all start the same way. No client technology is a prerequisite.

## 2. Versions

1. Look up the **current Active LTS** Node.js on the day you start (nodejs.org previous releases). Use its latest
   patch. Not the newest Current line, not an LTS already in maintenance for a new project.
2. Pick framework, ORM, test runner, logger and SDK versions that support that Node line. Read each one's docs for
   that version; do not copy setup code from older examples. No beta or RC by default.
3. Pin exact versions and record them, with the verification date, in `STACK.md`. If you cannot reach the official
   source, say so, use `references/sources.md` as a dated starting point, and mark the versions as unverified.
4. Node and Yarn versions live in project metadata (`engines`, `packageManager`, `.nvmrc` or `.node-version`) and
   the same versions are used locally, in CI and in the deploy build.

## 3. Decide, then record

- **Framework:** Fastify for a small, clear domain; NestJS with `@nestjs/platform-fastify` for many modules, roles,
  integrations and orchestration that benefit from DI. Never Express directly; never NestJS on its default Express
  adapter in a new project. Decide yourself from the intake; do not ask the user to pick a name
  (`references/framework-choice.md`).
- **Data:** PostgreSQL. One main data access approach, Prisma or Drizzle, chosen from the workload
  (`references/orm-choice.md`).
- **API:** REST + OpenAPI with runtime validation from one schema source (`node-craft-contract`).
- **Architecture:** a modular monolith. No microservices, CQRS or event sourcing without a concrete need. API and
  worker can share one codebase and image with different start commands.
- **Hosting:** none is assumed. Use the platform the project already has; otherwise decide it from the intake (or ask)
  and record it, with how its release step, health checks and shutdown work (`node-craft-ops`).
- **Optional infrastructure:** Redis, BullMQ, Firebase Admin, FCM, Adapty, email and object storage only when a
  feature in the intake needs them (`node-craft-arch`).

Write each of these as a short ADR (`references/adr-template.md`): need, options, decision, reasons, when to revisit.

## 4. Set up

1. Yarn, pinned per project; one lockfile; `yarn install --immutable` in CI (`references/toolchain.md`).
2. TypeScript `strict`, ESLint (typescript-eslint, type-aware) and Prettier from the first commit. One module format
   (ESM or CommonJS) chosen from the framework and test runner, used everywhere.
3. Build the app in a function and listen in another file, so tests create it without a port.
4. Validate configuration at startup with a schema; refuse to start with a clear message on a missing or invalid
   value. `.env.example` with names and safe sample values only (`references/environments-config.md`).
5. Local services reproducible with Docker Compose; integration tests start their own PostgreSQL (Testcontainers or
   an equivalent disposable container).
6. Standard scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`,
   `test:ci`, `db:migrate`, plus `start:worker` when there is a worker. Development seed and reset are separate from
   the production migration command and refuse to run in production.
7. Folder layout and module boundaries: `references/structure.md`.

## 5. Project documents

Keep them short and true to the code; never create a document for a technology the project does not use.

| Document | Holds |
|---|---|
| README | Setup, Node/Yarn, local services, main commands |
| `docs/adr/` | Framework, ORM, module boundaries, why Redis/queue was added |
| OpenAPI | Endpoints, auth, pagination, errors, locale, idempotency |
| Data model | Main entities, relations, constraints, data lifecycle |
| Test guide | TDD flow, test environment, fixtures, critical scenarios |
| Performance budget | Targets, realistic data and load, measured results |
| Migration guide | Expand/contract, backfill, rollback or forward fix |
| Deploy runbook | Platform settings, release step, health check, smoke test |
| Operations runbook | Alerts, failed jobs, webhook replay, backup and restore |
| `.env.example` | Variable names, descriptions, safe samples |

`STACK.md` records the decisions agents must not guess (`references/stack-template.md`).

## How to work

Small, verifiable steps; one standard per concern. Do routine setup without asking; stop for decisions that change
the product or cost money. Never report an install, test, build or deploy as done when it was not run.
