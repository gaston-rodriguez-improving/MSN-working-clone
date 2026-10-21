# Graph Report - MSN-working-clone  (2026-10-21)

## Corpus Check
- 108 files · ~228,692 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .swf 15, (none) 9, .log 4)

## Summary
- 684 nodes · 1281 edges · 48 communities (34 shown, 14 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c89f469c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HomePage.jsx
- main.jsx
- server.js
- YouTubeMediaAdapter
- /graphify
- package.json
- api.js
- AdminPage.jsx
- server/package.json
- api
- dependencies
- discordAuth.js
- FotologPage.jsx
- YouTube + Webamp implementation plan
- scripts
- openspec-explore/SKILL.md
- devDependencies
- music.integration.test.js
- fotolog.js
- vite.config.js
- adminMetrics.test.js
- [Windows Live Messenger](https://wlm.vercel.app/)
- ADDED Requirements
- fotolog.integration.test.js
- removeExpiredActivities
- ref_node_assert
- presenceGrace.test.js
- getUser
- broadcast
- MilkDrop window skin QA
- ToastContext.jsx
- local-db.sh
- isAdminRequest
- listAdmins
- vercel.json
- verifyAzureAdIdToken
- initializeDatabase
- presenceSweep
- verify.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 39 edges
2. `YouTubeMediaAdapter` - 22 edges
3. `formatName()` - 21 edges
4. `AdminPage()` - 20 edges
5. `HomePage()` - 20 edges
6. `ChatProvider()` - 19 edges
7. `stripHtml()` - 15 edges
8. `WinampPage()` - 15 edges
9. `/graphify` - 15 edges
10. `What You Must Do When Invoked` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Context` --references--> `api()`  [INFERRED]
  openspec/changes/serve-win98-under-path/design.md → server/music.integration.test.js
- `Decisions` --references--> `api()`  [INFERRED]
  openspec/changes/serve-win98-under-path/design.md → server/music.integration.test.js
- `What Changes` --references--> `api()`  [INFERRED]
  openspec/changes/serve-win98-under-path/proposal.md → server/music.integration.test.js
- `Why` --references--> `api()`  [INFERRED]
  openspec/changes/serve-win98-under-path/proposal.md → server/music.integration.test.js
- `Scenario: API and health proxying` --references--> `api()`  [INFERRED]
  openspec/changes/serve-win98-under-path/specs/win98-hosting/spec.md → server/music.integration.test.js

## Import Cycles
- None detected.

## Communities (48 total, 14 thin omitted)

### Community 0 - "HomePage.jsx"
Cohesion: 0.07
Nodes (49): color-thief-react, AddFriendModal(), AvatarLarge(), CategoryModal(), ChangeDisplayPictureModal(), ChangeSceneModal(), ContactCategory(), ContactCategoryGroup() (+41 more)

### Community 1 - "main.jsx"
Cohesion: 0.09
Nodes (32): 7.css, @azure/msal-browser, react, react-router-dom, apps, AppShortcuts(), AvatarSmall(), Background() (+24 more)

### Community 2 - "server.js"
Cohesion: 0.05
Nodes (24): { accountNameFromClaims }, adminEmails, app, bcrypt, config, cors, crypto, db (+16 more)

### Community 3 - "YouTubeMediaAdapter"
Cohesion: 0.08
Nodes (10): webamp, planSharedPlaylistSync(), selectedSharedTracksForRemoval(), toWebampTrack(), WebampPlayer(), createYouTubeBridge(), inertAnalyser, videoIdFromUrl() (+2 more)

### Community 4 - "/graphify"
Cohesion: 0.06
Nodes (32): For always-on context in Devin sessions, For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For --update (incremental re-extraction) (+24 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (25): cors, dotenv, express, jose, name, private, type, version (+17 more)

### Community 6 - "api.js"
Cohesion: 0.10
Nodes (36): ChatProvider(), toContact(), useToast(), addMusicTrack(), createMusicFolder(), getChatMessages(), getFriendRequests(), getFriends() (+28 more)

### Community 7 - "AdminPage.jsx"
Cohesion: 0.18
Nodes (23): addAdmin(), getAdminMetrics(), getAdmins(), removeAdmin(), adminCopy(), adminLocale(), english, stripHtml() (+15 more)

### Community 8 - "server/package.json"
Cohesion: 0.08
Nodes (23): bcryptjs, ws, dependencies, bcryptjs, cors, dotenv, express, jose (+15 more)

### Community 9 - "api"
Cohesion: 0.07
Nodes (29): Confirmed Deployment Facts, Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Open Questions, Risks / Trade-offs (+21 more)

### Community 10 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, 7.css, axios, @azure/msal-browser, color-thief-react, colorthief, cors, crypto-js (+12 more)

### Community 11 - "discordAuth.js"
Cohesion: 0.19
Nodes (7): axios, authenticateWithDiscord(), saveDiscordUserData(), authenticateWithDiscord(), DiscordAuthHandler(), fetchDiscordToken(), fetchDiscordUserData()

### Community 12 - "FotologPage.jsx"
Cohesion: 0.19
Nodes (10): api, asDataUrl(), canvasBlob(), customization(), date(), FotologPage(), initialLanguage(), languageFromBrowser() (+2 more)

### Community 13 - "YouTube + Webamp implementation plan"
Cohesion: 0.13
Nodes (13): Configuration and rollout, Event Winamp, 1. Adapter feasibility gate, 2. Route and retro page, 3. Shared catalog backend, 4. Live catalog and local queue, 5. Optional MSN listening activity, Intended experience (+5 more)

### Community 14 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:local, db:local:stop, dev, dev:local, format, lint (+5 more)

### Community 15 - "openspec-explore/SKILL.md"
Cohesion: 0.17
Nodes (11): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do (+3 more)

### Community 16 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, postcss, tailwindcss (+4 more)

### Community 17 - "music.integration.test.js"
Cohesion: 0.20
Nodes (6): assert, jwt, { Pool }, { randomUUID }, test, { WebSocket }

### Community 18 - "fotolog.js"
Cohesion: 0.36
Nodes (6): accountNameFromClaims(), emailNameFromAddress(), { accountNameFromClaims, emailNameFromAddress }, assert, test, fotologName()

### Community 19 - "vite.config.js"
Cohesion: 0.20
Nodes (4): vite, @vitejs/plugin-react, buildId, root

### Community 20 - "adminMetrics.test.js"
Cohesion: 0.22
Nodes (7): pg, nudgeLeaders(), assert, { nudgeLeaders }, { Pool }, { randomUUID }, test

### Community 21 - "[Windows Live Messenger](https://wlm.vercel.app/)"
Cohesion: 0.20
Nodes (9): About, Acknowledgments, Available Features, Contribute and Share Feedback, Fotolog, How to Use, Planned Features, Win98 hosting (+1 more)

### Community 22 - "ADDED Requirements"
Cohesion: 0.08
Nodes (24): ADDED Requirements, Purpose, Requirement: Canonical path gets its trailing slash, Requirement: Sub-paths and queries survive the short URL, Requirement: Upstream headers and ranges pass through, Requirement: Win98 availability does not affect MSN, Requirement: Win98 is only reachable through the proxy, Requirement: Win98 is reachable under /win98-web/ on the main domain (+16 more)

### Community 23 - "fotolog.integration.test.js"
Cohesion: 0.16
Nodes (14): jsonwebtoken, color(), { emailNameFromAddress }, { ensureFotologUrl }, image(), assert, { image, color }, jwt (+6 more)

### Community 24 - "removeExpiredActivities"
Cohesion: 0.32
Nodes (8): activityView(), expirySweep, listeningEnvelope(), listListening(), pushListeningSnapshot(), removeExpiredActivities(), sendListening(), updateListening()

### Community 25 - "ref_node_assert"
Cohesion: 0.20
Nodes (7): assert, { slugBase }, test, parseYouTubeVideoId(), assert, { parseYouTubeVideoId }, test

### Community 26 - "presenceGrace.test.js"
Cohesion: 0.38
Nodes (5): createPresenceGrace(), assert, { createPresenceGrace }, harness(), { test }

### Community 27 - "getUser"
Cohesion: 0.29
Nodes (7): auth(), conversation(), getUser(), member(), messageView(), messageViews(), saveMessage()

### Community 28 - "broadcast"
Cohesion: 0.33
Nodes (7): broadcast(), broadcastCatalogChange(), broadcastUser(), friendRequestView(), limitError(), publicUser(), updateUser()

### Community 29 - "MilkDrop window skin QA"
Cohesion: 0.40
Nodes (4): Comparison history, Findings, MilkDrop window skin QA, Verification

### Community 30 - "ToastContext.jsx"
Cohesion: 0.23
Nodes (10): OptionsModal(), updateUsername(), isQuietPage(), RetroNotification(), ToastContext, ToastProvider(), readSoundPreferences(), SOUND_PREFERENCES_STORAGE_KEY (+2 more)

### Community 32 - "isAdminRequest"
Cohesion: 0.67
Nodes (3): adminAuth, isAdminRequest(), normalizeEmail()

### Community 33 - "listAdmins"
Cohesion: 0.67
Nodes (3): adminScope(), adminView(), listAdmins()

### Community 47 - "verify.sh"
Cohesion: 0.53
Nodes (8): body_of(), fail(), header_value(), headers_of(), pass(), redirect_check(), verify.sh script, status_of()

## Knowledge Gaps
- **24 isolated node(s):** `@ruffle-rs/ruffle`, `colorthief`, `cors`, `crypto-js`, `dotenv` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 322 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `main.jsx` to `HomePage.jsx`, `YouTubeMediaAdapter`, `package.json`, `api.js`, `AdminPage.jsx`, `discordAuth.js`, `FotologPage.jsx`, `ToastContext.jsx`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `@ruffle-rs/ruffle`, `colorthief`, `cors` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HomePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07351351351351351 - nodes in this community are weakly interconnected._
- **Why does `api()` connect `api` to `music.integration.test.js`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Why does `formatName()` connect `HomePage.jsx` to `ToastContext.jsx`, `AdminPage.jsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._