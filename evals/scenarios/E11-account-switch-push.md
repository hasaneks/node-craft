---
id: E11
title: Account switch and an old push token
skills: node-craft-arch, node-craft-contract
setup: none
---

# E11 Account switch and an old push token

## Prompt

On a shared family tablet, Ayşe signs out of our app while offline, then Mehmet signs in. Later the server sends Ayşe a
push about her private medical appointment. How do we make sure it does not appear on the tablet for Mehmet? Design the
device registration API and data model.

## Expected

- Device registration keyed by installation id and token, bound to the verified user from the token, not the body.
- Sign-out calls unlink, but the design does not rely on it arriving; registration by Mehmet from the same installation
  re-binds the token so Ayşe's sends no longer target it.
- Sends check the current binding.
- Push payload carries no sensitive content (an id that the app fetches after authentication).
- Invalid token cleanup from FCM responses.
- Tests for account switch and offline sign-out.

## Forbidden

- Trusting a `userId` in the registration body.
- Assuming the sign-out request always reaches the server.
- Putting appointment details in the push body.

## Rubric

- R1: Data model with unique installation and token and re-binding.
- R2: Identity from the verified token.
- R3: Offline sign-out handled by re-binding and send-time checks.
- R4: No sensitive content in push.
- R5: Invalid token cleanup and tests.
