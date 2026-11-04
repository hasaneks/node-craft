# Using node-craft with rn-craft (optional)

[rn-craft](https://github.com/hasaneks/rn-craft) is a React Native skill and lint package. node-craft does not depend
on it, and it does not depend on node-craft. This guide is for teams that use both: a React Native app built with
rn-craft and a backend built with node-craft. Everything node-craft says about the API contract works without this
file.

- Reviewed rn-craft commit: `949cb6a416b5035dba1126d6515cbee638855c59` (package version 0.2.0), on 2026-11-04.
- Proposed changes to rn-craft: [`rn-craft-companion.patch`](rn-craft-companion.patch). It applies cleanly to that
  commit (`git apply --check`). It has **not** been merged into rn-craft; nothing below exists in rn-craft until it is.

## What rn-craft already has

| Topic | In rn-craft 0.2.0 (`skills/rn-craft-arch/references/`) |
|---|---|
| One API layer | RTK Query `createApi` with a custom `baseQuery` that maps failures to a typed `ApiError` (`data.md`) |
| Idempotency | Sends an `Idempotency-Key` (uuid per user action) when the backend supports it; no blind retry of writes (`data.md`) |
| Retries | Only idempotent reads and network/5xx, capped (`data.md`) |
| Firebase identity | ID token from `getIdToken()` per request; no second refresh mechanism (`data.md`) |
| Pagination | Infinite queries or page merge (`data.md`) |
| Session reset | One `resetSession()` for sign-out, account switch, deletion (`firebase-notifications.md`, `storage-security.md`) |
| App language | i18next with saved preference → device locale → fallback (`i18n.md`) |

## Gaps found

| Gap | Where | Why it matters |
|---|---|---|
| `ApiError` has no `code`, keeps `requestId` only for server errors, and maps validation fields to plain strings | `data.md` | Screens cannot branch on stable codes; support loses the request id; field error codes are lost |
| No `conflict` (409) or `rateLimited` (429) case, no `Retry-After` | `data.md` | 409 and 429 fall into `server`, and a client may retry what cannot succeed |
| The backend's wire format is not defined | `data.md` | Each app writes its own mapping |
| "Tell the backend" about language changes, without a header or resolution order | `i18n.md` | The backend cannot localize errors per request or know when the profile changes |
| Push token sent "with the user id" | `firebase-notifications.md` | A body `userId` must not be the authority; the backend takes the user from the token |
| `identify(userId)` without saying which id | `monetization.md` | Adapty webhooks cannot be mapped to backend users reliably |

## Proposed companion changes

The patch makes these six changes. Each is written so rn-craft stays usable with backends that do not follow
node-craft.

### 1. Locale header and error mapping in the single `baseQuery`

```ts
const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiUrl,
  timeout: 15_000,
  prepareHeaders: async (headers) => {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-App-Locale', i18n.language);
    headers.set('X-App-Version', appVersion);
    return headers;
  },
});

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (args, api, extra) => {
  const result = await rawBaseQuery(args, api, extra);
  if (!result.error) return result;
  return { error: toApiError(result.error, result.meta?.response) };
};

function toApiError(error: FetchBaseQueryError, response?: Response): ApiError {
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') return { kind: 'network' };
  const body = (error as { data?: BackendError }).data;
  const code = body?.error?.code ?? 'UNKNOWN';
  const requestId = body?.requestId ?? response?.headers.get('x-request-id') ?? undefined;
  const retryAfter = Number(response?.headers.get('retry-after')) || undefined;
  switch (error.status) {
    case 400:
    case 422:
      return {
        kind: 'validation',
        code,
        message: body?.error?.message ?? '',
        fields: Object.fromEntries((body?.error?.details ?? []).map((d) => [d.field, { code: d.code, message: d.message }])),
        requestId,
      };
    case 401: return { kind: 'unauthorized', code, requestId };
    case 403: return { kind: 'forbidden', code, requestId };
    case 404: return { kind: 'notFound', code, requestId };
    case 409: return { kind: 'conflict', code, message: body?.error?.message ?? '', retryAfter, requestId };
    case 429: return { kind: 'rateLimited', code, retryAfter, requestId };
    default: return { kind: 'server', status: Number(error.status) || 0, code, retryAfter, requestId };
  }
}
```

### 2. Field errors into react-hook-form

```ts
if (error.kind === 'validation') {
  for (const [field, e] of Object.entries(error.fields)) setError(field as FieldPath<Form>, { type: e.code, message: e.message });
}
```

The backend's message is already in the user's language (it resolved `X-App-Locale`). An app that prefers its own copy
maps `e.code` to its catalog instead; it never parses `message`.

### 3. 409 and 429 without losing status or retry information

`conflict` and `rateLimited` are new `ApiError` cases. `IDEMPOTENCY_IN_PROGRESS` (409 with `Retry-After`) may be retried
with the **same** idempotency key after the delay. Other 409 codes are shown to the user and need a refetch. `429`
waits for `retryAfter`; it is not a server error.

### 4. `{ data, meta }` and cursors

```ts
getOrders: build.infiniteQuery<OrdersPage, void, string | null>({
  infiniteQueryOptions: {
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.nextCursor, // null ends the list
  },
  query: ({ pageParam }) => ({ url: '/orders', params: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) } }),
}),
// screen: const orders = data?.pages.flatMap((p) => p.data) ?? [];
```

### 5. Identities, push tokens and `resetSession()`

| Id | Used for |
|---|---|
| Firebase `uid` | Auth only; the backend maps it to its user |
| Backend `users.id` (from `GET /me`) | Analytics `setUserId`, Adapty `identify`, support |
| Adapty customer user id | Equal to the backend user id, so webhooks map directly |

- Register the FCM token per installation: `PUT /me/devices/{installationId}`. The backend takes the user from the ID
  token, not from the body.
- `resetSession()`: `DELETE /me/devices/{installationId}` (best effort, offline-safe because the backend re-binds the
  installation on the next registration), `analytics.setUserId(null)`, Crashlytics user id cleared, Adapty `logout()`,
  `api.util.resetApiState()`, user storage cleared, then `auth.signOut()`.
- Premium access the app enforces comes from the backend (`GET /me` entitlements). The Adapty SDK profile drives the
  paywall display only.

### 6. One idempotency key per user action

```ts
const key = useRef(uuid());               // created when the user starts the action
const submit = () => createOrder({ body, idempotencyKey: key.current }); // retries reuse it
// after a definite success or a definite failure the user must fix, start a new action with a new key
```

rn-craft already recommends this; the patch only ties it to the error cases above.

## Monorepo notes

- Keep one package manager and Node version for the whole workspace. rn-craft's own repository uses npm with
  `package-lock.json` for its development; that is its choice and not a rule for apps.
- A shared `STACK.md` keeps rn-craft's mobile sections; the backend adds a `## Backend` section
  (`node-craft-init` → `references/stack-template.md`).
- In a shared ESLint config, scope `eslint-plugin-rn-craft` to the app's files (`apps/mobile/**`) and backend rules to
  the API's files. rn-craft's visual rules do not apply to API code.

## Without this guide

If rn-craft is not used, or the patch is not applied, node-craft still works: the contract lives in OpenAPI and
`node-craft-contract`, and any client (web, admin, another mobile stack) integrates through it.
