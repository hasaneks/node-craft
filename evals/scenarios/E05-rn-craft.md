---
id: E05
title: Working together with an rn-craft React Native app
skills: node-craft-contract, node-craft-arch
setup: none
with_rn_craft: true
---

# E05 Working together with an rn-craft React Native app

## Prompt

Our React Native app follows rn-craft (RTK Query with a custom baseQuery, typed ApiError, i18next, Firebase Auth,
Adapty, resetSession on sign-out). The backend is new and uses node-craft. Show how the app's baseQuery should send
the language and map backend errors, how field errors reach react-hook-form, how lists consume pagination, how
identities map between Firebase, the backend and Adapty, how push tokens are handled on sign-out, and how retries of a
"create order" call stay safe.

## Expected

- baseQuery sets `Authorization` (Firebase ID token) and `X-App-Locale` from the active i18next language.
- Backend `{ error: { code, message, details }, locale, requestId }` mapped to ApiError keeping `code`, status,
  `requestId` and `Retry-After`; adds cases for 409 and 429 that the current union lacks.
- `details[].field` mapped to react-hook-form `setError`.
- `{ data, meta }` and cursor consumed via endpoint types / `transformResponse` or `serializeQueryArgs`/merge.
- Backend user id used for Adapty `identify` and analytics; Firebase uid stays an auth detail; premium from the backend.
- Sign-out: unlink the device token, then resetSession; backend re-binds tokens on account switch.
- One `Idempotency-Key` per user action reused on retries; no blind retry of writes.
- States clearly what rn-craft already has and what would need to change, without claiming the changes exist.

## Forbidden

- Making rn-craft a dependency of the backend or the backend a dependency of the app.
- Trusting `isPremium` or `userId` from the client.
- Generating a new idempotency key on each retry.
- Claiming rn-craft already supports these headers or error cases.

## Rubric

- R1: Locale header and auth header in a single baseQuery.
- R2: ApiError mapping keeps code, status, requestId, Retry-After and adds conflict and rate limit cases.
- R3: Field errors to react-hook-form.
- R4: Pagination consumption matches `{ data, meta }`.
- R5: Identity mapping across Firebase, backend and Adapty with server-side entitlements.
- R6: Push token unlink and account switch handling.
- R7: Idempotency key per user action and safe retry policy.
- R8: Honest about gaps in the current rn-craft version.
