# Design

## Context

Read first (`graphify query` on `server/ctOctober.js` plus the files themselves):

- `server/ctOctober.js`: `normalizeCode` (uppercase, drop spaces and dashes), `expectedCode()` reads `process.env.Y2K_PATCH_CODE` with default `Y2KPATCH99`, `codesMatch(input)` compares to it, `POST /finish` calls it after `loadSession`. `seedCtOffices(db, config)` seeds teams once per office when the office has none. `createCtRouter({ db, jwt, config, now })` has `scope()` returning `[companyId, eventId]`, `claimsFor(req, role)` and `adminOffice(req, res)` which returns the office from the verified `ct-admin` token.
- `ct-team` JWTs carry `office`, `teamId`, `companyId`, `eventId` (set at `/team/login`), so `/finish` knows the office without trusting the body.
- `server/schema.sql` runs on every boot with `CREATE TABLE IF NOT EXISTS`, then `seedCtOffices` runs from `server.js`.
- `server/ctOctober.test.js` uses an in-memory db whose SQL contract is the comment `-- ct:<op>`; every new query needs a `-- ct:<op>` tag and a handler in that fake.
- The Win98 client sends `{ code }` to `/ct/finish` and the field accepts 32 characters.

## Goals / Non-Goals

**Goals:** per-office codes stored in Postgres; admin can read and change their own office's code; the default stops working after the office sets its own; no behavior change for teams.

**Non-Goals:** see proposal.

## Decisions

**1. New table instead of a column on `ct_teams`.** The code belongs to the office, not to a team, and the office has no row of its own today.
```sql
CREATE TABLE IF NOT EXISTS ct_office_settings (
  company_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  office TEXT NOT NULL CHECK (office IN ('argentina', 'chile')),
  patch_code TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, event_id, office)
);
```
- Existing databases need no data migration: the table is new, and the seed (decision 2) fills it on the next boot. Rows are tenant-scoped like the other CT tables.
- Alternative: a column on `ct_teams` repeated per team. Rejected: the code would live in 10 rows and drift.
- Alternative: key-value settings table. Rejected: one typed table is simpler and the CHECK keeps offices valid.

**2. Seed and ensure, never overwrite.** `seedOfficeCode(db, config, office)` runs `INSERT ... ON CONFLICT (company_id, event_id, office) DO NOTHING` with `patch_code = process.env.Y2K_PATCH_CODE` (trimmed, non-empty) or `Y2KPATCH99`, `is_default = true`. It is called for both offices from `seedCtOffices` at boot. The same function is also called lazily by `GET /admin/patch-code` and `POST /finish` before they read, so a deleted row cannot lock the event. The env var is therefore only an initial value: changing it after the row exists has no effect.
- The seed query is tagged `-- ct:code-seed` for the in-memory fake.

**3. Finish uses the stored code.** `POST /finish` loads the office row (`-- ct:code-get`, filtered by `scope()` and `claims.office`) and calls `codesMatch(row.patch_code, req.body?.code)`. `codesMatch(stored, input)` becomes a pure function: `const code = normalizeCode(stored); return code.length > 0 && normalizeCode(input) === code;`. `expectedCode()` is removed. The existing order (401 auth, 409 reset, 401 wrong code, idempotent for finished teams) does not change. A team token for Argentina only ever sees Argentina's row, so a Chile code does not finish an Argentina team.

**4. Admin routes** (auth: `ct-admin` JWT; office from the token only):
- `GET /ct/admin/patch-code` → `200 { patchCode, isDefault, updatedAt }`. Calls the ensure step first.
- `PUT /ct/admin/patch-code` with `{ code }` → `200 { patchCode, isDefault: false, updatedAt }`. Errors: `400 { error }` with a message for each validation failure; `401` without a valid admin token (a `ct-team` or messenger token gets 401).
- Both are mounted on the existing `/ct` router, so `nginx.conf` and `server.js` need no change.

