# Proposal

## Why

The Win98 desktop (repo `win98-web`, change `add-msn-messenger-app`) now shows the MSN app inside a Win98 window by framing it from the same origin. MSN currently sends no framing headers, so any website can embed the MSN login and chat pages in an iframe and overlay or phish around them (clickjacking). Same-origin framing is the only legitimate use, so the app should say so explicitly instead of staying open to everyone.

## What Changes

- The MSN nginx adds `Content-Security-Policy: frame-ancestors 'self'` and the legacy `X-Frame-Options: SAMEORIGIN` to every response that serves the MSN frontend HTML: the SPA fallback (`/`, `/login`, `/chat/...`, `/fotolog/...`, `/winamp`), `/admin` and `/admin/`, `index.html` and `redirect.html`.
- The headers are declared per location, not at server level, so the `/win98-web/` proxy keeps passing through the Win98 container's own headers unchanged.
- The routing harness `scripts/win98-routing/verify.sh` gains a framing-policy section, written first so it fails before the nginx change.
- The README "Win98 hosting" section documents the policy and how to allow one more origin.
- No change to the frontend, the Express API, the database, the Win98 repo, or the Vite dev server.

## Capabilities

### New Capabilities

- `embedding-policy`: which origins may embed MSN pages in a frame, and which responses carry that policy.

### Modified Capabilities

None. `win98-hosting` requirements (routing, redirects, isolation) do not change.

## Impact

- **Side affected**: `nginx.conf` only, plus the verification script and README. No frontend (`src/`), backend (`server/`) or database change. `graphify affected` does not apply.
- **Existing modules to keep intact**: the current locations (`/ws`, the REST prefix regex, the `/fotolog` regex, `/assets/`, `/version.json`, `/win98*`, the SPA fallback). Their behavior and cache headers must not change.
- **Tenant and auth impact**: none on data. Admin and Microsoft-only rules are untouched. Microsoft sign-in keeps working: MSAL's popup is a top-level window and any hidden frame MSAL loads from MSN is same-origin, which `frame-ancestors 'self'` permits.
- **Behavioral impact**: pages on other origins can no longer frame MSN. The Win98 window keeps working in production because it is served from the same origin. In local development with `VITE_MSN_URL` pointing at the Vite dev server (`localhost:5179`), nginx is not involved, so framing stays unrestricted there.
- **Rollout impact**: nginx config change only; no env vars, flags or schema. Deploy: `git pull`, `docker compose build web`, `docker compose up -d web` (a few seconds of blip while `web` is recreated). Rollback: revert the change and recreate `web`.
- **Depends on**: nothing in code. It should ship after, or together with, the Win98 MSN app so the framing use case can be verified end to end.

## Non-goals

- Restricting who can frame the Win98 app itself (`/win98-web/` is served by its own container).
- A full Content-Security-Policy for MSN (scripts, styles, connect). Only `frame-ancestors` is set.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy` or other hardening headers. Worth a separate change.
- Changing the Vite dev servers.
- Allowing additional embedding origins now. The policy is `'self'` only; an allow-list is a documented, deliberate edit.
- Rotating the committed `throwback-in-time.pem` key, which remains its own change.
