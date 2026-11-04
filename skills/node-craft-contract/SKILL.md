---
name: node-craft-contract
description: "API contract rules for a Node.js backend and every client that calls it: REST resources and versioning, OpenAPI from a single schema source, runtime request/response validation, the success envelope and 204, the error model with stable codes and localized messages, HTTP status mapping (400/401/403/404/409/429/503), the locale header and resolution order, cursor pagination, Idempotency-Key semantics, auth and session outcomes, number/money/date representation, and backward compatibility with old mobile clients. Use when adding or changing an endpoint, its schema, error codes, pagination or headers, generating OpenAPI or client types, or integrating a web, admin or mobile client (React Native with or without rn-craft). Client technology is never required."
---

# Design the API contract

The contract is the versioned OpenAPI document plus the documented behaviour behind it. Clients integrate against
that, never against backend entities, ORM models or framework DTO classes. Follow `node-craft` for TDD and done.

| Area | Read |
|---|---|
| Resources, schemas, validation, OpenAPI source, success shape | `references/openapi-validation.md` |
| Error body, codes, status mapping, retry semantics | `references/errors.md` |
| `X-App-Locale`, resolution order, `Content-Language`, caching | `references/locale-contract.md` |
| Cursor pagination, limits, sorting, filters | `references/pagination.md` |
| `Idempotency-Key`, offline writes, client retries | `references/idempotency-contract.md` |
| 401/403 outcomes, identity mapping, sessions, account deletion, push tokens | `references/auth-session-contract.md` |
| Versioning, old clients, breaking changes, enums | `references/versioning.md` |
| Generated client types, monorepo vs separate repos, web and mobile integration, rn-craft | `references/client-integration.md` |

## Defaults for a new project

An existing project's contract wins; extend it compatibly instead (`node-craft` → `references/existing-project.md`).

- REST, resource-oriented paths under `/api/v1`. Another style (GraphQL, RPC) only for a concrete need.
- **One schema source.** Either code-first (route schemas generate OpenAPI) or schema-first (OpenAPI generates
  validators and types). Never two hand-maintained sources that can drift.
- **Runtime validation** of body, params, query and required headers. TypeScript types are not validation.
- **Response schemas** list the fields returned. Never serialize an ORM object.
- Success: `{ "data": ..., "meta"?: ... }`. `204 No Content` has no body.
- Errors: `{ "error": { "code", "message", "details"? }, "locale", "requestId" }` with the right HTTP status. Never
  `200` with `success: false`.
- Machine values (error codes, field paths, enum values) never change with the language. Clients branch on `code`,
  never on `message`.
- Locale: `X-App-Locale` → verified profile preference → `Accept-Language` → `en`.
- Lists: cursor pagination, default 20, max 100, stable sort with a unique tie-breaker.
- Critical creating writes accept `Idempotency-Key`.
- Precision is never lost: money as decimal strings or integer minor units with a currency; integers beyond 2^53 as
  strings; instants as ISO 8601 with offset; calendar dates as `YYYY-MM-DD`.

## Checklist for an endpoint

1. Write the contract first: path, method, auth, request schema, response schema per status, error codes, headers
   (locale, idempotency, `Retry-After`), pagination.
2. Red: an API test (`inject`) for the success case and each error case, including 401, 403/404 for another user's
   resource, 400 with field details, and 409/429 where they apply.
3. Green with schemas wired into the framework so validation, serialization and OpenAPI come from the same place.
4. Regenerate OpenAPI; a CI check fails when the committed spec and the generated spec differ.
5. Check compatibility: would a client built against the previous spec still work? If not, follow
   `references/versioning.md`.
