# contract-kit

Tested reference code that the node-craft skills quote. It is a fixture, not a framework or a product: small enough to
read, real enough to run against PostgreSQL.

| File | What it shows | Tests |
|---|---|---|
| `src/locale.ts` | `X-App-Locale` → profile → `Accept-Language` → fallback, BCP 47 matching, quality values | `test/locale.unit.test.ts` |
| `src/errors.ts`, `src/i18n.ts`, `src/catalogs.ts` | Error envelope, status mapping, localized messages, missing-key fallback, catalog completeness | `test/errors.unit.test.ts` |
| `src/cursor.ts` | Signed, sort-bound opaque cursors | `test/cursor.unit.test.ts` |
| `src/orders.ts` | Idempotent order creation (repeat, concurrent duplicates, different payload, rollback), keyset pagination, owner and tenant scoping | `test/idempotency.int.test.ts`, `test/api.int.test.ts` |
| `src/outbox.ts` | Transactional outbox: claim with `SKIP LOCKED` and a lease, send outside the transaction, backoff | `test/outbox.int.test.ts` |
| `src/app.ts` | Fastify with TypeBox: request id validation, locale before validation, field errors, unknown fields rejected, response schemas | `test/api.int.test.ts` |

## Run

```bash
yarn install --immutable
yarn typecheck
yarn test:unit
yarn test:integration   # starts postgres:18-alpine with Testcontainers
```

Integration tests need a container runtime. With Colima:

```bash
export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
```

Node runs the TypeScript files directly (type stripping), so there is no build step. Yarn is pinned in
`.yarn/releases` through `yarnPath`, so Corepack is not needed.
