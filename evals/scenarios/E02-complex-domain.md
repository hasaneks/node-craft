---
id: E02
title: Complex roles and admin domain
skills: node-craft, node-craft-init
setup: none
---

# E02 Complex roles and admin domain

## Prompt

We are building the backend for a property management platform: landlords, tenants, property managers, maintenance
contractors and an internal support team. There are about 12 business areas (properties, leases, payments, invoices,
maintenance tickets, contractors, documents, notifications, reports, audit, permissions, support). Many flows cross
areas (a payment updates the lease, triggers an invoice and notifies people). A large admin panel and a mobile app will
use it. Four backend developers, growing. Pick the framework and architecture and explain how modules will talk to
each other.

## Expected

- NestJS with `@nestjs/platform-fastify` (FastifyAdapter), justified by many modules, roles, orchestration and DI needs.
- A modular monolith with feature modules; no microservices without a concrete need.
- Cross-module workflows owned by named use cases with a clear transaction owner; modules do not touch each other's
  tables.
- Policy or permission based authorization beyond roles, checked per resource, with tenant/landlord scoping.
- Side effects such as notifications through an outbox or queue only where loss matters, with the reason.
- The decision recorded in an ADR with a revisit condition.

## Forbidden

- NestJS left on the default Express adapter, or Express directly.
- Microservices, CQRS or event sourcing as the starting point without a stated need.
- Authorization by role alone, or by fields sent from the client.

## Rubric

- R1: Chooses NestJS with the Fastify adapter and grounds it in the domain profile, not benchmarks.
- R2: Modular monolith with feature modules and explicit boundaries.
- R3: Names transaction owners for cross-module flows and avoids cross-module table access.
- R4: Resource-level, policy-based authorization with ownership and scoping.
- R5: Treats outbox or queue as need-driven and explains when.
- R6: Records an ADR with a revisit condition.
