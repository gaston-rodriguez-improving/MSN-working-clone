# Design

## Context

See proposal.md for motivation. Current state of `nginx.conf` (read directly):

- No `add_header` at server level. Per-location headers: `Cache-Control: no-cache` on `= /admin`, `= /admin/` and the SPA fallback `location /`, `public, max-age=31536000, immutable` on `/assets/`, `no-store` on `= /version.json`.
- The MSN frontend HTML is served by three locations: `location /` (all SPA routes, `index.html`, `redirect.html`), `location = /admin` and `location = /admin/` (both `try_files /index.html`).
- The `/win98-web/` location proxies to the Win98 container and has no `add_header`, so it currently passes the container's headers through untouched.
- nginx `add_header` rule: a location that declares any `add_header` does not inherit the ones from the enclosing server block, and a location with none inherits all of them. This is the pitfall that shapes decision 2.
- No frame-related header exists today in nginx, the Express server (`server/server.js` has no helmet) or `index.html`.
- Sign-in: MSAL `loginPopup` opens a top-level popup that ends on `redirect.html` and answers through a same-origin `BroadcastChannel`; MSAL may also create hidden frames from the MSN origin. Frames loaded from Microsoft's own domain are Microsoft's responsibility, not ours.
- The Win98 desktop (`/win98-web/`) frames MSN at `/` from the same origin.

## Goals / Non-Goals

**Goals:**
- Only the same origin can frame MSN HTML, enforced by the browser.
- No change in behavior for MSN users, the Win98 window, Microsoft sign-in, the API, caching or the proxy.

**Non-Goals:**
- A full CSP, other security headers and any change to the Vite dev server (see proposal Non-goals).

## Decisions

**1. Send both headers.** `Content-Security-Policy: frame-ancestors 'self'` is the standard control; `X-Frame-Options: SAMEORIGIN` covers old browsers that ignore `frame-ancestors`. Modern browsers use `frame-ancestors` when both are present, so they never conflict.
- Why `'self'` and not `'none'`: the Win98 window frames MSN from the same origin, and MSAL may load same-origin frames during sign-in. `'none'` would break both.
- Alternative: `X-Frame-Options` only. Rejected: it cannot express an allow-list later, and `frame-ancestors` is the maintained mechanism.

**2. Declare the headers in each HTML-serving location, never at server level.** Add them, with `always`, to `location /`, `location = /admin` and `location = /admin/`, next to the existing `Cache-Control` line.
- Why not server level: because of the inheritance rule, a server-level `add_header` would be inherited by the `/win98-web/` proxy location (which declares none), putting MSN's policy on Win98 responses. That would also be wrong in the reverse direction: the three locations above declare `Cache-Control`, so server-level headers would silently not apply to them, and the policy would be missing exactly where it is needed.
- Alternative: an `include` snippet file with the two lines. Rejected for now: the image copies only `nginx.conf`, so an include needs an extra `COPY` and a second file to keep in sync, for three repeated lines.
- `always` makes the headers also appear on non-2xx responses for those locations.

**3. Same-origin allow-list stays a deliberate edit.** To allow one more origin, change `'self'` to `'self' https://other.example` and drop `X-Frame-Options` (it cannot express more than one origin). Documented in the README, not parameterized by env var.

**4. The existing harness is the test layer.** `scripts/win98-routing/verify.sh` already runs against the local verification stack (stub API, real `web` nginx, `win98`) and against a deployed host. A "framing policy" section is added to it and written first, so it fails against the current `nginx.conf`:
- header assertions on `/`, `/chat/123`, `/fotolog/leni`, `/winamp`, `/admin`, `/admin/`, `/index.html`, `/redirect.html`;
- negative assertions: `/win98-web/` has no `Content-Security-Policy` or `X-Frame-Options` added by MSN, and `/`, `/assets/*`, `/version.json` keep their cache headers.

**5. Browser behavior is checked manually and automatically with a throwaway script.** The header values prove intent, but only a browser proves enforcement: (a) open `http://localhost:8081/win98` from the verification stack and launch MSN Messenger in the Win98 window; the frame must render; (b) serve a one-file page from `http://localhost:9000` containing `<iframe src="http://localhost:8081/">`; the browser must refuse it (console message about `frame-ancestors`). Microsoft sign-in is verified on the deployed host only, because it needs the real Entra redirect URI.

## Risks / Trade-offs

- **[Risk] Some other site legitimately frames MSN today and would break.** → Mitigation: assumption is that none does (the only known embedder is the Win98 desktop, same origin). Confirm with the team before rollout (task 4.1); if one exists, add its origin to `frame-ancestors` and remove `X-Frame-Options`.
- **[Risk] A missed location serving HTML leaves a hole.** → Mitigation: the harness checks every entry point listed in the spec, and any new HTML-serving location must repeat the two lines (noted in the README).
- **[Risk] MSAL breaks because a hidden frame is blocked.** → Mitigation: `'self'` permits same-origin frames; verified by the sign-in check on the deployed host, with rollback ready (revert and recreate `web`).
- **[Risk] Dev setups with `VITE_MSN_URL` on `localhost:5179` are not covered by the policy.** → Accepted; nginx is not in that path and the policy is a production control.
- **[Trade-off] Repeating two lines in three locations** instead of a shared include. Revisit if more HTML locations appear.

## Migration Plan

1. `git pull` on the EC2 host, `docker compose build web`, then `docker compose up -d web`.
2. Run `scripts/win98-routing/verify.sh http://localhost` (without `VERIFY_ISOLATION`).
3. From a laptop: `curl -sI https://<domain>/ | grep -i -E 'frame|content-security'` through the ALB, then check the Win98 MSN window and Microsoft sign-in in a browser.
4. Rollback: revert the commit, `docker compose build web && docker compose up -d web`. The previous image can also be re-tagged if one was saved.

## Open Questions

- Does any origin other than the Win98 desktop embed MSN today? The plan assumes no (task 4.1 confirms before rollout). A yes changes only the header value, not the approach.
