# Event Winamp

Open **♫ Winamp** from Messenger to launch the authenticated `/winamp` page in a new browser tab. Right-click the desktop and choose **New folder…** to create a playlist shared with the company. Double-click a folder to open it, then click **ADD** in Winamp to save a YouTube URL, title and optional artist into that folder. **Personal (not shared)** belongs only to your account, but enabling listening sharing lets accepted friends see the currently playing song from any folder. Switching folders stops the current song and loads the selected playlist. Folders are scoped to the existing company and event configuration. Existing songs are migrated into **Improving**. Admins can delete shared folders from the admin panel; deletion removes the folder and its songs from access. Personal folders cannot be deleted through that panel. The Winamp tab has its own title and favicon.

Shared songs appear directly in Webamp's playlist. Double-click a row to play it, or use the normal Play/Next/Previous controls. Other attendees' additions and removals update the playlist without restarting your song. Use **REM** to remove selected shared tracks: contributors can remove their own entries, and existing Microsoft-authenticated administrators can remove any entry. A removed current song stays locally until stopped. Both player windows can be dragged across the desktop. The desktop Winamp shortcut reopens the windows. The playlist updates live, every 30 seconds, and when the browser regains focus. Opening ADD leaves playback running.

**Effects** is the default view and shows only decorative procedural animation. **Video** reveals the official YouTube iframe without recreating it or restarting playback. Minimize, switching tabs, and scrolling away leave playback running; Close stops playback. Equalizer and balance processing are unavailable for this backend. Browsers and YouTube may independently restrict background playback. This hidden-video mode does not satisfy YouTube's documented player visibility requirements and must not be described as compliant.

Enable **Share listening activity** to show the current catalog song to accepted Messenger friends. Sharing is off by default and preserves the saved personal message. Pause/stop/end/close clears activity; a 60-second server lease handles lost connections. Each player session sends a heartbeat every 20 seconds. The most recently started session owns the account's activity.

## Configuration and rollout

### Local testing without a database account

PostgreSQL is installed on this Mac. Run `npm run server:local` in one terminal and `npm run dev:local` in another. The first command creates/starts an isolated PostgreSQL cluster under ignored `.local-dev/` on port 55439 and runs the backend on port 3309. The second enables development-only email registration on port 5179. Open http://localhost:5179, choose **Create an account**, and use an address ending in `@local.test` (for example, `alice@local.test`). No email is sent. Use a second account in an incognito window for friend/activity checks.

These commands override database settings without editing either `.env` file. Your RDS database is not used. Data persists locally between restarts; stop the application terminals with Ctrl+C and the database with `npm run db:local:stop`. Production builds do not enable the development email-login switch.

Install the root dependencies and the existing server dependencies. Database initialization applies additive music tables from `server/schema.sql`; deploy the backend/schema and nginx configuration before the new frontend.

The Vite build flags `VITE_ENABLE_WINAMP` and `VITE_ENABLE_LISTENING` default to enabled. Set either to `false` and rebuild to hide its frontend feature. These are frontend rollout controls, not server authorization switches. Existing authentication and API authorization remain mandatory.

No YouTube account integration or Data API key is needed for link-based playback. The iframe loads YouTube's official JavaScript API and may show advertisements or embedding restrictions. Invalid links are rejected before saving; availability is determined by the official player. No audio is downloaded or proxied by the app.

Current WebSocket fanout operates in one backend process. PostgreSQL stores activity leases and preferences, but multiple application replicas would require shared pub/sub before activity/catalog broadcasts can be relied on across replicas.

## Verification

The implementation includes Node tests for URL validation, the YouTube adapter and listening-state ordering. Real PostgreSQL/WebSocket integration tests cover catalog permissions and activity privacy/session ownership. Browser checks should additionally verify native YouTube playback, embedded-player availability, effects visibility, new-tab launch and background playback in the event's browsers.

Run the 13 focused unit tests with `npm run test:music`. `npm --prefix server test` also discovers the optional integration suite, which skips when its environment flag is absent.

For the optional integration suite, start a test backend against an isolated PostgreSQL database, then run `MUSIC_INTEGRATION=1 node --test server/music.integration.test.js` with `MUSIC_API_BASE`, `JWT_SECRET`, and the same `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` settings as that backend. The suite creates test accounts and tracks; use a disposable database. The test backend must allow the `winamp.test` email domain.

Provider references: [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [YouTube policies](https://developers.google.com/youtube/terms/developer-policies), [Webamp custom media interface](https://docs.webamp.org/docs/api/custom-media-impl/).
