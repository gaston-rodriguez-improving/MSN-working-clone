# Tasks

## 1. Schema and pure logic

- [x] 1.1 Add `ct_office_settings` to `server/schema.sql` (design decision 1, additive `CREATE TABLE IF NOT EXISTS`). Verify the file still runs twice without error on the local Postgres (`npm run db:local`).
- [x] 1.2 RED: in `server/ctOctober.test.js` write failing tests for `codesMatch(stored, input)` (case, spaces, dashes, empty stored never matches) and `validatePatchCode(input, defaults)` (valid with spaces and dashes, empty, 3 and 33 characters, bad characters, 49 raw characters, default `Y2KPATCH99` and the env default rejected, messages from design decision 5). Run `npm --prefix server test` and confirm they fail.
- [x] 1.3 GREEN: in `server/ctOctober.js` change `codesMatch` to `(storedCode, input)`, remove `expectedCode`, add and export `validatePatchCode`. COMMIT-ready check: `npm --prefix server test`. REFACTOR only if the code reads clearly worse.

## 2. Server routes

- [x] 2.1 RED: extend `memoryDb` in `server/ctOctober.test.js` with `-- ct:code-seed`, `-- ct:code-get` and `-- ct:code-put` and a settings map, then add the route and seed tests listed in design decision 9 (seed from env or default, no overwrite, per-office finish, other office's code rejected, admin GET and PUT scoped by token, validation matrix, default retired right after PUT, running team picks the change up, finished team unchanged, missing row recreated, 401 for team token and no token on both routes, tenant isolation, identical codes in both offices, code never in team responses). Confirm RED.
- [x] 2.2 GREEN: add `seedOfficeCode` (design decision 2) and call it for both offices from `seedCtOffices`; add `GET` and `PUT /ct/admin/patch-code` (decision 4) using `adminOffice`; change `POST /finish` to load the office code (`-- ct:code-get` with `scope()` and `claims.office`) and call `codesMatch(row.patch_code, req.body?.code)`; call the ensure step before reading. Every query tagged `-- ct:<op>` and filtered by company, event and office. No logging of the code. Verify `npm --prefix server test` passes.
- [x] 2.3 Confirm `server/server.js` needs no change (the seed is reached through `seedCtOffices`) and `nginx.conf` already routes `/ct`; note it in the commit body.

## 3. Config and docs

- [x] 3.1 Update `server/.env.example`: `Y2K_PATCH_CODE` is only the initial code per office, ignored once an office saves its own; keep the placeholder value. Add a short note to the README section that documents the CT env vars (if there is one) and keep the "set it privately before first boot" tip.

## 4. Local verification

- [x] 4.1 Local stack only, never RDS: `npm run db:local`, start the API with the env from the CT handoff (CORS_ORIGIN `http://localhost:5173`, PORT 3309, local DB values, `COMPANY_ID=local-company`, `EVENT_ID=local-retro`, `JWT_SECRET=local-development-only`, admin passwords, `Y2K_PATCH_CODE=Y2KPATCH99`). With `curl`: admin login for Argentina and Chile; `GET /ct/admin/patch-code` returns the default with `isDefault: true` for both; `PUT` a new Argentina code; team login and start for an Argentina team; `POST /ct/finish` with `Y2KPATCH99` returns 401 and with the new code returns 200; a Chile team still finishes with `Y2KPATCH99`; `PUT` with `Y2KPATCH99` returns 400. Record the results in the task note and stop the local DB and API.

## 5. Final validation

- [x] 5.1 Run `npm run lint` (a high count of pre-existing errors is known: compare, do not fix; confirm no new errors in `server/ctOctober*.js` with `npx eslint server/ctOctober.js server/ctOctober.test.js` if configured), `npm run build`, `npm --prefix server test`, `npm run test:music`, then `graphify update .`.
- [x] 5.2 Commit as Gustavo only, with no `Co-authored-by` trailer. Message: `feat(ct): store the patch code per office and let an admin change it`. Verify `git log -1` shows that author and no co-author line.

## Workflow follow-up

- Deploy order: recreate `api` on the EC2 host (schema and seed run on boot), then ship the win98-web change `edit-ct-patch-code`. No `web` recreate and no new env var are required. Optionally set a private `Y2K_PATCH_CODE` on the host before the first boot so the initial code is not the public default.
