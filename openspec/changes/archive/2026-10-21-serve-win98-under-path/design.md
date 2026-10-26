# Design

## Context

See proposal.md for motivation. Current state and constraints:

- `docker-compose.yml` defines `api` (Express on 3001, `expose` only) and `web` (nginx, `ports: "80:80"`). `web` has `depends_on: api (service_healthy)` and builds the frontend with `Dockerfile` (`node:22-alpine` then `nginx:stable-alpine`).
- `nginx.conf` proxies to `http://api:3001` using literal host names, so nginx resolves `api` once at startup. Locations today: `~ ^/fotolog/(users|...)`, `/ws`, `= /admin`, `= /admin/`, `~ ^/(auth|admin|users|friends|friend-requests|conversations|messages|unread-messages|music|health)(/|$)`, `/assets/`, `= /version.json`, and the SPA fallback `/`. No gzip, no `add_header` at server level.
- TLS termination is not visible in this repo (nginx listens on 80 only). The design does not depend on where it happens.
- The MSN frontend keeps its session in `localStorage` (`messenger_token`, `messenger_user`). It does not use a service worker.
- The shared RDS database must never be used for tests. The real `api` needs `server/.env` and the RDS CA bundle, so a local routing check needs a stub `api`.
- The win98 image (from `add-container-image`) listens on port 80, serves the `/win98-web/` prefix itself, and exposes `/healthz`.

## Goals / Non-Goals

**Goals:**
- `/win98-web/` works on the existing domain with the smallest change to MSN.
- MSN availability is independent of win98 availability, and win98 can be redeployed on its own.
- The routing can be verified locally and repeatedly without RDS.

**Non-Goals:**
- Authentication, a separate origin, a registry-based deploy and a link in the MSN UI (see proposal Non-goals).
- Reworking the existing nginx locations.

## Decisions

**1. Separate repos, separate container, shared nginx entry point.** `win98` is a new compose service; the existing `web` nginx is the only public listener.
- Alternatives: merge repos (rejected, see proposal); a second nginx or Caddy edge in front of both (cleaner at larger scale, but one more moving part and a port-80 ownership change for no current benefit).
- Scale path: because routing is by path prefix, moving win98 to another host, S3 + CloudFront or a subdomain only changes the `proxy_pass` target.

**2. Build source is a sibling checkout via `WIN98_CONTEXT`.** `build: { context: ${WIN98_CONTEXT:-../win98-web} }`.
- Why: works with the current "build on the EC2 host" flow, supports private repos using the host's existing git access, and `WIN98_CONTEXT` can be set to a git URL (`git@github.com:gdominguezl/win98-web.git#main`) or later replaced by `image:` without touching nginx.
- Alternative: pin by git URL in the compose file. Rejected: requires repo credentials inside the Docker build and hides which commit is deployed.

**3. Request-time upstream resolution and no `depends_on`.** In the `server` block add `resolver 127.0.0.11 valid=10s ipv6=off;` and in the win98 location use `set $win98_upstream http://win98:80;` followed by `proxy_pass $win98_upstream;`.
- Why: with a literal host, nginx exits at startup with "host not found in upstream" if `win98` is down, which would take MSN down with it. With a variable, nginx resolves per request through Docker's embedded DNS (`127.0.0.11`) and returns `502` for the Win98 prefix only. It also picks up a recreated container's new IP within `valid=10s`.
- With a variable and no URI part, nginx passes the original request URI (path and query) unchanged, which is what the container expects (its decision 1).
- Alternative: literal `proxy_pass http://win98` plus `depends_on: service_healthy`, like `api`. Rejected: couples MSN uptime and restarts to win98.
- The existing `api` locations are not changed. They keep their literal `proxy_pass` because MSN cannot work without `api` anyway.

**4. Location layout (placed before `location /`).**
```
absolute_redirect off;   # server level, so every Location below is relative
location = /win98     { return 302 /win98-web/$is_args$args; }
location ^~ /win98/   { rewrite ^/win98/(.*)$ /win98-web/$1 redirect; }
location = /win98-web { return 301 /win98-web/; }
location ^~ /win98-web/ {
  set $win98_upstream http://win98:80;
  proxy_pass $win98_upstream;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```
- `/win98` is the URL users type and share. It is a redirect rather than the canonical path because win98-web hardcodes `/win98-web/` (vite `base`, `os-init.js` profile parsing, absolute Paint asset URLs, e2e specs, about 100 occurrences). Rewriting those would touch vendored code and diverge from the upstream fork; proxy-rewriting `/win98/` to the container would break profile paths, the `404.html` redirect and the service-worker scope. `/win98/<path>` redirects to `/win98-web/<path>` (the `rewrite ... redirect` keeps the query string) so `/win98/resume` works.
- The alias uses `302`, not `301`: browsers cache `301` indefinitely, which would make it painful to re-point `/win98` later (for example to a subdomain). `/win98-web` to `/win98-web/` is a pure slash normalization and stays `301`.
- `^~` makes the prefix win over any regex location added later, so a future MSN REST prefix cannot hijack Win98 paths. Current regexes are anchored (`^/(auth|...)`) and do not match `/win98-web/...`.
- `absolute_redirect off` keeps `Location` relative so it is correct behind a TLS-terminating proxy regardless of ports.
- No `add_header` in the location, so the upstream `Cache-Control` and `Content-Encoding` pass through. Proxy buffering stays on; nginx forwards `Range` and relays `206` responses for the MP3 and MIDI files.
- `X-Real-IP` and the forwarded headers mirror the existing locations.

