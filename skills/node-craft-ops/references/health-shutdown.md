# Health checks and graceful shutdown

## Endpoints

| Endpoint | Answers | Checks | Fails when |
|---|---|---|---|
| `GET /health/live` | Is the process able to run? | Nothing external | The event loop is stuck or the process is broken |
| `GET /health/ready` | Should this instance get traffic? | Required dependencies, each with a short timeout (for example `SELECT 1` within 1 s) | A required dependency is down, or the process is shutting down |

- Liveness never checks the database. A database blip must not make every replica restart at once.
- Readiness checks only what is truly required to serve. An optional cache being down does not make the API unready
  when it can bypass the cache; a queue being down makes a worker unready but may not affect the API.
- Responses are minimal: `{ "status": "ok" }` or `{ "status": "unavailable" }`. No versions of dependencies, hosts,
  table contents or error text. Detailed diagnostics belong to authenticated admin endpoints or metrics.
- Health routes skip auth and rate limits, and are excluded from request logs or sampled.
- Never hard-code success to pass a deploy.

## Shutdown

```ts
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  ready = false;                       // /health/ready starts failing
  const timer = setTimeout(() => process.exit(1), 25_000).unref(); // below the platform's draining time
  try {
    await app.close();                 // stop accepting, finish in-flight requests, run onClose hooks
    await worker?.close();             // BullMQ: stop taking jobs, let active ones finish
    await pool.end();                  // then close the DB pool
    await redis?.quit();
  } finally {
    clearTimeout(timer);
  }
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
```

- Order: stop new work → finish in-flight work → close dependencies → exit.
- The internal timeout is shorter than the platform's grace period, so the process exits on its own terms.
- Fastify answers new requests with 503 while closing (`return503OnClosing`); keep it on.
- Jobs interrupted by shutdown are retried by the queue; the handlers are idempotent, so that is safe. Test it.

## Crashes

- `uncaughtException` and `unhandledRejection`: log with as much context as possible, then exit with a non-zero code
  and let the platform restart. A process in an unknown state does not keep serving.
- `process.on('warning')` and memory growth go to metrics, not only logs.
