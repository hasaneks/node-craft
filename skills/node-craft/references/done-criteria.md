# Definition of done

A feature is not done because an endpoint returns a response. Go through each item that applies and answer the
question with evidence (a test, a command output, a file).

| Item | Question | Evidence |
|---|---|---|
| Business rule | Does the behaviour match the agreed rule, including its error cases? | Unit and API tests |
| Contract | Are request, response, status codes and error codes in OpenAPI and validated at runtime? | Contract test, generated spec diff |
| TDD | Was each behaviour test seen failing for the right reason before the code? | Red and Green runs, reported |
| Existing tests | Were they kept? Is every test change justified as approved change or wrong test? | Test diff with reasons |
| Authentication | Does every protected route reject a missing, invalid, expired or revoked identity as decided? | API tests for 401 |
| Authorization | Is ownership and permission checked for the specific resource, not only the role? | API tests for 403/404 |
| Tenant isolation | Does knowing another tenant's id give nothing: no row, no cache entry, no file, no job? | Cross-tenant test |
| Locale | Are user messages in the resolved language and machine codes unchanged? Missing keys caught? | Locale tests, catalog check |
| Data integrity | Are `NOT NULL`, `UNIQUE`, `FOREIGN KEY`, `CHECK` and indexes in a migration? | Migration + integration test |
| Concurrency | Can two requests at once break a unique rule, quota or balance? | Concurrent integration test |
| Idempotency | Can a retried critical write duplicate its effect? | Duplicate and same-key/different-payload tests |
| Side effects | Can the DB change commit while the job, email or provider call is lost (or the reverse)? | Outbox test or stated risk |
| Performance | Is the endpoint and query inside its budget with realistic data? | `EXPLAIN`, query count, load result |
| Privacy | Do logs, errors, events and payloads leave out secrets and unneeded personal data? | Redaction test, log sample |
| Docs | Are migration notes, OpenAPI, ADRs, `.env.example` and runbooks updated? | Diff |
| Operations | Do build, start, health check and migration release work on the project's platform? | Staging run, or named gap |

## Reporting

At the end of the task, say:

- what changed (files and behaviour);
- what was run, with the command and the result;
- what was not run and why (no runtime, no access, out of scope);
- remaining blockers and the decision each one needs.

A check that was not run is reported as not run. "Should work" is not a result.
