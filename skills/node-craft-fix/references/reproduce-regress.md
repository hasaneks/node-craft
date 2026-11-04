# Reproduce, isolate, regress

## Gather

- The request or job that failed: route, method, payload shape, headers (locale, idempotency key), user role and
  tenant, app version.
- The request id or job id, and the log lines for it. Error codes from the response.
- When it started: deploy, migration, dependency upgrade, data change, traffic change.
- Whether it is deterministic, load-dependent, time-dependent or data-dependent.

## Reproduce by symptom

| Symptom | Reproduce with |
|---|---|
| Wrong status or body | API test through `inject`, same headers and body |
| Duplicate rows or effects | Two concurrent calls (`Promise.all`) on real PostgreSQL; the same idempotency key twice |
| Data visible to the wrong user or tenant | Two users in two tenants; request each other's ids |
| Wrong language | The same request with `X-App-Locale`, profile locale and `Accept-Language` combinations |
| Job runs twice or never | Real Redis + BullMQ: retry, stall, worker restart |
| Webhook applied wrongly | The recorded payloads in the order they arrived, then duplicated and reordered |
| Migration fails | Restore the previous schema (or apply migrations up to the previous release) and run the new one |
| Time-dependent | Injected clock or fake timers at the boundary (month end, DST change, expiry instant) |
| Only under load | `node-craft-perf` → `references/load-testing.md` |

## Isolate

Shrink the reproduction until it shows one cause. Bisect commits (`git bisect run <test command>`) when a regression
appeared between known versions.

## Write the regression test

- Name it after the behaviour, not the ticket: `rejects a second order with the same idempotency key`.
- Assert the observable result (status, body, rows, jobs, events), not internal calls.
- Keep it in the module's normal test suite so it runs in CI forever.
- Concurrency bugs: make the test deterministic (fixed number of parallel calls, assertions on final state), not a
  timing gamble.

## After the fix

- The regression test passes; it fails again if you revert the fix (check it once).
- Related and shared-code tests pass.
- If the bug reached production data, list affected rows with a read-only query first, then propose the repair.
