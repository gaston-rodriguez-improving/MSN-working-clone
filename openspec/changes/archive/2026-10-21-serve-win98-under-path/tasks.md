# Tasks

Prerequisite: the `add-container-image` change in win98-web is implemented, so `docker build` in `../win98-web` produces an image that serves `/win98-web/` and `/healthz` on port 80.

## 1. Routing verification harness (written first)

- [x] 1.1 Add `scripts/win98-routing/docker-compose.verify.yml` with project name `msn-win98-verify`: a stub `api` (`node:22-alpine` running an inline http server that answers `200` on `/health` on port 3001), `web` (build context `../..`, publishes `8081:80`) and `win98` (build context `${WIN98_CONTEXT:-../../../win98-web}`), with no database, no `server/.env` and no RDS bundle. Verify with `docker compose -f scripts/win98-routing/docker-compose.verify.yml config`.
- [x] 1.2 Add `scripts/win98-routing/verify.sh <base-url>` (curl-based, non-zero exit on first failure) asserting every scenario in `specs/win98-hosting/spec.md`: `/win98-web/` 200 with the win98 page, asset with query string, missing file 404 with the BSOD body, `/win98` and `/win98/` 302 with `Location: /win98-web/`, `/win98/resume?x=1` 302 with `Location: /win98-web/resume?x=1`, `/win98-web` 301 with `Location: /win98-web/`, `/`, `/chat/123` and `/health` unchanged, `/win98x` falls to the SPA, `sw.js` `no-cache`, asset gzip and `immutable`, and a `Range: bytes=0-99` request returning `206` for a media file under `/win98-web/songs/` (the script picks one by listing the file from the win98 container, URL-encoding spaces). When `VERIFY_ISOLATION=1`, also stop `win98` (expect `502` on `/win98-web/` and `200` on `/` and `/health`), start it again and poll up to 30 s for `200`. Verify the script fails against the unchanged `nginx.conf` (the win98 assertions fail, the MSN ones pass).

## 2. Compose and nginx wiring

- [x] 2.1 Edit `docker-compose.yml`: add the `win98` service (`build.context: ${WIN98_CONTEXT:-../win98-web}`, `expose: ["80"]`, `restart: unless-stopped`, no `ports`) and leave `web.depends_on` as `api` only. Verify with `docker compose config` that `win98` has no published port and `web` does not depend on it.
- [x] 2.2 Edit `nginx.conf`: add `resolver 127.0.0.11 valid=10s ipv6=off;` and the four locations from design decision 4, placed before `location /` and without touching existing locations. Verify with `docker compose run --rm --no-deps web nginx -t` (or `docker run` with the built `web` image).
- [x] 2.3 Run the verification stack: `WIN98_CONTEXT=../win98-web docker compose -f scripts/win98-routing/docker-compose.verify.yml up -d --build`, then `VERIFY_ISOLATION=1 scripts/win98-routing/verify.sh http://localhost:8081`. Verify every assertion passes, then `docker compose ... down`.
- [x] 2.4 Confirm `web` starts with `win98` absent: bring up only `api` and `web` from the verify stack, check `docker compose ps` shows `web` running and `curl -i http://localhost:8081/` returns `200`.

## 3. Browser check

- [x] 3.1 With the verify stack up, open `http://localhost:8081/win98-web/` and verify the desktop boots, the console has no errors, Paint opens, and the service worker scope is `/win98-web/`. Open `http://localhost:8081/` and verify the MSN login page still loads and is not controlled by the Win98 service worker (DevTools, Application, Service Workers).
- [x] 3.2 Open `/win98`, `/win98/` and `/win98/resume` and verify they land on `/win98-web/` (and `/win98-web/resume`) at the same host and port, and that the desktop boots from the short URL.

## 4. Env vars and docs

- [x] 4.1 Add a commented `WIN98_CONTEXT=../win98-web` line (with a one-line explanation) to `.env.example`. Verify `git diff .env.example` shows only that addition.
- [x] 4.2 Add a "Win98 hosting" section to `README.md` that presents `/win98` as the URL to share (redirecting to the canonical `/win98-web/`) and covers: URL layout, sibling checkout requirement, `WIN98_CONTEXT`, the manual deploy steps (`git pull` in both repos, `docker compose build win98`, `docker compose up -d --build`, verify) and why win98 is built explicitly, rollback, the same-origin note with the subdomain escape hatch, and how to run `scripts/win98-routing/verify.sh`. Verify the documented commands run as written against the verify stack.

## 5. EC2 rollout (operator task, after tasks 1 to 4 are merged)

- [x] 5.1 On the EC2 host: check free disk and memory (`df -h`, `free -m`), add swap if the win98 build needs it (record the result), clone win98-web next to this repo at the target commit. Verify `docker compose build win98` completes. — done on EC2 (2 GB RAM + 2 GB swap added, 54 GB disk free)
- [x] 5.2 Deploy following the README steps and run `scripts/win98-routing/verify.sh http://<host>` without `VERIFY_ISOLATION`. Verify all assertions pass, `https://<domain>/win98` redirects to `https://<domain>/win98-web/` through the ALB (no `:80` or `http://` in `Location`), and the ALB target group stays healthy while `web` is recreated. — done: verify.sh passed on host and checks through the ALB OK
- [x] 5.3 Confirm `docker compose ps` shows `win98` healthy with no published port, and `docker image prune` frees build leftovers. Record the deployed win98 commit in the README deploy notes or the PR. — done; deployed win98-web commit 152dcb1c

## 6. Final validation

- [x] 6.1 Run `npm run lint`, `npm run build`, `npm --prefix server test` and `npm run test:music`. Verify all pass (no application code changed). — build, server tests and test:music pass; `npm run lint` has 267 pre-existing errors (no src/ touched), accepted by the user before archiving
- [x] 6.2 Run `graphify update .`.
- [x] 6.3 Commit all changes with the message `Serve Win98 Web Edition under /win98-web/ behind the MSN nginx`.

## Workflow follow-up

- Archive this change and `add-container-image` once the EC2 rollout is verified.
- Follow-ups to consider: subdomain for origin isolation, registry-based image deploy, custom `502` page for `/win98-web/`, rotating and purging `throwback-in-time.pem`.
