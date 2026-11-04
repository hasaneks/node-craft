# Environments, configuration and secrets

## Environments

- Separate configuration for development, test, staging and production.
- Each environment has its own PostgreSQL, Redis/queue, Firebase project, provider accounts or sandbox, and storage
  bucket. Nothing is shared by accident; a shared resource is a written decision.
- Staging never receives uncontrolled copies of production personal data. If realistic data is needed, use
  anonymized data and record how it was produced.
- Map client and backend environments explicitly. A mobile staging build talks to the staging API, the staging
  Firebase project and the provider's sandbox; never mix staging tokens with the production API.

| Environment | API URL | Database | Redis | Firebase project | Storage | Providers |
|---|---|---|---|---|---|---|
| development | local | local container | local container (if used) | dev project | local or dev bucket | sandbox |
| staging | staging URL | staging DB | staging Redis | staging project | staging bucket | sandbox |
| production | production URL | production DB | production Redis | production project | production bucket | live |

## Config schema

Parse and validate `process.env` once at startup, into a typed, frozen object. Everything else imports the object,
never `process.env`.

```ts
import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SUPPORTED_LOCALES: z.string().default('en,tr').transform((s) => s.split(',').map((x) => x.trim())),
  FALLBACK_LOCALE: z.string().default('en'),
  REDIS_URL: z.string().url().optional(), // only when Redis is used
  // Hop count of trusted proxies (or a CIDR list), never `true`: `true` trusts a client-supplied X-Forwarded-For.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${fields}`); // names only, never values
  }
  return Object.freeze(parsed.data);
}
```

- Parse booleans and numbers explicitly; `"false"` is a truthy string.
- The error lists variable names, never their values.
- Use the schema library the project already uses (TypeBox, Zod, Valibot, `env-schema` for Fastify, Nest
  `ConfigModule` with validation).

## `.env.example`

Every variable name with a one-line description and a safe sample (`postgres://app:app@localhost:5432/app_dev`).
No real secret, token or production host. Commit `.env.example`; ignore `.env*` otherwise.

## Secrets

- Never in the repository, Docker image layers, example files, test fixtures, logs, error responses or client
  bundles. A public mobile or web config (Firebase web config, API base URL) is not a backend secret; keep the two
  lists apart.
- Use the platform's secret store or environment variables, scoped to the services that need them.
- Separate roles: the API's database user does not own the schema in routine operation; migrations run with a user
  that can change the schema; operations and read-only analytics users are separate when needed.
- Document what a rotation needs: which services restart or redeploy, and whether old tokens stay valid during the
  switch.
- Ask for missing access at the integration step. Never ask the user to paste a secret into the chat; tell them which
  variable to set where.
