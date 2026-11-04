# Fastify or NestJS

Make this decision from the intake. Do not ask the user to pick a framework name; ask only about product facts you
are missing. Record the result as an ADR (`references/adr-template.md`).

## Profiles

| Project profile | Choose |
|---|---|
| Few domains, simple service boundaries, small team, low framework overhead wanted | Fastify + TypeScript, feature modules as Fastify plugins |
| Many business rules, roles and integrations; a large admin surface; orchestration across modules; standard DI wanted | NestJS + `@nestjs/platform-fastify` (`FastifyAdapter`) |
| Small MVP with uncertain growth | The simplest modular monolith that serves today's needs (usually Fastify); do not build for imagined scale |

Signals for NestJS: more than a handful of bounded modules that call each other, cross-cutting guards and
interceptors used everywhere, several teams, many provider integrations that benefit from DI and module scoping.

Signals for Fastify: one or two domains, mostly CRUD with a few flows, a small team that prefers explicit code over
decorators, a worker that shares a few use cases.

## Rules

- Do not use Express directly in a new project. If NestJS is chosen, switch to the Fastify adapter at creation;
  never leave the default Express adapter.
- Do not port Express middleware or examples unchecked. Use Fastify plugins or Fastify-compatible integrations
  (`@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/multipart`, `@fastify/swagger`). In NestJS
  on Fastify, check that each Nest package used supports the Fastify adapter.
- Do not decide on a synthetic benchmark. Weigh business logic, maintenance cost, data access and team needs.
- Start as a modular monolith. Microservices, CQRS and event sourcing need a concrete, written need.
- API and worker may share code in one repository and one image. A separate repository or service is not required.
- Start with one deployable service when scope is small. When jobs are long or must scale independently, run a
  separate worker process from the same codebase with its own start command.

## Existing projects

An existing Express app or a NestJS app on the Express adapter stays as it is unless the user approves a migration.
A migration proposal lists: what breaks (middleware, raw request access, file uploads, sessions), test coverage
needed before the switch, and the rollback path.

## ADR example (short)

```markdown
# 0001 HTTP framework

- Need: 3 domains (catalog, orders, accounts), one admin, 2 developers, mobile and web clients.
- Options: Fastify; NestJS + FastifyAdapter.
- Decision: Fastify 5 with feature plugins and TypeBox schemas.
- Reasons: few cross-module flows, explicit code preferred, schema-driven validation and OpenAPI in one place.
- Revisit when: more than ~8 modules call each other, or a second team joins.
```
