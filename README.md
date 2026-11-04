<p align="center">
  <b>English</b> · <a href="README.tr.md">Türkçe</a>
</p>

<p align="center">
  <img alt="Node.js Active LTS" src="https://img.shields.io/badge/Node.js-Active%20LTS-5FA04E?logo=nodedotjs&logoColor=white">
  <img alt="Fastify and NestJS" src="https://img.shields.io/badge/Fastify%20%7C%20NestJS-TypeScript-000000">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma%20%7C%20Drizzle-4169E1?logo=postgresql&logoColor=white">
  <img alt="Agent skills" src="https://img.shields.io/badge/skills-Claude%20Code%20%7C%20Cursor%20%7C%20Codex-7ee2b8">
  <img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-lightgrey">
</p>

# node-craft

**Agent skills for building Node.js and TypeScript backends that hold up in production: decided stacks, honest
tests, safe data, clear API contracts and boring deploys.**

AI agents write backends that answer the happy path. You get a `SELECT` then `INSERT` that lets two requests create
the same order, a `userId` taken from the request body, a retry that charges twice, an error message compared in the
client, a migration run by every replica at boot, and a health check hard-coded to 200. Each one passes a demo. Each
one fails in production.

node-craft gives the agent the rules and the order of work that prevent these, as skills it loads while it works.

## At a glance

- **The project decides first.** Existing framework, ORM, auth and package manager are kept. New projects get a stack
  chosen from the product and written down in ADRs.
- **Test-driven, honestly.** Red for the right reason, then Green, then Refactor. Existing tests are never weakened to
  get green, and checks that did not run are reported as not run.
- **Data you can trust.** Constraints in PostgreSQL, short transactions, idempotent critical writes, transactional
  outbox where a side effect must not be lost, safe migrations.
- **One contract for every client.** REST + OpenAPI from one schema source, stable error codes with localized
  messages, a locale header with a clear resolution order, cursor pagination, idempotency keys.
- **Only what the product needs.** Redis, BullMQ, Firebase, FCM, Adapty and object storage are added for a reason,
  never by default.
- **Ready to run.** Railway build, pre-deploy migrations, honest health checks, graceful shutdown, CI gates, backups
  and restore tests.

## Quick start

```bash
npx skills add hasaneks/node-craft
```

You can also copy `skills/node-craft*` into your agent's skills folder by hand (for Claude Code: `.claude/skills/`).
Each skill folder is self-contained; you can install only the ones you want, and `node-craft` (the core) is the one to
keep.

Then ask in plain words: *"set up a backend for a bookshop API"*, *"add an endpoint to list my invoices"*, *"the
orders list is slow"*, *"this webhook sometimes grants premium twice"*, *"prepare the Railway deploy"*. The right skill
loads on its own.

No client is required. A backend with no client yet, a web or admin app, a native mobile app and a React Native app
all use the same skills.

## Skills

| Skill | Use it when | What it does |
|---|---|---|
| [`node-craft`](skills/node-craft/SKILL.md) | Any backend change | Reads the project's decisions first, TDD that protects existing tests, the definition of done, honest reporting, and which skill to load next |
| [`node-craft-init`](skills/node-craft-init/SKILL.md) | Starting a backend, choosing its stack, adding environments | Product intake, Active LTS Node, strict TypeScript, pinned Yarn, Fastify or NestJS + Fastify adapter chosen from the product, PostgreSQL with Prisma or Drizzle, config schema, scripts, layout, ADRs and `STACK.md` |
| [`node-craft-arch`](skills/node-craft-arch/SKILL.md) | Building what sits behind the API | Modules, data model, transactions and idempotency, migrations, Firebase auth and tenant authorization, security, backend i18n, Redis, BullMQ, outbox, push and email, webhooks and Adapty, files, logs and audit |
| [`node-craft-contract`](skills/node-craft-contract/SKILL.md) | Adding or changing an endpoint, integrating a client | OpenAPI from one source, runtime validation, error envelope and status mapping, locale header, cursor pagination, `Idempotency-Key`, auth outcomes, versioning for old mobile clients |
| [`node-craft-fix`](skills/node-craft-fix/SKILL.md) | Something is broken | Baseline, reproduce through the real entry point, regression test, smallest fix, proof |
| [`node-craft-perf`](skills/node-craft-perf/SKILL.md) | Something is slow | Budgets, `EXPLAIN`, N+1, indexes, pool and connection budget, event loop, load tests, before/after numbers |
| [`node-craft-ops`](skills/node-craft-ops/SKILL.md) | Deploying and running | Railway services, pre-deploy migrations, health checks, graceful shutdown, CI gates, backup and restore, runbooks |

