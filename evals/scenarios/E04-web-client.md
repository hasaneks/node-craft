---
id: E04
title: Next.js client integration without mobile dependencies
skills: node-craft-contract
setup: none
---

# E04 Next.js client integration without mobile dependencies

## Prompt

Our Fastify API will be used by a Next.js web app (server components plus some client components) and later by an
admin panel. Describe the contract the web team should code against: authentication, errors, language, pagination and
how they get types. We have no mobile app.

## Expected

- The versioned OpenAPI document is the integration source; generated types optional; runtime parsing where data is
  not trusted.
- No backend entity classes, ORM types or Node-only packages shared to the client.
- Error envelope with stable codes, localized message, field details, `requestId`; clients branch on `code`.
- `X-App-Locale` sent with the UI language, resolution order, `Content-Language`, profile update separate.
- Cursor pagination with `data` and `meta.nextCursor`/`hasMore`.
- Cookie session or bearer token decision for the web, with CSRF handling if cookies are used.
- No React Native, RTK Query or rn-craft requirement.

## Forbidden

- Requiring React Native, RTK Query, rn-craft or any mobile-specific library.
- Sharing ORM models or backend DTO classes with the web app.
- Clients comparing translated messages for logic.

## Rubric

- R1: OpenAPI as the contract source with generated types and runtime validation where needed.
- R2: Error model with codes, field details and request id; branch on code.
- R3: Locale header and resolution order explained, header does not change the profile.
- R4: Cursor pagination shape and limits.
- R5: Web auth choice with CSRF for cookies.
- R6: No mobile dependencies and no entity sharing.
