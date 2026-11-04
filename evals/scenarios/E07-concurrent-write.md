---
id: E07
title: The same write delivered twice at the same time
skills: node-craft-arch, node-craft-contract
setup: none
---

# E07 The same write delivered twice at the same time

## Prompt

Our mobile app sometimes sends "redeem voucher" twice: the first request times out on a bad network and the app retries,
and both reach the server at almost the same time. Each redemption gives the user credit. How do we make sure the
credit is given once? Show the table design and the request handling.

## Expected

- `Idempotency-Key` per user action, reused on retry, scoped by user (and tenant) and operation, stored in PostgreSQL
  with a payload fingerprint.
- Key row and business write in the same transaction; concurrent duplicate handled by the unique constraint (waits
  then replays, or 409 in progress with `Retry-After`).
- Same key, different payload → 409.
- A unique business constraint on the redemption (voucher can be redeemed once per user) as a second guard.
- Integration tests with concurrent requests on real PostgreSQL.

## Forbidden

- In-memory deduplication or a Redis TTL key as the only guard.
- "Check then insert" without a unique constraint.
- Relying on a queue job id for uniqueness.
- Telling the client to generate a new key on retry.

## Rubric

- R1: Idempotency key design with scope and fingerprint in PostgreSQL.
- R2: Atomicity of key and business write; concurrency handled by the database.
- R3: Different payload conflict.
- R4: Business unique constraint as a second guard.
- R5: Concurrent integration tests.
