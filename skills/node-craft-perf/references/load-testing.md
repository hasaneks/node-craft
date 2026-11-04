# Load testing

## Tools

`k6` or `autocannon` for HTTP load; a script that enqueues jobs at a rate for workers. Pick one per project.

## Setup

- Environment: staging or a dedicated performance environment with production-like instance classes. Never load test
  production or shared staging without approval.
- Data: a realistic volume and distribution (large tenants, long histories). Generate it with a script kept in the
  repository; never copy production personal data.
- Scenarios: the critical flows, mixed as in real traffic (reads and writes), with think time. Authenticate as many
  distinct users so caches and locks behave realistically.
- Warm up, then hold steady load, then a spike.

## Record

| Field | Example |
|---|---|
| Commit | `abc1234` |
| Environment | staging, api ×2 (1 vCPU / 1 GB), worker ×1, Postgres 2 vCPU |
| Data | 2 M orders, 50 k users, largest tenant 400 k orders |
| Load | 50 rps steady 10 min, spike 150 rps 1 min |
| Results | p50 / p95 / p99, throughput, error rate, DB CPU, pool wait, event loop p99 |

Compare before and after under the same row. A result from a different data set or load is not a before/after
comparison.

## Honest reporting

- A load test that was not run is reported as not run, with the reason.
- Local laptop numbers are labelled as such and not compared to budgets.
- Report the failures seen during the test, not only the averages.
