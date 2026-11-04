# Authentication and authorization

The identity provider follows the product. These rules cover Firebase Auth (common with mobile clients) and apply
in spirit to any provider the project already uses.

## Verifying identity

- With Firebase Auth, verify the ID token with the Firebase Admin SDK (`verifyIdToken`). Decoding a JWT is not
  verification. The SDK checks signature, project (`aud`), issuer, expiry and issued-at; it needs the correct project
  configured per environment.
- Revocation is not checked by default. For risky actions (payment, email change, account deletion, admin) pass
  `checkRevoked: true` or check the user's `tokensValidAfterTime` / disabled state, and decide what a revoked or
  disabled user gets (401 with `AUTH_REVOKED`).
- Do not rebuild what Firebase already does: no second password store, no backend refresh token on top of Firebase
  ID tokens. The client refreshes its ID token; the backend verifies each request.
- Firebase App Check (or similar attestation) can reduce abuse; it is not user identity and not authorization.
- Your own password system only for a clear need, with a current memory-hard hash (Argon2id or scrypt per current
  OWASP guidance), rate-limited login, and single-use, expiring reset tokens.

## Mapping identities

Keep three ids apart and write the mapping down:

| Id | Example | Used for |
|---|---|---|
| Identity provider id | Firebase `uid` | Looking up the backend user after verification |
| Backend user id | `users.id` uuid | Everything inside the backend: foreign keys, logs, jobs |
| Purchase customer id | Adapty `customer_user_id` | Provider calls and webhook mapping; set to the backend user id |

- `users.firebase_uid` is `UNIQUE NOT NULL`. Provision on first verified request with `INSERT ... ON CONFLICT
  (firebase_uid) DO NOTHING RETURNING ...` (then select), so two concurrent first requests create one user.
- Anywhere a client calls `identify(userId)` (analytics, purchases), say which id it is. node-craft default: the
  backend user id, never the email.
- `userId`, `tenantId`, `role`, `isPremium` in a body, query or custom header are data, never authority. The
  authenticated user comes from the verified token; roles and entitlements come from the backend database.

## Status codes

| Situation | Status | Code |
|---|---|---|
| No token, malformed, expired, bad signature | 401 | `AUTH_REQUIRED` / `AUTH_INVALID` |
| Revoked token or disabled identity | 401 | `AUTH_REVOKED` |
| User blocked in the backend | 403 | `ACCOUNT_BLOCKED` |
| User deleted or pending deletion | 401 | `ACCOUNT_DELETED` |
| Authenticated but not allowed | 403 | `FORBIDDEN` |
| Resource exists but must stay hidden | 404 | `RESOURCE_NOT_FOUND` (same as a real 404) |

Clients refresh the token once on 401 `AUTH_INVALID` and retry once; on `AUTH_REVOKED` or `ACCOUNT_*` they sign out.

## Authorization

- Every protected endpoint checks authentication **and** whether this user may perform this action on this resource.
  Load the resource with the ownership condition in the query (`WHERE id = $1 AND owner_id = $2`), not load-then-
  compare in the route.
- When roles are not enough, use permissions or policies (`can(user, 'order.refund', order)`), evaluated on the
  server. Hiding an admin button is not protection; admin routes have their own guard.
- Decide per resource type whether a forbidden resource answers 403 or 404 and apply it consistently, so existence
  does not leak.
- Tenants: the tenant comes from the authenticated membership, not from a header the client picks. Carry it into
  every query, cache key, job payload, file path and log context. Knowing another tenant's id gives nothing.

## Web sessions

If a web client uses cookies instead of bearer tokens: `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`, a CSRF
defence for state-changing requests (synchronizer token or double-submit with SameSite), and a session store that
works across replicas. Mobile bearer flows do not need CSRF; do not mix the two threat models.

## Account lifecycle

Account deletion is an API contract: request endpoint, the asynchronous status if deletion takes time, cancellation
window if any, failure handling, and what is kept for legal reasons. The backend removes or anonymizes data per the
retention table, unlinks push tokens, and tells the purchase provider when required.
