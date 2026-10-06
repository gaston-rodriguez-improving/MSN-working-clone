# YouTube + Webamp implementation plan

Status: implemented locally with three Luna subagents covering player/UI, collaborative playlist/backend, and MSN listening activity. See [usage and verification](winamp.md). No deployment performed. Current repository inspected on 2026-10-06.

## Intended experience

An authenticated `/winamp` page opens in a separate browser tab from Messenger. Actual Webamp supplies classic controls, skins and local playlist windows. An official YouTube player supplies playback inside a separate retro media window. Employees contribute YouTube links to an event-wide catalog; playback is independent for each listener. MSN listening activity is a second release.

The media window offers Video and Effects layouts. Video shows the native player prominently. Effects shows procedural retro animation alongside a visible, unobscured native player (at least 200 × 200 px; preferably 480 × 270). Replacing the video entirely must pause YouTube first. Neither mode covers branding, advertisements or native controls. The application pauses when its player tab becomes hidden; returning requires an explicit resume. A separate tab is not a promise of background audio while using Messenger.

The IFrame API does not expose raw audio or an equalizer. Disable/hide unsupported EQ, balance and audio-reactive spectrum/MilkDrop features rather than simulate their functionality. Decorative effects are explicitly procedural. This design addresses known visibility restrictions; it is not blanket certification of YouTube policy compliance.

## 1. Adapter feasibility gate

- Pin an exact Webamp npm version and inspect its actual `IMedia` types and custom-media implementation. Use `__customMediaClass`; do not fork preemptively.
- Build one-track proof with a visible official YouTube player and explicit user-initiated start.
- Translate play/pause/stop/seek/volume and track selection into IFrame commands. Translate confirmed state, time, duration, buffering and errors back into Webamp.
- Synchronize native YouTube controls with Webamp. Use guarded polling for time, avoid feedback loops, and handle asynchronous ready/load events and stale callbacks after track changes.
- Test end-of-track, unavailable video, embedding disabled, autoplay rejection, hidden-tab pause and recovery. Do not advance merely because a video is buffering.
- Verify repeated mounting/React StrictMode cannot create duplicate players or leave audio running. Stop first, unsubscribe, destroy the iframe and best-effort dispose Webamp; its documented cleanup limitations require special attention.

Exit: actual Webamp controls reliably drive one YouTube video in target Chrome/Edge browsers. If this fails, report the specific adapter limitation before building the collaborative feature.

Files: package.json/package-lock.json, new `src/features/winamp/YouTubeMediaAdapter.js`, `YouTubePlayer.js`, and `WebampPlayer.jsx`.

## 2. Route and retro page

- Add protected `/winamp` in `src/main.jsx`; lazy-load its heavy player bundle.
- Add an ordinary new-tab link in `src/pages/HomePage.jsx` with `target="_blank"` and `rel="noopener noreferrer"`. Same-origin authentication already uses localStorage.
- Create `src/pages/WinampPage.jsx` and scoped styles/components: classic player/playlist left, draggable media window right, contribution/catalog panel accessible below or beside them.
- Video/Effects toggle changes layout without recreating the iframe or resetting the song. Implement procedural visuals independently from the media backend, with reduced-motion and WebGL fallback.
- Constrain drag/resize so the YouTube player stays visible and meets minimum dimensions. Pause if the media window closes, minimizes or becomes hidden.
- Handle login expiry/logout across tabs via storage events and actual AuthContext logout. Stop media and unsubscribe on logout.
- Provide YouTube attribution, terms/privacy links and integration disclosures; retain native player functionality.

Exit: direct `/winamp` navigation and launch from MSN work; responsive layouts retain accessible video and controls; page cleanup stops playback.

## 3. Shared catalog backend

Use new `event_music_tracks` table in `server/schema.sql`: identity ID, company/event scope, validated YouTube video ID, display title, optional user-entered artist, contributor ID, created timestamp, removed timestamp and remover ID. Use a partial unique index for active `(company_id,event_id,video_id)` so simultaneous duplicates are rejected while removed songs can be resubmitted. Order by identity ID; no shared reorder API in the MVP. Treat entered metadata as community labels, not verified YouTube metadata.

Endpoints under `/music/tracks`:

- `GET`: scoped active entries, ordered by ID, with contributor display information and removal capabilities.
- `POST`: accept supported YouTube URL forms and bounded title/artist; extract an exact video ID using a shared tested parser. Server derives contributor and scope. Return 201 or 409 for a duplicate.
- `DELETE /:id`: scoped soft removal by contributor or existing Microsoft-authenticated admin; return a consistent not-found/forbidden response.

