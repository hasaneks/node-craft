# Push and email

Only when the product sends them. FCM for push and an email provider chosen for the product.

## Language

- Templates live in the backend catalogs (`references/i18n.md`), versioned (`order_shipped.v2`).
- A job does not carry a pre-rendered message in one language. It carries the recipient id, template key and
  version, and parameters: `{ v: 1, recipientId, template: 'order_shipped', templateVersion: 2, params: { orderNo } }`.
- At send time, resolve the recipient's **current** preferred locale and notification preferences. The admin's or
  server's language never decides. If the business needs the language at the time of the event (for example a legal
  notice), store a locale snapshot on purpose and say so.
- HTML email escapes parameters; a missing parameter fails a test, not a customer email.

## Device tokens

```sql
CREATE TABLE push_devices (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id text NOT NULL,           -- stable per app install, from the client
  fcm_token       text NOT NULL,
  platform        text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  locale          text,                    -- device UI language, informational only
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installation_id),
  UNIQUE (fcm_token)
);
```

- Register: `PUT /me/devices/{installationId}` with the token. The user comes from the verified ID token, never the
  body. One `ON CONFLICT` can target only one unique constraint, so in one transaction: delete any other row holding
  this token, then upsert by installation. A device that moves to a new user is **re-bound**, so the previous user
  stops receiving on it.

```sql
DELETE FROM push_devices WHERE fcm_token = $3 AND installation_id <> $2;
INSERT INTO push_devices (id, user_id, installation_id, fcm_token, platform)
VALUES (gen_random_uuid(), $1, $2, $3, $4)
ON CONFLICT (installation_id) DO UPDATE
  SET user_id = EXCLUDED.user_id, fcm_token = EXCLUDED.fcm_token, platform = EXCLUDED.platform, updated_at = now();
```
- Refresh: the same endpoint with the new token.
- Sign-out: `DELETE /me/devices/{installationId}` before the client drops its credentials. Do not assume it arrives
  (offline sign-out): the next registration from that installation by another user re-binds it, and sends always
  check the current binding.
- Account switch on one device: the re-bind above guarantees the old account's notifications stop.
- Invalid tokens: when FCM reports `registration-token-not-registered` or invalid argument for a token, delete it.
- Content: no sensitive data in the push body (it shows on lock screens and passes through provider logs). Send an
  id and let the app fetch details after authentication; this also prevents showing account A's data to account B.

## Deep links

Payloads carry a versioned, validated route (`{ v: 1, route: 'order', id: '...' }`), not a free URL. The client
validates the route and parameters; the backend still checks authorization when the screen loads data.

## Preferences and delivery

- OS push permission and the user's marketing or transactional preferences are different things; enforce the server
  preferences at send time.
- A provider's success response means accepted, not delivered or read.
- Retries after a timeout can duplicate. Use provider idempotency when offered; otherwise accept and document the
  residual risk, and dedupe on your side by notification id where the client can.
- Check payload size limits and platform behaviour (data vs notification messages) in the current FCM docs.
