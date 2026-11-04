---
id: E10
title: Language change before a queued notification
skills: node-craft-arch
setup: none
---

# E10 Language change before a queued notification

## Prompt

An admin (who uses English) approves a Turkish user's application. That queues an email and a push notification.
Before the job runs, the user switches their language to English in the app and saves it. Which language should the
email and push use, and how should the job be designed?

## Expected

- The recipient's current preferred locale at send time (English after the change), not the admin's language or the
  language at queue time, unless a snapshot is a deliberate product decision.
- Job payload carries recipient id, template key and version, parameters; not pre-rendered text; no personal data
  beyond need.
- Notification preferences checked at send time; push body without sensitive data.
- Idempotent handler (job may run twice).
- A test that changes the locale before the job runs.

## Forbidden

- Using the admin's language.
- Rendering the text when queuing and sending it later.
- Non-idempotent sending without acknowledging duplicate risk.

## Rubric

- R1: Recipient's current locale at send time, with snapshot only as a stated choice.
- R2: Payload with template key, version and ids.
- R3: Preferences and sensitive content handling.
- R4: Idempotent handler.
- R5: Test for the locale change before send.
