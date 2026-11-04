# Product intake

Pull these from the product description, the repository and the conversation before writing code. Do not ask again
for what was given. Ask only about the gaps that change architecture, data safety or business behaviour; for the
rest, choose a sensible default and write it down as an assumption.

| Topic | Settle |
|---|---|
| Product | Main purpose, MVP, out of scope, critical user journeys |
| Clients | React Native, other mobile, web, admin, none yet; old client versions that must keep working |
| Domain | Main entities, relations, state transitions, rules that must never break |
| Identity | Firebase Auth or another provider, guests, service accounts, account lifecycle (block, delete) |
| Authorization | Roles, resource ownership, admin powers, tenant boundaries if any |
| Data | Sensitive fields, retention and deletion periods, files, expected growth |
| Traffic | Expected concurrency, hot endpoints, batch jobs |
| Languages | Supported locales, where the user's locale is stored, notification and email needs |
| Consistency | Duplicate requests, offline sync, concurrent updates |
| Integrations | Adapty, FCM, email, storage and other external services |
| Operations | Hosting platform (if already chosen), environments, budget, who has access, backups, acceptable downtime |
| Quality | Critical flows, latency targets, data loss tolerance, test coverage expectations |

## Rules

- Never invent business rules, endpoints, customer accounts, provider credentials or finished integrations.
- Do not add a service because this file names it. A topic with no need in the product is recorded as "not used".
- Keep test doubles and mocked integrations apart from real ones, and list each mock in `STACK.md`.
- Questions that block architecture (for example: is there a tenant boundary, are writes made offline, is money
  moved) are asked once, together, with the default you will use if there is no answer.

## Output

A short message with:

1. Assumptions (one line each).
2. Blocking questions, if any.
3. The decisions you will record as ADRs (framework, ORM, optional infrastructure).
4. The first vertical slice you will build with TDD.
