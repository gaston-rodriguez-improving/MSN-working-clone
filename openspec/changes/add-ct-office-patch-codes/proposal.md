# Proposal

## Why

The Y2K patch code is one value for everyone, set by the host env var `Y2K_PATCH_CODE` (default `Y2KPATCH99`, which is also written in the repo and READMEs). Changing it needs a host edit and an API recreate, and Argentina and Chile cannot run different codes. Each office admin should set its own office's code from the admin panel, and the public default must stop working as soon as an office sets its own.

## What Changes

- New table `ct_office_settings`, one row per company, event and office, holding that office's `patch_code` and an `is_default` flag. Additive SQL in `server/schema.sql`.
- The API seeds each office's row once, from `Y2K_PATCH_CODE` (or `Y2KPATCH99` when unset), with `is_default = true`. A row that exists is never overwritten by the seed, so the env var is only an initial value.
- `POST /ct/finish` compares the submitted code with the code of the team's own office, taken from the database. The env var is no longer read at finish time.
- New admin routes `GET /ct/admin/patch-code` and `PUT /ct/admin/patch-code`. An admin reads and sets only its own office's code. Saving sets `is_default = false` and replaces the stored code, so the initial code stops working. The server rejects a new code that equals the default (`Y2KPATCH99` or the current `Y2K_PATCH_CODE`).
- The two offices may use the same or different codes.
- Spec: the "server accepts the patch code" requirement changes from one env code to the office's stored code; two requirements are added (admin sets the code, default stops working).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ct-october`: the patch-code requirement now uses the office's stored code; new requirements for setting the code and retiring the default.

## Impact

- **Side affected**: backend (`server/ctOctober.js`, `server/ctOctober.test.js`, `server/server.js` only if the seed call signature changes) and database (`server/schema.sql`). No frontend, no nginx change (`/ct` is already in the API regex) and no new compose service.
- **Existing modules**: `createCtRouter` (`/finish`, admin routes), `seedCtOffices`, the exported `codesMatch` (signature changes to `(storedCode, input)`; only `ctOctober.test.js` uses it, checked with grep and `graphify affected`).
- **Tenant and auth impact**: every new query filters `company_id`, `event_id` and `office`. The office comes from the verified admin JWT (`role: ct-admin`) or the team JWT, never from the request body. A `ct-team` token cannot call the admin routes, and an Argentina admin cannot read or write Chile's code (the office is not a parameter). No Microsoft-admin or messenger JWT is involved.
- **Rollout impact**: additive schema applied on API boot (`CREATE TABLE IF NOT EXISTS`) and seeded on boot. Deploy order: recreate `api` first, then ship the Win98 change. An older Win98 image keeps working against the new API because the admin routes are additive. Env: `Y2K_PATCH_CODE` becomes optional and only seeds; the host value, if set, becomes each office's initial code. No nginx change, no `web` recreate.
- **Data impact**: the code is stored in plain text so admins can read it back, like team keywords. It is not logged and not returned to team tokens or the public teams list.

## Non-goals

- Hiding the code from someone with database access.
- Rate limiting, lockouts or attempt counters for wrong codes (there are none today).
- Per-team codes, code history or expiry, or an audit log of changes.
- A way to restore the default code.
- Changing the finish rules (timer, overtime, reset handling) or how teams and keywords work.
- Any frontend work (covered by the win98-web change `edit-ct-patch-code`).