A project's `STACK.md`, ADRs and existing code override the defaults. The template is in
[`skills/node-craft-init/references/stack-template.md`](skills/node-craft-init/references/stack-template.md).

## Rules

[`RULES.md`](RULES.md) lists every rule with what, why, how, exceptions, and **how it is verified**. Most backend
mistakes that matter cannot be seen in syntax, so node-craft does not ship a lint plugin in this version:

| Verified by | Rules |
|---|---:|
| `test` (often on real PostgreSQL) | 32 |
| `review` | 19 |
| `contract` (OpenAPI and payload checks) | 9 |
| `measurement` | 5 |
| `lint` (existing ESLint/TypeScript rules only) | 1 |

50 rules in total; many have more than one kind, so the counts overlap.

## Defaults for a new project

| Area | Default |
|---|---|
| Runtime | Current Active LTS Node.js, verified on the day |
| Language | TypeScript, `strict` |
| Package manager | Yarn, pinned per project, one lockfile |
| HTTP | Fastify, or NestJS with `@nestjs/platform-fastify` for large, orchestration-heavy domains. Not Express |
| Database | PostgreSQL with Prisma or Drizzle (one per project) |
| API | REST + OpenAPI, runtime validation, `{ data, meta }`, `{ error: { code, message, details }, locale, requestId }` |
| Tests | Vitest or Jest, integration tests on real PostgreSQL |
| Logs | Pino JSON with redaction and request ids |
| Deploy | Railway |
| Optional | Redis, BullMQ, outbox, Firebase Admin, FCM, Adapty, object storage: only when needed |

## With rn-craft (optional)

[rn-craft](https://github.com/hasaneks/rn-craft) builds React Native apps; node-craft builds their backends. Neither
needs the other. When you use both, [`docs/compatibility/rn-craft.md`](docs/compatibility/rn-craft.md) shows how the
app's RTK Query base query sends the language and maps the error model, how field errors reach react-hook-form, how
pagination and idempotency keys flow, and how Firebase, backend and Adapty identities and push tokens line up. It
also lists the gaps in rn-craft 0.2.0 and a proposed [patch](docs/compatibility/rn-craft-companion.patch) that has
not been merged into rn-craft.

## FAQ

**Does it work without rn-craft?** Yes. node-craft has no dependency on rn-craft and no skill reads rn-craft files.
The client contract is framework-neutral.

**What does rn-craft compatibility add?** An optional guide and a proposed patch for rn-craft: `X-App-Locale` in the
base query, mapping `{ error: { code, message, details }, locale, requestId }` to `ApiError` with new `conflict` and
`rateLimited` cases, field errors to forms, `{ data, meta }` cursors, identity mapping and push token lifecycle.

**New project or existing project?** New projects get the defaults above, chosen and recorded by `node-craft-init`.
Existing projects keep their framework, ORM, auth, package manager and error format; node-craft improves the code it
touches and writes larger changes as proposals.

**Which rules are static and which need tests or measurement?** See the table above and the **Verify** field of each
rule in `RULES.md`. Only one rule (`strict-typescript`) relies on lint, through existing typescript-eslint rules;
the rest need tests, contract checks, measurements or review.

**What was actually verified?** See [`docs/validation.md`](docs/validation.md): the package integrity tests, the
contract kit's unit and PostgreSQL integration tests, and the eval runs with their scores and cost.

**Does it work with Express or NestJS on Express?** In an existing project, yes: it keeps them. It only avoids Express
for new projects.

## Development

```bash
npm test                          # package integrity tests, zero dependencies
cd fixtures/contract-kit
yarn install --immutable
yarn test                         # unit + PostgreSQL integration tests (needs a container runtime)
cd ../..
npm run evals -- --only E01       # task evals with the Claude Code CLI (costs money)
```

Integration tests start PostgreSQL with Testcontainers; they need Docker or another container runtime (for example
Colima: set `DOCKER_HOST` to its socket and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`).

How the package is put together: [`docs/architecture.md`](docs/architecture.md). Which requirement is covered where:
[`docs/requirements-coverage.md`](docs/requirements-coverage.md). Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licence

[MIT](LICENSE) © Hasan Ekşi
