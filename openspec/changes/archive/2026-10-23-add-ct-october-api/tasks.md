# Tasks

## 1. Rules

- [x] 1.1 Add `server/ctOctober.js` pure helpers for keyword and patch-code comparison, elapsed time, the overtime flag, podium order, and the reset error. Add `server/ctOctober.test.js` and verify with `npm --prefix server test`.

## 2. Storage and routes

- [x] 2.1 Add `ct_teams` and `ct_sessions` to `server/schema.sql`, and seed an empty office with the ten keywords in `design.md`. Verify a second boot does not replace an edited keyword by reading the seed function.
- [x] 2.2 Mount `createCtRouter` from `server/server.js`, add `ct` to the API regex in `nginx.conf`, and document `CT_ADMIN_PASSWORD_ARGENTINA`, `CT_ADMIN_PASSWORD_CHILE`, and `Y2K_PATCH_CODE` in `server/.env.example` with placeholder values. Extend `server/ctOctober.test.js` with a fake `db.query` for login, resume, finish, overtime finish, reset finish, and an Argentina board that hides Chile. Verify with `npm --prefix server test`.

## 3. Validation

- [x] 3.1 Run `npm --prefix server test` and `graphify update .` from `MSN-working-clone`. Verify the tests pass.
- [x] 3.2 Commit as Gustavo only, with no `Co-authored-by` trailer. Message: `feat(ct): add the office session API`. Verify `git log -1` shows that author and no co-author line.

## Workflow follow-up

- Recreate the `api` and `web` containers on the EC2 host after the env vars are set. Then apply `add-improving-ct-october` in win98-web.
