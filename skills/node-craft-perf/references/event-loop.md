# Event loop, CPU and memory

## Keep the loop free

- No synchronous file or crypto work in request handlers (`readFileSync`, `pbkdf2Sync`, `zlib.*Sync`). Startup code
  and build scripts may use sync I/O; request paths may not.
- CPU-heavy work (image processing, PDF rendering, large JSON transforms, compression of big payloads) goes to a
  worker process, `worker_threads` (a pool such as Piscina), or a separate service.
- Large `JSON.parse`/`JSON.stringify` blocks too. Bound request bodies; paginate responses; stream large exports.
- Measure with `perf_hooks.monitorEventLoopDelay()` exported as a metric (p99 delay), and a CPU profile when it rises.

## Concurrency and backpressure

- No unbounded `Promise.all(items.map(callProvider))`. Use a concurrency limit (`p-limit`, batches) set together with
  the DB pool and the provider's rate limit.
- Retries are bounded and live in one layer. A client retry × a gateway retry × an SDK retry multiplies load during an
  outage.
- Every outbound call has a timeout. Total request time stays inside the client's timeout.
- Under overload, reject early and clearly (429 or 503 with `Retry-After`, `@fastify/under-pressure` style checks)
  instead of buffering without limit.
- Streams respect backpressure (`pipeline`, `for await`), never collect a stream into memory to forward it.

## Memory

- Growth over time: compare heap snapshots before and after a load phase; look for caches without bounds, listeners
  added per request, timers never cleared, closures holding request objects.
- In-process caches have a maximum size and TTL (`lru-cache`), and are per replica.
- Set the container memory limit and let Node see it (current Node versions read cgroup limits; check
  `--max-old-space-size` only if measurements say so).
