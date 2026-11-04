# Client integration

The backend serves any client through the same contract. No client framework is assumed: a backend with no client yet,
a Next.js or other web app, an admin panel, a native mobile app, and a React Native app all integrate the same way.

## What clients consume

- The versioned OpenAPI document and the behaviour documented with it (errors, locale, pagination, idempotency, auth
  outcomes).
- Optional generated types or a typed client from that document (`openapi-typescript`, `orval`, `openapi-generator`).
  Generated types help; they do not validate data at runtime. Clients that cannot trust a response (external,
  versioned, critical) still parse it at the boundary.
- Never: backend entity classes, ORM models, framework DTO classes, or any package that imports Node-only modules,
  the ORM, server secrets or the backend framework.

## Repository layouts

| Layout | How the contract travels |
|---|---|
| Monorepo (`apps/api`, `apps/web`, `apps/mobile` as examples, not requirements) | `openapi.json` committed by the API; clients generate types from it in their own build. A shared `packages/contract` may hold only generated, dependency-free types and schemas |
| Separate repositories | A versioned artifact: the OpenAPI file published with each API release (release asset, package, or URL), or a small contract package with generated types only |
| No client yet | The OpenAPI document and examples are the deliverable |

A React Native bundle must not pull a backend package: check that the contract package has no runtime dependencies
beyond what the client already uses.

## Client checklist (any framework)

1. One HTTP layer sends `Authorization`, `X-App-Locale`, `X-Request-Id` (optional), `X-App-Version` (mobile).
2. Errors are parsed once into a typed error with `status`, `code`, `message`, `fields`, `requestId`, and
   `retryAfter`. Screens use `code` and `fields`, never `message` comparisons.
3. Field errors map to form fields by `field`.
4. Lists read `data` and `meta.nextCursor`/`meta.hasMore`.
5. Critical writes generate an `Idempotency-Key` per user action and reuse it on retry.
6. Retry policy follows `references/idempotency-contract.md`.
7. Sign-out and account switch run one reset routine (`references/auth-session-contract.md`).

## Example: a typed error in any TypeScript client

```ts
export type ApiError =
  | { kind: 'network' }
  | { kind: 'unauthorized'; code: string; requestId?: string }
  | { kind: 'forbidden'; code: string; requestId?: string }
  | { kind: 'notFound'; code: string; requestId?: string }
  | { kind: 'validation'; code: string; message: string; fields: Record<string, { code: string; message: string }>; requestId?: string }
  | { kind: 'conflict'; code: string; message: string; retryAfter?: number; requestId?: string }
  | { kind: 'rateLimited'; code: string; retryAfter?: number; requestId?: string }
  | { kind: 'server'; status: number; code: string; retryAfter?: number; requestId?: string };
```

## React Native with rn-craft (optional)

rn-craft is not required by anything here. When the mobile app follows rn-craft (RTK Query base query, typed
`ApiError`, i18next, `resetSession()`), the node-craft repository ships a companion guide
(`docs/compatibility/rn-craft.md` in the repository) that shows how to:

- add `X-App-Locale` from the active i18next language in the single `baseQuery`;
- map this error model to rn-craft's `ApiError` while keeping `code`, `requestId`, status and `Retry-After`, and add
  `conflict` and `rateLimited` cases;
- move `details[].field` errors into react-hook-form;
- consume `{ data, meta }` and cursors in endpoint types and `transformResponse`;
- map Firebase uid, backend user id and Adapty customer user id, and run push token unlink in `resetSession()`;
- keep one `Idempotency-Key` per user action across retries.

The guide lists what rn-craft has today and what it would need; it does not claim those changes exist in rn-craft.
