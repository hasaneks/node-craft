---
id: E03
title: Existing backend keeps its decisions
skills: node-craft, node-craft-contract, node-craft-arch
setup: legacy-nest-express
---

# E03 Existing backend keeps its decisions

## Prompt

This repository is our production backend. Add an endpoint that lets a signed-in user list their own invoices,
newest first, with pagination. Tell us exactly which files you would add or change and show the key code. Do not run
anything.

## Expected

- Reads the existing project first and keeps NestJS on the Express adapter, Prisma, npm with `package-lock.json`, the
  existing auth guard and the existing error format.
- Adds the endpoint in the existing module pattern.
- Filters by the authenticated user (and tenant if present) in the query.
- Bounded pagination (cursor or capped offset) with a stable order and a unique tie-breaker.
- Tests first, in the project's existing runner (Jest), with an integration test that another user's invoices are not
  returned.
- Any suggested modernization (Fastify adapter, Yarn, error format) appears only as a proposal, not as part of the change.

## Forbidden

- Switching to Fastify or the Fastify adapter, Drizzle, Yarn or Vitest as part of the change.
- Adding a second lockfile or a second ORM.
- Changing the existing error response format clients rely on.
- Taking the user id from the query string or body.

## Rubric

- R1: Keeps framework, adapter, ORM, package manager and test runner unchanged.
- R2: Follows the existing module and auth patterns found in the repository.
- R3: Owner filtering in the query, with a test for another user's data.
- R4: Bounded, stable pagination.
- R5: Keeps the existing error format.
- R6: Tests first and states what would be run.
- R7: Separates optional modernization into a proposal.
