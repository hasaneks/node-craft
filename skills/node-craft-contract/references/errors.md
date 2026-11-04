# Error model

## Wire format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Lütfen işaretli alanları kontrol edin.",
    "details": [
      { "field": "email", "code": "INVALID_EMAIL", "message": "Geçerli bir e-posta adresi girin." }
    ]
  },
  "locale": "tr",
  "requestId": "4f9c2d1e-8a7b-4c3d-9e2f-1a2b3c4d5e6f"
}
```

- `code`: stable, upper snake case, never translated, never reused for a different meaning. Clients branch on it.
- `message`: safe, localized text for the resolved locale. Clients may show it; they never compare it.
- `details[]`: field errors with `field` (path in the request: `email`, `items.0.quantity`), a stable `code`, and a
  localized `message`. Clients map `field` to form inputs.
- `locale`: the language the messages are in (also sent as `Content-Language`).
- `requestId`: the real id of this request (also the `X-Request-Id` response header), for support and logs.
- The example ids and texts above illustrate the shape only.

## Status mapping (one central place)

| Status | When | Example codes |
|---|---|---|
| 400 | Invalid input, bad cursor, missing required header | `VALIDATION_ERROR`, `INVALID_CURSOR`, `IDEMPOTENCY_KEY_REQUIRED` |
| 401 | No identity, invalid or revoked token, deleted account | `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_REVOKED`, `ACCOUNT_DELETED` |
| 403 | Identity known, action not allowed | `FORBIDDEN`, `ACCOUNT_BLOCKED` |
| 404 | Not found, or hidden on purpose | `RESOURCE_NOT_FOUND` |
| 409 | State conflict: version mismatch, duplicate, invalid transition, idempotency conflict | `CONFLICT`, `ORDER_NOT_CANCELLABLE`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS` |
| 429 | Rate or quota limit | `RATE_LIMITED` (+ `Retry-After`) |
| 500 | Unexpected failure | `INTERNAL_ERROR` |
| 503 | Temporary unavailability: dependency down, maintenance, overload shedding | `SERVICE_UNAVAILABLE`, `MAINTENANCE` (+ `Retry-After` when known) |

- Never `200` with `success: false`.
- 409 and 429 are different: 409 says "the state does not allow this", retrying the same request will fail again until
  the state changes; 429 says "slow down", retry after the given time. Neither is a transient server error. The one
  retryable 409 is `IDEMPOTENCY_IN_PROGRESS`: it carries `Retry-After` and is retried with the same key.
- 503 is for conditions expected to pass. Do not use 500 for "provider is down" when you know it is temporary.
- Choose 403 or 404 per resource type for resources the caller may not see, and apply it everywhere.
- Retryable errors are documented in OpenAPI. Clients do not retry writes on every 5xx
  (`references/idempotency-contract.md`).

## Implementation

Domain and application code throw typed errors with a code. One error handler turns anything into the wire format.
Tested reference (from the node-craft repository's contract kit):

```ts
export function toErrorResponse(error: unknown, context: { t: Translate; locale: string; requestId: string }) {
  const appError = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', { cause: error });
  const { t, locale, requestId } = context;
  const generic = () => t('errors.INTERNAL_ERROR', locale) ?? 'Something went wrong. Please try again.';
  const message = (key: string) => t(key, locale) ?? generic();

  const body: ErrorBody = {
    error: { code: appError.code, message: message(`errors.${appError.code}`) },
    locale,
    requestId,
  };
  if (appError.details?.length) {
    body.error.details = appError.details.map((d) => ({ ...d, message: message(`validation.${d.code}`) }));
  }
  const headers: Record<string, string> = {};
  if (appError.retryAfterSeconds !== undefined) headers['retry-after'] = String(appError.retryAfterSeconds);
  return { status: STATUS[appError.code], headers, body };
}
```

- Framework validation errors (Ajv in Fastify, `ValidationPipe` in NestJS) are mapped to `VALIDATION_ERROR` with
  field details: `required` → `REQUIRED`, `format: email` → `INVALID_EMAIL`, unknown property → `UNKNOWN_FIELD`, and
  so on. Sort details by field so responses are stable.
- Unexpected errors are logged with the request id and full detail; the response gets the generic message only.
- Never in a response: SQL, table or constraint names, stack traces, tokens, connection strings, internal hosts, raw
  provider error text.
- A missing translation in a supported locale yields the generic message **in that locale** and logs the missing key.

## Tests

A test per status the endpoint can return; a Turkish validation error asserting codes unchanged and messages in
Turkish; an unexpected error asserting no internal text leaks; a CI check that every code in the registry has a
message in every supported locale.
