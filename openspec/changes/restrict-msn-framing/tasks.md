# Tasks

Prerequisite for the browser checks in section 3: the win98-web repo (sibling checkout) contains the MSN Messenger app from `add-msn-messenger-app`. The verification stack builds win98 from `../win98-web`.

## 1. Failing checks first (RED)

- [ ] 1.1 Extend `scripts/win98-routing/verify.sh` with a "framing policy" section (design decision 4): both headers (`Content-Security-Policy` containing `frame-ancestors 'self'`, and `X-Frame-Options: SAMEORIGIN`) on `/`, `/chat/123`, `/fotolog/leni`, `/winamp`, `/admin`, `/admin/`, `/index.html`, `/redirect.html`; no `Content-Security-Policy` or `X-Frame-Options` on `/win98-web/`; `/` still `Cache-Control: no-cache`, a hashed file under `/assets/` still `public, max-age=31536000, immutable`, `/version.json` still `no-store`. Reuse the script's existing helpers (`headers_of`, `header_value`, `fail`, `pass`). Verify with the local verification stack up that the new section fails on the current `nginx.conf` with a clear message (the policy assertions fail, the negative and cache assertions pass).

## 2. nginx wiring

- [ ] 2.1 Edit `nginx.conf`: add `add_header Content-Security-Policy "frame-ancestors 'self'" always;` and `add_header X-Frame-Options "SAMEORIGIN" always;` to `location = /admin`, `location = /admin/` and `location /`, next to their existing `Cache-Control` lines. Add nothing at server level and nothing to the `/win98-web/` location. Verify with `git diff nginx.conf` showing only those added lines, and with `docker compose -f scripts/win98-routing/docker-compose.verify.yml exec web nginx -t`.
- [ ] 2.2 Rebuild and run the verification stack: `docker compose -f scripts/win98-routing/docker-compose.verify.yml up -d --build`, then `VERIFY_ISOLATION=1 scripts/win98-routing/verify.sh http://localhost:8081`. Verify every assertion passes, including the new framing section and all pre-existing win98 routing checks.

## 3. Browser enforcement

- [ ] 3.1 Same origin: with the stack up, open `http://localhost:8081/win98`, launch MSN Messenger, and verify the MSN page renders in the Win98 window with no framing error in the console (a throwaway headless Playwright script is fine; delete it afterwards).
- [ ] 3.2 Cross origin: serve a one-file page from `http://localhost:9000` (for example `python3 -m http.server 9000` in a temp directory) containing `<iframe src="http://localhost:8081/">`, load it, and verify the browser refuses the frame (console message about `frame-ancestors` or an empty frame). Stop the server and delete the temp files. Then `docker compose -f scripts/win98-routing/docker-compose.verify.yml down`.

## 4. Docs and pre-rollout confirmation

- [ ] 4.1 Confirm with the team that no origin other than the Win98 desktop embeds MSN (design open question). Record the answer in the PR description; if one exists, use its origin in `frame-ancestors` and drop `X-Frame-Options` per design decision 3.
- [ ] 4.2 Add a "Framing policy" paragraph to the "Win98 hosting" section of `README.md`: what is sent and where, why per location and not server level, that any new HTML-serving location must repeat the two lines, and how to allow one extra origin. Verify the documented commands run as written against the verification stack.

## 5. Rollout (operator task, after sections 1 to 4 are merged)

- [ ] 5.1 On the EC2 host: `git pull`, `sudo docker compose build web`, `sudo docker compose up -d web`, then `scripts/win98-routing/verify.sh http://localhost`. Verify all assertions pass.
- [ ] 5.2 From a laptop: `curl -sI https://<domain>/ | grep -i -E 'frame|content-security'` shows both headers through the ALB. In a browser, verify that the Win98 MSN window still loads MSN and that "Sign In with Microsoft" still works both at top level and inside the Win98 window. Record the result.

## 6. Final validation

- [ ] 6.1 Run `npm run lint`, `npm run build`, `npm --prefix server test` and `npm run test:music`. No application code changes, so compare with the known state: build, server tests and `test:music` pass; `npm run lint` already reports 267 errors on a clean tree, so verify the count is unchanged.
- [ ] 6.2 Run `graphify update .`.
- [ ] 6.3 Commit all changes with the message `Restrict MSN framing to same origin with frame-ancestors` (no co-author trailer in this repo).

## Workflow follow-up

- Archive this change after task 5.2 is recorded.
- Possible next change: further security headers (HSTS, `X-Content-Type-Options`, `Referrer-Policy`).
