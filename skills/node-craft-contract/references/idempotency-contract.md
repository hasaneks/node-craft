# Idempotency, retries and offline writes

How the server stores keys and handles races is in `node-craft-arch` → `references/transactions-idempotency.md`.
This file is what clients see.

## `Idempotency-Key`

- Accepted on creating or charging writes that must not repeat (orders, payments, redemptions, invitations). The
  OpenAPI document marks each endpoint that supports it and whether it is required.
- The client generates one key (UUID) **per user action** and sends the same key on every retry of that action. A new
  tap on "Pay" after a definite failure is a new action and a new key; an automatic retry after a timeout is not.
- Scope: the key is unique per user (and tenant) and operation. Two users can send the same key without conflict.

| Situation | Response |
|---|---|
| First request | Normal result (`201`, `200`) |
| Repeat after completion, same payload | The stored result, same status and body, plus `Idempotency-Replayed: true` |
| Repeat while the first is still running | `409` `IDEMPOTENCY_IN_PROGRESS`, `Retry-After: 1` |
| Same key, different payload | `409` `IDEMPOTENCY_KEY_REUSED`; the new payload is not executed |
| Key missing where required | `400` `IDEMPOTENCY_KEY_REQUIRED` |
| Key older than the retention window | Treated as new; document the window (for example 24 hours) |

## Client retry policy

- Retry automatically: network failures and timeouts on reads; `503` and `429` honoring `Retry-After`; writes only
  when they carry an idempotency key.
- Never retry automatically: `400`, `401` (refresh the token once, then retry once), `403`, `404`, `409` conflicts
  other than `IDEMPOTENCY_IN_PROGRESS`, `422`.
- A `500` on a write without an idempotency key is not retried automatically; the user decides, and the client
  refetches state first.
- Backoff with jitter and a small cap (2 or 3 attempts). Do not stack retries in several layers.

## Optimistic UI

The server's `201` is the only proof of success. An optimistic list item is a guess the client must reconcile or roll
back.

## Offline writes

Only when the product needs offline creation or editing. Then document:

- a client operation id per queued write (it doubles as the idempotency key);
- replay order (per resource, in creation order) and what happens when one write in the chain fails;
- conflict handling: version or `ETag` with `If-Match` → `412` or `409` with the current state, and the chosen
  strategy (server wins, client wins with confirmation, field merge);
- deleted resources (`404`/`410` on replay → drop the queued write and tell the user);
- account switch: pending operations belong to the account that created them; never replay them under another user.

Without an offline requirement, do not build a persistent client write queue.
