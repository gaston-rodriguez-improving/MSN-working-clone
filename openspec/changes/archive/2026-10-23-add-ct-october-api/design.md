# Design

## Context

See proposal.md for why. The API is Express in `server/server.js`, Postgres through `pg`, and `server/schema.sql` runs from `initializeDatabase` on boot. nginx proxies a prefix list to that process. `server.js` should not grow a new domain, so the routes live in a new module. `graphify affected server/server.js` reaches `initializeDatabase` and `auth` only.

## Goals / Non-Goals

**Goals:** One session row per team, a server-side patch check, and an office admin board. Unit tests cover the rules without RDS.

**Non-Goals:** See proposal. Also: no change to messenger `auth`, and no React screen.

## Decisions

**1. Postgres tables, scoped like the rest of the API.**

```sql
ct_teams (id, company_id, event_id, office, name, keyword, created_at)
ct_sessions (team_id primary key, started_at, finished_at)
```

`office` is `argentina` or `chile`. Unique name per office, company, and event. Deleting a team deletes its session.

**2. Seed only an empty office.** On boot, if an office has zero teams for `config.companyId` and `config.eventId`, insert Team 1 through Team 10. Do not update rows that already exist.

| Team | Argentina | Chile |
| --- | --- | --- |
| Team 1 | onion | river |
| Team 2 | candle | copper |
| Team 3 | marble | anchor |
| Team 4 | pencil | pebble |
| Team 5 | rocket | lantern |
| Team 6 | garden | cactus |
| Team 7 | button | violin |
| Team 8 | silver | harbor |
| Team 9 | maple | quartz |
| Team 10 | comet | falcon |

Keywords are stored as typed so the admin board can show them. Comparison trims and ignores case.

**3. Module `server/ctOctober.js`.** It exports the pure helpers and `createCtRouter({ db, jwt, config, now })`. `server.js` mounts the router at `/ct` and calls the seed from `initializeDatabase`. Helpers cover code matching, elapsed time, the overtime flag, podium order, and the reset error. `now` is injected so tests do not wait.

**4. Tokens are not messenger tokens.** A team token is `{ role: 'ct-team', teamId, office, companyId, eventId }`. An admin token is `{ role: 'ct-admin', office, companyId, eventId }`. Both use the existing `JWT_SECRET` and expire in 12 hours. The messenger `auth` middleware is not used, because these tokens have no user row.

**5. Routes.**

- `GET /ct/teams?office=` returns `{ id, name }` only.
- `POST /ct/team/login` with `{ office, teamId, keyword }` returns `{ token, session }` or 401.
- `POST /ct/team/start` sets `started_at` only when it is null, then returns the session.
- `GET /ct/session` returns the session.
- `POST /ct/finish` with `{ code }` compares against `process.env.Y2K_PATCH_CODE` or `Y2KPATCH99`. Success sets `finished_at` once. No `started_at` returns 409 `{ error: 'team_reset' }`. A repeat success returns the stored finish.
- `POST /ct/admin/login` with `{ office, password }` compares with `crypto.timingSafeEqual` to `CT_ADMIN_PASSWORD_ARGENTINA` or `CT_ADMIN_PASSWORD_CHILE`. A missing env password rejects every login.
- `GET /ct/admin/teams`, `POST /ct/admin/teams`, `PATCH /ct/admin/teams/:id`, `DELETE /ct/admin/teams/:id`.
- `GET /ct/admin/board` returns teams with `status` of `ready`, `running`, or `finished`, `elapsedMs`, `keyword`, `runningCount`, and `podium`.
- `POST /ct/admin/teams/:id/reset` nulls `started_at` and `finished_at` for that one team. `POST /ct/admin/reset` does the same for every team in the office and returns how many were running.

A session payload includes `startedAt`, `finishedAt`, `elapsedMs`, `status`, `overtime`, and `serverNow`. `overtime` is true only when the session is running and `elapsedMs` is greater than 60 minutes. The podium is finished teams, shortest elapsed time first, then name.

**6. nginx.** Add `ct` to the existing API location regex in `nginx.conf`. No new compose service.

## Risks / Trade-offs

- **[Risk] Keywords sit in the database in a readable form.** → Accepted so the admin panel can show them. They are game words, not staff passwords. Admin passwords stay in env only.
- **[Risk] A direct reset call has no confirmation.** → The warning is in the Win98 window, which reads `runningCount` before it calls reset.
- **[Trade-off] One API process owns the clock.** That matches the current single-process deploy. `serverNow` lets the desktop correct a laptop clock.

## Migration Plan

Deploy this change before the Win98 app. On the EC2 host, set the two admin passwords and `Y2K_PATCH_CODE`, then recreate `api` and `web`. Schema changes apply on API boot. Rollback is reverting the image. The new tables can stay. They are unused if the routes are gone.
