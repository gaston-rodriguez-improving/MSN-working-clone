# Proposal

## Why

Teams need one shared clock per office. The Win98 page cannot store that: its data stays in the browser. The MSN API already talks to the event PostgreSQL database and already ships on the EC2 host, so the session log belongs there.

## What Changes

- Add `/ct` routes for two offices, Argentina and Chile.
- Seed 10 teams per office, each with a simple keyword an admin can read.
- A team logs in with its keyword and starts one session. A later login resumes that same session.
- The server checks the Y2K patch code. A correct code records the finish time, including time past 60 minutes. A reset session cannot finish.
- An admin for one office can create, edit, and delete that office's teams, read the board and podium, and reset that office's session logs.
- No new database and no new container. The existing API process and the existing RDS database are reused.

## Capabilities

### New Capabilities

- `ct-october`: Office teams, keywords, a 60-minute session, the patch check, and the admin board.

### Modified Capabilities

- None.

## Impact

- **Database**: two new tables in `server/schema.sql`, applied by the existing boot path. Rows are scoped by `company_id` and `event_id`. No new Postgres instance, no SQLite file, no volume, and no compose service. SQLite was considered and skipped because it would add a native module and an EC2 disk mount, while this API already has a working Postgres connection.
- **Files**: `server/ctOctober.js` (routes and rules), `server/ctOctober.test.js`, `server/schema.sql`, a short mount in `server/server.js`, the `ct` prefix in `nginx.conf`, and placeholders in `server/.env.example`.
- **Blast radius**: `graphify affected server/server.js` shows `initializeDatabase` and `auth`. The new module is mounted beside the other routers. Messenger auth, Fotolog, and music queries stay as they are.
- **Deploy**: recreate `api` (schema runs on boot) and `web` (nginx). The Win98 image is a later change. New env vars: `CT_ADMIN_PASSWORD_ARGENTINA`, `CT_ADMIN_PASSWORD_CHILE`, and `Y2K_PATCH_CODE` (default `Y2KPATCH99`).
- **Persistence**: session rows survive a browser refresh and a container recreate. Reset clears session times for one office and leaves the teams in place.

## Non-goals

- A Win98 window. That is `add-improving-ct-october` in win98-web.
- A second database, a WebSocket, or MSN user accounts for the teams.
- Hiding the patch code from an admin of the API host. Team keywords are stored so the admin panel can show them.