**5. No published host port for `win98`.** Use `expose: ["80"]` only. The container's built-in `HEALTHCHECK` is used for `docker compose ps`; `web` does not wait on it.

**6. Verification without RDS.** `scripts/win98-routing/docker-compose.verify.yml` defines three services on an isolated project name: `api` (a tiny `node:22-alpine` stub answering `200` on `/health` on port 3001), `web` (built from the repo root `Dockerfile` and `nginx.conf`) and `win98` (built from `WIN98_CONTEXT`). `scripts/win98-routing/verify.sh <base-url>` runs curl assertions for every scenario in `specs/win98-hosting/spec.md`, including stopping and restarting `win98` to test isolation and recovery. This keeps `server/.env` and RDS out of the test.

**7. Docs and env.** `WIN98_CONTEXT` goes in `.env.example` (commented, with the default) and `README.md` gets a "Win98 hosting" section covering the sibling checkout, build, deploy order, rollback and the subdomain escape hatch.

## Risks / Trade-offs

- **[Risk] Same-origin access to MSN `localStorage`** (token and user) from win98-web JavaScript, which also runs emulators and user-supplied files. → Accepted for an internal tool. Escape hatch: serve win98 from `win98.<domain>` with its own `server` block and the same compose service; no change to win98 is needed because the container serves the same prefix.
- **[Risk] `proxy_pass` with a variable does not support the `resolver` being absent**, and `127.0.0.11` exists only inside Docker's user-defined networks. → Compose's default project network provides it. `nginx -t` is part of the verification, and the script exercises the real flow. This nginx config is not used by `npm run dev`.
- **[Risk] Docker DNS caching hides a recreated container for up to `valid`.** → `valid=10s` bounds it; spec allows 30 s.
- **[Risk] EC2 build resources.** Vite 7 plus ~97 MB of assets can exhaust memory or disk on a small instance. → Measure in win98's task 2.3; add swap or build elsewhere and `docker save | docker load`. Prune old images after deploy.
- **[Risk] Sibling checkout drift** (EC2 has a different win98 commit than expected). → README documents `git -C ../win98-web rev-parse --short HEAD` in the deploy steps, and `docker compose build win98` is always run explicitly.
- **[Trade-off] Win98 outage shows a bare `502` page on `/win98-web/`.** Acceptable for now; a custom `error_page` is a possible follow-up.
- **[Out of scope finding] `throwback-in-time.pem` is tracked in git and is also copied into the `web` build stage by `COPY . .` (not into the final image).** → Rotate the key and remove it from history in a separate change.

## Migration Plan

1. On the EC2 host, clone win98-web next to this repo and check out the target commit (this requires `add-container-image` to be merged there).
2. `docker compose build win98 web` then `docker compose up -d win98`.
3. `docker compose up -d web` (recreates nginx with the new config; a short MSN blip is expected, same as any frontend deploy).
4. Run `scripts/win98-routing/verify.sh http://<host>` against the host (the isolation scenarios that stop `win98` are skipped unless `VERIFY_ISOLATION=1` is set, so the production run is non-disruptive).
5. Rollback: `git revert` the nginx and compose change and `docker compose up -d web`; `docker compose rm -sf win98`. MSN data and services are unaffected.

## Confirmed Deployment Facts

- HTTPS terminates at an AWS Application Load Balancer, which forwards plain HTTP to the EC2 instance on port 80 (to be confirmed on the AWS console during task 5.2). The design already fits: every redirect is relative (`absolute_redirect off`), so no scheme, host or port is ever generated by nginx, and win98 does not use `X-Forwarded-Proto`. The ALB needs no new listener rule or target group because routing stays in the existing nginx.
- Deploys are manual: `git pull` followed by `docker compose up -d --build` on the EC2 host. The migration plan matches this flow. Because `docker compose up --build` rebuilds every service whose context changed, the README must tell the operator to `git pull` in both repos first and to build `win98` explicitly (`docker compose build win98`) so a stale sibling checkout is never deployed silently.

## Open Questions

- Does the ALB target group health check point at `/` or at `/health`? Both keep working unchanged, but confirm in task 5.2 that the target stays healthy while `web` is recreated.
- The ALB idle timeout (default 60 s) applies to `/ws` today and is unrelated to this change. It is noted only so it is not mistaken for a Win98 problem.
