# Locale contract

## Headers

| Header | Direction | Meaning |
|---|---|---|
| `X-App-Locale` | request | The language the client is showing right now (BCP 47: `tr`, `en-GB`, `pt-BR`) |
| `Accept-Language` | request | Browser or OS preference list with quality values |
| `Content-Language` | response | The locale of the messages in this response |
| `Vary: Accept-Language, X-App-Locale` | response | For any shared cache in front of localized responses |

Every web and mobile client sends `X-App-Locale` with the language its UI is using. Changing the app language does
**not** change the saved profile preference by itself: the client calls the profile update endpoint
(`PATCH /me { preferredLocale }`) when the user chooses a language. The header never writes to the profile.

## Resolution order

1. `X-App-Locale`, if valid and supported.
2. The verified user's saved `preferredLocale`.
3. `Accept-Language`, by quality, first supported entry.
4. The project fallback (`en` unless decided otherwise).

An unsupported or malformed candidate is skipped; it never stops the search. `X-App-Locale: de` with a Turkish profile
resolves to `tr`, not to the fallback. Anonymous requests use 1, 3 and 4. The locale never grants permissions.

Matching: canonicalize the tag (`Intl.getCanonicalLocales`), try an exact supported match (`pt-BR`), then the same base
language (`en-GB` → `en`; `pt` → `pt-BR` when that is the only Portuguese). `Accept-Language` entries with `q=0` or
an invalid `q` are dropped, `*` is ignored, equal qualities keep header order.

Tested reference (from the node-craft repository's contract kit):

```ts
export function resolveLocale(input: LocaleInput): { locale: string; source: LocaleSource } {
  const candidates: [LocaleSource, string | undefined][] = [
    ['header', input.header],
    ['profile', input.profile],
    ...parseAcceptLanguage(input.acceptLanguage).map((tag): [LocaleSource, string] => ['accept-language', tag]),
  ];
  for (const [source, tag] of candidates) {
    const locale = tag ? matchSupported(tag, input.supported) : undefined;
    if (locale) return { locale, source };
  }
  return { locale: input.fallback, source: 'fallback' };
}
```

Resolve the locale before validation runs (an `onRequest` hook in Fastify, middleware or an interceptor in NestJS), so
validation errors are already localized.

## Who translates what

- The backend localizes what it produces: error messages, validation messages, emails, push text.
- Clients localize their own UI from their own catalogs. There is no shared translation file requirement.
- What is shared: error codes, field paths, enum values, payload shapes. A client may show the backend's `message`
  as is; it does not need to translate it again. A client that prefers its own copy maps `code` to its catalog.

## Asynchronous messages

Push and email resolve the **recipient's** current preferred locale at send time, not the sender's request locale
and not the server's. A deliberate snapshot at event time is a product decision recorded in the template
(`node-craft-arch` → `references/notifications.md`).

## Caching

Locale is part of every cache key for localized content. Public HTTP caching of localized responses sends `Vary` on
the locale headers. Responses for a signed-in user are `Cache-Control: private` (or `no-store`) and never enter a
shared cache.