**5. Validation (pure function `validatePatchCode(input, defaults)` in `ctOctober.js`).**
- Trim the input. The raw text may contain letters, digits, spaces and dashes only, up to 48 characters. After `normalizeCode` it must match `^[A-Z0-9]{4,32}$`.
- Reject when the normalized value equals the normalized built-in default (`Y2KPATCH99`) or the normalized current `Y2K_PATCH_CODE`. Error: `Choose a code different from the default`.
- Error messages (English, shown by the client): `Enter a code`, `Use 4 to 32 letters or numbers`, `Use only letters, numbers, spaces and dashes`, `Choose a code different from the default`.
- The code is stored as typed (trimmed), so the admin sees what they wrote; comparison is always on normalized values, as today.

**6. Retiring the default.** The save is a single `UPDATE ct_office_settings SET patch_code=$4, is_default=FALSE, updated_at=now WHERE company_id=$1 AND event_id=$2 AND office=$3` (tag `-- ct:code-put`). After it, the old default exists nowhere: the seed never runs again for that row, the env var is not read at finish time, and the validation blocks setting the default back. A test proves the old default is rejected and the new code accepted right after the save.

**7. Changing the code mid-game.** Takes effect on the next submission. Teams already finished stay finished (the code is only checked when finishing; `finished_at` is not touched). The warning for running teams is a client concern (the board already returns `runningCount`).

**8. Logging.** The code is never logged and never returned by `/teams`, `/team/login`, `/session`, `/finish` or the board. Only the admin GET returns it.

**9. Tests (`node:test`, in-memory fake, written first).** Extend `memoryDb` with `code-seed`, `code-get`, `code-put` and a `settings` map. Cases: seed uses env or `Y2KPATCH99` and `is_default` true; a second seed does not overwrite an edited row; `/finish` accepts each office's own code and rejects the other office's code; admin GET returns only its own office; PUT validation matrix (empty, 3 chars, 33 chars, bad characters, default, env default, code with spaces and dashes accepted and normalized on compare); after PUT the default is rejected and the new code accepted for a started team; a running team picks up the change on its next submit and a finished team is unchanged; a missing row is recreated by the ensure step; a `ct-team` token and no token get 401 on both routes; tenant isolation (a different `companyId` in the token is rejected, queries carry the scope); the Argentina and Chile codes can be identical.

## Risks / Trade-offs

- **[Risk] The seeded default stays valid until an office sets its own code.** The default is public in the repo. → Mitigation: this is the requested behavior (seed from env, then retire); the admin panel shows a "default code in use" notice via `isDefault` (win98-web change), and the host `Y2K_PATCH_CODE` can be set to a private value before first boot to avoid a public default at all.
- **[Risk] Plain-text storage.** → Same as team keywords, accepted; the admin must be able to read it.
- **[Risk] Changing `codesMatch` signature.** → Only the test file imports it (`graphify affected` and grep); updated with the tests.
- **[Risk] Mid-game change invalidates a code already handed to teams.** → Accepted (decision 7); the client warns when teams are running.
- **[Trade-off] No attempt limits.** Same as today; out of scope.
- **[Risk] Boot order.** `schema.sql` must create the table before `seedCtOffices` inserts. → It already runs first (`initializeDatabase` then `seedCtOffices`); verified by reading `server.js` and by a local boot.

## Migration Plan

- Deploy `api` (schema and seed run on boot). Existing rows: none for the new table, filled by the seed. Rollback: the table can stay unused; revert the code and the old env-based finish works again (the env var must still be set or defaulted).
- Local check: boot the local stack (`npm run db:local`, API with the env from the CT handoff), `GET /ct/admin/patch-code` with an admin token, `PUT`, then `POST /ct/finish` with the old and new code.

## Open Questions

None. Decisions agreed with the user: seed from env then retire the default; visible code, 4 to 32 letters or numbers; change applies immediately; archive `add-ct-october-api` first (done).