Do not fetch arbitrary user URLs on the server. URL validation confirms format, not that playback is available; the iframe reports deleted/private/region/embedding restrictions. No YouTube search or account access is required for this first release. Additions are immediate without moderation approval.

Extend `src/data/api.js` and nginx's API proxy regex for `/music`. Reuse existing auth/admin middleware. Match WebSocket JWT company/event validation to the REST checks before introducing scoped catalog events.

Exit: database setup is idempotent; duplicate races, cross-event access and unauthorized removal are enforced server-side.

## 4. Live catalog and local queue

- Extend the existing socket transport with `music_catalog_changed` carrying a scoped invalidation. Authenticated clients refetch the canonical list; coalesce requests and ignore stale responses.
- Subscribe before initial fetch; refetch after reconnect and use invalidation to avoid missing changes during snapshot loads.
- Expose transport subscription hooks through the existing ChatContext rather than opening another WebSocket for each feature in a tab.
- Shared songs appear directly in the native Webamp playlist. ADD opens a retro contribution dialog; REM routes permitted removal to the shared API. Incremental additions/removals never restart playback or replace the whole queue.
- A removed current song stays locally while playing or paused, then leaves the playlist after stopping or selecting another song.
- Shuffle, repeat, current index and local sorting stay per tab. Restoring a playlist or opening a track link does not autoplay.

Exit: two users see catalog changes and reconnect recovery without interrupting either listener.

## 5. Optional MSN listening activity

Separate release after playback and catalog pass. Keep `bio` and availability unchanged. A persistent sharing preference is opt-in; live activity is an expiring lease.

- Player publishes only on confirmed PLAYING; selection, buffering and decorative effects do not indicate listening. Clear on pause/stop/end/close/logout/hidden-tab pause.
- Client sends session ID, client sequence and catalog track ID. Server supplies user identity and resolves canonical shared metadata. Exclude arbitrary local tracks in this version.
- Keep one owning playback session per user. New confirmed play can take ownership; older sessions cannot heartbeat or clear the newer lease. Server assigns ordered revisions and broadcasts null tombstones for clears.
- Start with 20-second heartbeat and 60-second expiry; expiry remains authoritative when unload cleanup is lost. Document/test these values against browser timer behavior.
- Use a PostgreSQL activity lease table for restart-safe expiry and sharing preferences. Current socket fanout is single-process; multiple backend replicas would additionally need shared pub/sub and should not be claimed supported.
- Send activity only to accepted friends and the user's own authenticated tabs. Send snapshots on connect/reconnect and current state on friend acceptance; exclude activity from event-wide `/users` responses.
- Add reusable `ListeningStatus.jsx` in own header, contact rows and chat header. Display activity in the personal-message area with a clear music icon; return to the saved bio after clear and retain an explicit bio-edit action.
- Clicking activity opens `/winamp` with a track reference selected but does not autoplay.

Adjacent correctness fixes required for this release: reconnect currently merges only new contacts instead of refreshing existing records; bio updates use truthy fallback and fail to clear empty text; the sign-out path must invoke AuthContext logout and clear activity. Fix only the paths needed for correct restoration and logout, keeping unrelated presence redesign separate.

## Validation and delivery

Use Node's built-in test runner for URL parsing/backend contracts if appropriate; add browser verification for real player behavior. Root/server currently have no test scripts. Run frontend build and relevant lint checks, documenting unrelated baseline failures.

Required scenarios: native and Webamp controls stay synchronized; video/effects visibility and hidden-tab pause; duplicate concurrent contributions; contributor/admin permissions; event isolation; catalog refresh during playback; reconnect snapshots; auth expiry across tabs; listening lease takeover/stale clear/expiry; friends-only delivery; unchanged bio after playback.

Deliver as sequential reviewable changes: (1) adapter proof, (2) route/layout, (3) catalog schema/API, (4) live catalog/UI, (5) optional listening activity. Deploy additive backend/schema before dependent frontend. Keep player and activity behind separate feature flags for rollback. Deployments require the user's authorization; this plan does not deploy anything.

## Primary references

- https://docs.webamp.org/docs/api/custom-media-impl/
- https://docs.webamp.org/docs/api/instance-methods/
- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/terms/developer-policies
