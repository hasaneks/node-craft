# External services, webhooks and Adapty

## Adapters

- Each provider sits behind a narrow adapter in `infrastructure/` (`PaymentsGateway.charge()`), so business code does
  not spread SDK types and tests can replace it.
- Every outbound call has a timeout. Retry only transient failures (network, 429, 5xx), with backoff and jitter,
  within the provider's rate limit, and only when the call is idempotent or carries an idempotency key.
- Validation and authorization errors from a provider are permanent; do not retry them.
- A circuit breaker or a concurrency limit when a provider's outage would exhaust your pool or workers; not by
  default everywhere.
- Integration failures are never hidden behind an empty success. Record job or event status with the request or
  event id.

## Receiving webhooks

1. **Authenticate** with the provider's documented method: HMAC signature over the raw body (Stripe-style), a shared
   secret or authorization header (Adapty lets you set an authorization header value), mutual TLS, or an IP allowlist
   only where that is the documented method. Never assume every provider signs the same way.
2. If the method is a signature over the body, verify against the **raw** bytes before parsing (Fastify: a
   content-type parser that keeps the raw buffer for that route only).
3. **Persist first:** insert the event with the provider's event id under `UNIQUE (provider, event_id)`. A duplicate
   insert means already received: answer 200 and stop.
4. **Acknowledge fast:** respond 2xx once the event is stored; do the work in a job.
5. **Order and replay:** events can arrive late, twice or out of order. Apply a state change only when the event is
   newer than what you hold (compare the provider's event time or version per subject), or fetch the current state
   from the provider and apply that. Check timestamps only as the provider's contract defines them.

```sql
CREATE TABLE webhook_events (
  provider     text        NOT NULL,
  event_id     text        NOT NULL,
  event_type   text        NOT NULL,
  subject_id   text,                         -- e.g. customer user id
  occurred_at  timestamptz,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status       text        NOT NULL DEFAULT 'pending',
  payload      jsonb       NOT NULL,          -- minimized; no card data or secrets
  PRIMARY KEY (provider, event_id)
);
```

## Adapty (when the product sells subscriptions)

- The mobile app shows the paywall and the profile from the Adapty SDK. That is display. Backend access decisions use
  trusted data: webhooks and the Adapty server-side API.
- `isPremium: true` from a client is never premium access.
- Identity: the app calls Adapty `identify` with the **backend user id**; webhooks then carry it as the customer user
  id and map straight to `users.id`.
- Store entitlements in your database: `entitlements (user_id, access_level, is_active, expires_at, source_event_at,
  UNIQUE (user_id, access_level))`. Write with an upsert that only applies newer events, so the first event creates
  the row and a delayed old event cannot revert a newer state:

```sql
INSERT INTO entitlements (user_id, access_level, is_active, expires_at, source_event_at)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, access_level) DO UPDATE
  SET is_active = EXCLUDED.is_active, expires_at = EXCLUDED.expires_at, source_event_at = EXCLUDED.source_event_at
  WHERE entitlements.source_event_at < EXCLUDED.source_event_at;
```
- Cover the product's flows: purchase, renewal, cancellation (access until expiry), expiry, refund (access removed),
  billing issue and grace period, account switch (the same store account moving between app users), restore.
- Reconcile: on doubt (missed webhooks, out-of-order chain, support request), fetch the profile's access levels from
  the server API and correct the row. A scheduled reconciliation for active subscribers near expiry catches gaps.
- Adapty specifics as of the last check (`references/sources.md`): the webhook carries the `Authorization` header
  value you configured per environment (compare in constant time); deduplicate on `profile_event_id`; events can be
  out of order; Adapty retries for up to a day on errors or replies slower than 10 seconds, so store and answer fast.
  The server-side profile endpoint returns `access_levels[]` with `expires_at` and grace period state; derive "active"
  yourself.
- Verify event names, authentication options and API endpoints in the current Adapty docs before coding them.
