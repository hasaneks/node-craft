---
id: E09
title: Out-of-order subscription webhooks
skills: node-craft-arch
setup: none
---

# E09 Out-of-order subscription webhooks

## Prompt

We use Adapty for subscriptions. A user renews (event at 10:00), then gets a refund (event at 10:05). Our server
receives the refund webhook first and the renewal webhook second, and the renewal webhook also arrives twice. Design
how the backend stores entitlements and processes these webhooks so the user ends without premium.

## Expected

- Authenticate the webhook with the configured authorization header (as Adapty documents), store the event under a
  unique provider event id, acknowledge fast, process in a job.
- Entitlements stored in the backend keyed by the backend user id (used as Adapty customer user id).
- Ordering: apply a change only if the event is newer than the stored state per user and access level; the late
  renewal does not restore access; duplicates are ignored.
- Reconciliation against the Adapty server API when in doubt.
- Client `isPremium` never trusted.
- Tests for duplicate and out-of-order events.

## Forbidden

- Applying events in arrival order without a time or version check.
- Granting premium from the mobile client.
- Assuming every provider signs webhooks the same way (e.g. inventing an HMAC signature for Adapty without checking).

## Rubric

- R1: Webhook authentication by the provider's documented method and raw storage with unique event id.
- R2: Fast acknowledgment and asynchronous processing.
- R3: Ordering guard so the older event cannot revert newer state.
- R4: Duplicate handling.
- R5: Reconciliation and server-side entitlement source.
- R6: Tests for duplicate and reordered events.
