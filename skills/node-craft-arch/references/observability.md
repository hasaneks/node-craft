# Logging, observability and audit

## Logs

- Structured JSON to stdout/stderr with Pino (Fastify's built-in logger, `nestjs-pino` in NestJS). Pretty printing
  only in development.
- Every line carries: service, environment, app version (commit), request id, and where relevant user id (internal),
  tenant id, operation, duration, error code.
- Request id: accept an incoming `X-Request-Id` only if it matches a strict pattern and length (for example
  `^[A-Za-z0-9-]{8,64}$`); otherwise generate one. Return it in the response header and in error bodies. Carry it into
  DB statement comments when useful, provider calls, outbox rows and job payloads so one request can be followed end
  to end.
- Redaction is central and configured once:

```ts
const logger = {
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.idToken',
      '*.refreshToken',
      '*.apiKey',
      '*.email',
      '*.phone',
    ],
    censor: '[redacted]',
  },
};
```

- In Pino's redaction paths `*` matches exactly one level: `*.email` does not cover `order.contact.email` or
  `req.body.email`. List the nested paths you log (`*.*.email`, `req.body.email`) or avoid logging bodies, and assert
  redaction in a test.
- Operational logs use one language and stable codes; user-facing localized messages are not what you log.
- Never log full request bodies by default.

## Metrics and alerts

Watch: request rate, error rate and latency per route class (p95, p99), DB pool usage and wait time, slow queries,
lock waits, Redis memory and latency, queue wait time, job duration, failed job count, outbox lag, event loop delay,
memory and restarts.

- Metric labels have bounded cardinality: route templates, not URLs; never user ids or emails.
- Each alert has an owner and a first response step in the runbook (`node-craft-ops` → `references/runbooks.md`).
  Collecting logs is not monitoring.
- Tracing (OpenTelemetry) when the system is large enough to need it (several services, queues, providers). Installing
  a tool is not the goal; answering "where did this request spend its time" is.

## Audit records

Separate from logs. For admin actions, permission changes, entitlement changes, sensitive data access and deletions:
actor, time, resource, action, result, request id. Append-only for the application, retained per policy, without
full sensitive payloads.
