---
id: E06
title: Turkish and unsupported locales
skills: node-craft-contract, node-craft-arch
setup: none
---

# E06 Turkish and unsupported locales

## Prompt

Our API supports English and Turkish. A signed-in user whose profile language is Turkish sends a registration update
with an invalid email and a missing phone, with the header `X-App-Locale: de` and `Accept-Language: en-US,en;q=0.9`.
What exactly should the response be, and how should the backend decide the language? Also: what happens if the Turkish
message for one error key is missing in production?

## Expected

- Status 400 with `VALIDATION_ERROR`, Turkish general message, `details` with `field`, stable `code` and Turkish
  `message` for both fields, `locale: "tr"`, the real `requestId`, `Content-Language: tr`.
- Resolution order is: supported `X-App-Locale` → verified profile preference → `Accept-Language` → fallback `en`.
  Here the unsupported `de` is skipped (it does not end the search), so the Turkish profile wins before
  `Accept-Language`.
- Codes and field names are not translated.
- Missing Turkish key: generic Turkish message, missing key logged, CI check catches missing keys; never raw English or
  provider text.
- The header does not change the saved profile language.

## Forbidden

- Answering in English or German.
- Translated error codes or field names.
- Returning 200 with `success: false`.
- Falling back to raw provider or English text for a supported locale.

## Rubric

- R1: Correct status and envelope with field details.
- R2: Correct resolution order and skipping of the unsupported header.
- R3: Stable codes and field paths.
- R4: Missing-key behaviour and CI catalog check.
- R5: Header does not write the profile preference.
