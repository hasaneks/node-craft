---
name: node-craft-fix
description: "Fixes a bug, failing test or regression in a Node.js/TypeScript backend with evidence: record the current test state, reproduce the failure through the real entry point (route, job, webhook, migration), write a regression test that fails for the right reason, make the smallest correct fix, prove it with the related tests, and report what was and was not verified. Never weakens, skips or deletes tests to get green and never turns a fix into an unrequested architecture change. Use when something is broken, a test fails, an endpoint returns the wrong status or data, a job misbehaves, or a production incident needs a code fix."
---

# Fix a backend bug

Follow `node-craft` for the working rules. A fix is a small, proven change, not a refactor of everything nearby.

| Step | Read |
|---|---|
| Reproduce, isolate, regression test, fix, prove | `references/reproduce-regress.md` |
| When a test may change and when it may not | `references/test-preservation.md` |

## 1. Baseline

Run the related tests before touching anything and record the result. Note which failures already existed. They are
reported as pre-existing, not silently fixed and not blamed on your change.

## 2. Reproduce

Reproduce through the same entry point that failed: the HTTP route (`app.inject`), the job handler with a real queue
when the bug is about retries, the webhook with the recorded payload, the migration on a copy of the previous schema.
Use real PostgreSQL for anything involving queries, constraints, transactions or concurrency. Note the inputs, the
actual result and the expected result. If you cannot reproduce it, say what you tried and what evidence is missing
(logs with the request id, payload, version); do not guess a fix.

## 3. Regression test (Red)

Write the test that captures the expected behaviour and fails on the current code **for the reason in the report**.
A test that fails because of an import, an env var or a missing container is not Red yet.

## 4. Smallest correct fix (Green)

- Fix the cause, not the symptom. A `try/catch` that hides the error, a default that masks missing data, or a retry
  that hides a race is not a fix.
- Keep the change inside the area of the bug. If the right fix needs a wider change (a missing constraint, a
  transaction boundary in another module, a contract change), make it with its own tests and say why. A rewrite or
  framework switch is a proposal, not part of the fix.
- Data already damaged by the bug (duplicates, wrong states) needs its own reviewed migration or script, with the
  impact stated and approval before running it on shared data.

## 5. Prove it

Run the regression test, the module's tests, and the tests of anything that shares the changed code. For a contract
change, regenerate OpenAPI and check compatibility (`node-craft-contract`). For a performance bug, before and after
numbers (`node-craft-perf`).

## 6. Report

Root cause in one or two sentences, the fix, the regression test, the commands run with results, pre-existing
failures, and what could not be verified.
