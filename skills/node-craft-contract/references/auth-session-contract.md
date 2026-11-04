# Auth, session and account contract

Server-side verification and authorization rules: `node-craft-arch` → `references/auth.md`. This is the part clients
depend on.

## Credentials

- Mobile and server clients: `Authorization: Bearer <token>` (a Firebase ID token when Firebase Auth is used). The
  client refreshes the token with its SDK; the backend does not issue a second refresh token on top of Firebase.
- Web clients with cookies: session cookie (`Secure`, `HttpOnly`, `SameSite`) plus a CSRF token on state-changing
  requests. Document which clients use which; do not assume the mobile flow for the web.

## Outcomes

| Status | Code | Client does |
|---|---|---|
| 401 | `AUTH_INVALID` | Refresh the token once, retry the request once; on a second 401, sign out |
| 401 | `AUTH_REQUIRED` | No token was sent: get one (sign in), do not loop on refresh |
| 401 | `AUTH_REVOKED`, `ACCOUNT_DELETED` | Sign out, clear user data |
| 403 | `ACCOUNT_BLOCKED` | Show the blocked state; do not retry |
| 403 | `FORBIDDEN` | Show no-access; do not retry |
| 404 | `RESOURCE_NOT_FOUND` | Also used for resources the user may not know exist |

## Identity mapping

The backend user id (`users.id`) is the one id clients use for the user in API paths, analytics `identify` and the
purchase provider's customer user id. The identity provider id (Firebase `uid`) stays an auth detail. Document the
mapping in OpenAPI (`GET /me` returns `id`) and in `STACK.md`.

`GET /me` returns the profile, preferred locale, time zone, entitlements derived on the server, and account status.
Clients read premium access from here (or from the purchase SDK for display only), never send it.

## Account switch and sign-out

- Sign-out: the client calls `DELETE /me/devices/{installationId}` (push token unlink) before dropping credentials,
  then clears user-bound caches and storage in one reset routine. If the call cannot reach the server, the next
  registration from that installation re-binds the token (`node-craft-arch` → `references/notifications.md`).
- Account switch on the same device follows sign-out then sign-in; nothing cached for user A is shown to user B.

## Account deletion

- `DELETE /me` (or `POST /me/deletion`) starts deletion. If it is not immediate: `202` with
  `{ data: { status: 'scheduled', effectiveAt } }`, `GET /me/deletion` for status, and `DELETE /me/deletion` to cancel
  within the window if the product offers one.
- Document what is removed, anonymized or kept (legal retention), and what happens to active subscriptions (the store
  subscription is not cancelled by deleting the account; tell the user).
- Failures are visible states, not silent retries forever.

## Minimum version and maintenance

If the product needs force update, maintenance mode or kill switches, choose **one** authority (a backend endpoint
such as `GET /app-config` or Remote Config) and document it. Two sources that can disagree are a bug. A backend
authority returns `400` (or `403`) with a documented `APP_VERSION_UNSUPPORTED` code for clients below the minimum
(not `426`, which means a protocol upgrade), and `503`
`MAINTENANCE` with `Retry-After` during maintenance.
