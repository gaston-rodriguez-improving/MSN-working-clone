# Proposal

## Why

The company wants the Windows 98 Web Edition (separate repo `win98-web`) available on the same EC2 host and domain as MSN-working-clone. The URL users type and share is `/win98`; it redirects to the app's canonical path `/win98-web/` (the path the app is built for). MSN already runs as Docker Compose services (`api`, `web`) with `web` (nginx) as the single public entry point on port 80. Adding win98-web as one more compose service behind that nginx needs no new host, port, DNS record or TLS setup. We keep the two repositories separate (different toolchains, ~100 MB of static assets, upstream fork history), so MSN only gains routing and a service definition.

This is the second half of the plan. The first half is `add-container-image` in win98-web, which delivers an image that serves the site under `/win98-web/` and exposes `/healthz` on port 80.

## What Changes

- Add a `win98` service to `docker-compose.yml`, built from a sibling checkout of win98-web (`WIN98_CONTEXT`, default `../win98-web`), with no published host port and `restart: unless-stopped`.
- Add proxy routing to `nginx.conf`: `/win98` is the public entry point and redirects (temporary, `302`) to `/win98-web/`, keeping any sub-path and query string (`/win98/resume` goes to `/win98-web/resume`); `/win98-web/` is forwarded unchanged to the `win98` service; `/win98-web` redirects to `/win98-web/`.
- Resolve the `win98` upstream at request time (Docker DNS resolver plus a variable in `proxy_pass`) and do not make `web` depend on `win98`, so an outage or redeploy of win98 never prevents MSN from starting or serving.
- Add `scripts/win98-routing/` with a verification compose file (stub `api`, no database) and a curl-based check script, so routing is verified locally without touching the shared RDS database.
- Add `WIN98_CONTEXT` to `.env.example` and document the hosting and deploy steps in `README.md`.
- No frontend (`src/`), backend (`server/`) or schema changes.

## Capabilities

### New Capabilities

- `win98-hosting`: how the Windows 98 Web Edition is exposed under the main domain, how it coexists with the MSN routes, and how it behaves when unavailable.

### Modified Capabilities

None. MSN has no existing specs (`openspec/specs/` is empty).

## Impact

- **Side affected**: `nginx.conf` and `docker-compose.yml` (deployment). No frontend, backend or database change.
- **Existing modules**: none of `src/` or `server/`. `graphify affected` is not applicable (no shared hub is touched). The existing nginx locations (`/ws`, `/admin`, the REST prefix regex, the `/fotolog` regex, `/assets/`, `/version.json`, `/`) must keep their behavior; this is covered by the verification script.
- **Tenant and auth impact**: none on MSN data. `/win98-web/` is a static bundle served without MSN authentication, like the MSN login page. It does not call the MSN API and carries no company/event data.
- **Same-origin impact**: win98-web runs on the same origin as MSN, so its JavaScript can read MSN `localStorage` (`messenger_token`, `messenger_user`). Accepted for an internal tool; the mitigation path is a dedicated subdomain (see design).
- **Rollout impact**: new optional env var `WIN98_CONTEXT`; new compose service; nginx config change. Deploy order: build and start `win98` first, then rebuild or reload `web`. Rollback: remove the nginx block and `docker compose stop win98`. The EC2 host needs the win98-web repo cloned next to this one, enough disk for the image (~150 MB plus build cache) and enough memory (or swap) for the Vite build.
- **Depends on**: `add-container-image` in win98-web.

## Non-goals

- Merging the repositories or copying win98-web code into MSN.
- Putting `/win98-web/` behind MSN or Microsoft sign-in.
- A dedicated subdomain or separate origin (documented as an escape hatch, not built).
- Changing the win98 base path to `/win98`. The app hardcodes `/win98-web/` in about 100 places (vite `base`, profile logic, the vendored Paint port, e2e specs), so `/win98` is a redirect and the address bar ends on `/win98-web/`. The redirect is `302` so it can be re-pointed later (for example to a subdomain) without browsers caching it permanently.
- A registry-based deploy (GHCR/ECR) or CI for the EC2 rollout.
- Adding a link to Win98 inside the MSN UI.
- Handling the committed `throwback-in-time.pem` private key. That should be rotated and removed from git history in its own change.
