# STACK.md template

`STACK.md` holds the decisions an agent must not guess. Every node-craft skill reads it first; what it says wins
over node-craft defaults.

If the repository already has a `STACK.md` with client sections (for example a React Native app set up with rn-craft),
do not rewrite the file. Add or edit one section titled `## Backend` and keep every other section as it is. If the API
lives in its own root, give it its own `STACK.md` and link the shared one.

```markdown
## Backend

### Service
- Name: example-api · Owner: <team>
- Clients: mobile (React Native), web admin · Old client support window: 2 minor app versions or 90 days
- Deploy: Railway · Services: api, worker · Regions: <verified region>

### Decisions (ADRs in docs/adr/)
- Framework: Fastify 5 (ADR 0001)
- Data: PostgreSQL <major> + Drizzle (ADR 0002)
- Validation and OpenAPI: TypeBox schemas → @fastify/swagger (single source)
- Auth: Firebase ID tokens verified with firebase-admin; backend `users.id` (uuid) is the internal id
- Optional infrastructure: Redis (rate limit, BullMQ) · BullMQ (email, push) · Outbox (orders.placed)
- Not used: Adapty, object storage

### Contract defaults
- Base path: /api/v1 · Success: { data, meta? } · Errors: { error: { code, message, details? }, locale, requestId }
- Locale: X-App-Locale → profile → Accept-Language → en · Supported: en, tr
- Pagination: cursor, default 20, max 100 · Idempotency-Key on: POST /orders, POST /payments

### Versions (verified YYYY-MM-DD)
| Package | Version | Notes |
|---|---|---|
| node | <Active LTS>.x.y | engines + .nvmrc |
| yarn | 4.x.y | packageManager |
| fastify | x.y.z | |

### Environments
| Env | API | Database | Redis | Firebase project |
|---|---|---|---|---|
| development | localhost | container | container | example-dev |

### Mocks
- Email provider: in-memory transport in development and tests (no real sends)
```
