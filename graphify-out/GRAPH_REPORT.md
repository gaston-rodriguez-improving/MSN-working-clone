# Graph Report - MSN-working-clone  (2026-10-23)

## Corpus Check
- 119 files · ~237,195 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .swf 15, (none) 9, .log 4)

## Summary
- 839 nodes · 1475 edges · 56 communities (44 shown, 12 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5bc8c5d8`
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
- ctOctober.test.js
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
- music.test.js
- ADDED Requirements
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
- Requirements
- verify.sh
- ADDED Requirements
- Proposal
- Tasks
- ref_node_assert
- dependencies
- Proposal
- Design
- microsoftAuth.js

## God Nodes (most connected - your core abstractions)
1. `react` - 39 edges
2. `YouTubeMediaAdapter` - 22 edges
3. `formatName()` - 21 edges
4. `AdminPage()` - 20 edges
5. `HomePage()` - 20 edges
6. `ChatProvider()` - 19 edges
7. `api()` - 15 edges
8. `stripHtml()` - 15 edges
9. `WinampPage()` - 15 edges
10. `/graphify` - 15 edges

## Surprising Connections (you probably didn't know these)
- `2. Storage and routes` --references--> `createCtRouter()`  [INFERRED]
  openspec/changes/add-ct-october-api/tasks.md → server/ctOctober.js
- `Migration Plan` --references--> `api()`  [INFERRED]
  openspec/changes/add-ct-october-api/design.md → server/music.integration.test.js
- `Scenario: API unchanged` --references--> `api()`  [INFERRED]
  openspec/changes/restrict-msn-framing/specs/embedding-policy/spec.md → server/music.integration.test.js
- `Impact` --references--> `api()`  [INFERRED]
  openspec/changes/add-ct-october-api/proposal.md → server/music.integration.test.js
- `Workflow follow-up` --references--> `api()`  [INFERRED]
  openspec/changes/add-ct-october-api/tasks.md → server/music.integration.test.js

## Import Cycles
- None detected.

## Communities (56 total, 12 thin omitted)

### Community 0 - "HomePage.jsx"
Cohesion: 0.07
Nodes (58): 7.css, react, AddFriendModal(), AvatarLarge(), AvatarSmall(), Background(), CategoryModal(), ChangeDisplayPictureModal() (+50 more)

### Community 1 - "main.jsx"
Cohesion: 0.08
Nodes (30): axios, react-router-dom, apps, AppShortcuts(), PrivateRoute(), UpdateBanner(), AuthProvider(), login() (+22 more)

### Community 2 - "server.js"
Cohesion: 0.05
Nodes (27): { accountNameFromClaims }, adminEmails, app, bcrypt, config, cors, { createCtRouter, seedCtOffices }, crypto (+19 more)

### Community 3 - "YouTubeMediaAdapter"
Cohesion: 0.07
Nodes (14): webamp, createPresenceGrace(), assert, { createPresenceGrace }, harness(), { test }, planSharedPlaylistSync(), selectedSharedTracksForRemoval() (+6 more)

### Community 4 - "/graphify"
Cohesion: 0.06
Nodes (32): For always-on context in Devin sessions, For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For --update (incremental re-extraction) (+24 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (26): cors, dotenv, express, jose, name, private, type, version (+18 more)

### Community 6 - "api.js"
Cohesion: 0.10
Nodes (35): ChatProvider(), toContact(), useToast(), addMusicTrack(), createMusicFolder(), getChatMessages(), getFriendRequests(), getFriends() (+27 more)

### Community 7 - "AdminPage.jsx"
Cohesion: 0.18
Nodes (22): addAdmin(), getAdminMetrics(), getAdmins(), removeAdmin(), adminCopy(), adminLocale(), english, AdminLanguage (+14 more)

### Community 8 - "server/package.json"
Cohesion: 0.13
Nodes (14): bcryptjs, ws, cors, dotenv, express, jose, name, private (+6 more)

### Community 9 - "api"
Cohesion: 0.05
Nodes (38): 1. Rules, 2. Storage and routes, 3. Validation, Tasks, Workflow follow-up, Confirmed Deployment Facts, Context, Decisions (+30 more)

### Community 10 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, 7.css, axios, @azure/msal-browser, color-thief-react, colorthief, cors, crypto-js (+12 more)

### Community 11 - "ctOctober.test.js"
Cohesion: 0.10
Nodes (27): Decisions, codesMatch(), createCtRouter(), adminOffice(), boardFor(), claimsFor(), crypto, elapsedMs() (+19 more)

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
Cohesion: 0.22
Nodes (10): accountNameFromClaims(), emailNameFromAddress(), { accountNameFromClaims, emailNameFromAddress }, assert, test, color(), { emailNameFromAddress }, { ensureFotologUrl } (+2 more)

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
Cohesion: 0.07
Nodes (27): ADDED Requirements, Purpose, Requirement: A team has one session, Requirement: An admin manages one office, Requirement: Each office starts with ten teams, Requirement: The board and the reset, Requirement: The server accepts the patch code, Scenario: Already finished (+19 more)

### Community 23 - "fotolog.integration.test.js"
Cohesion: 0.25
Nodes (7): jsonwebtoken, assert, { image, color }, jwt, { Pool }, { randomUUID }, test

### Community 24 - "removeExpiredActivities"
Cohesion: 0.27
Nodes (10): activityView(), broadcast(), broadcastCatalogChange(), expirySweep, listeningEnvelope(), listListening(), pushListeningSnapshot(), removeExpiredActivities() (+2 more)

### Community 25 - "music.test.js"
Cohesion: 0.40
Nodes (4): parseYouTubeVideoId(), assert, { parseYouTubeVideoId }, test

### Community 26 - "ADDED Requirements"
Cohesion: 0.08
Nodes (24): ADDED Requirements, Purpose, Requirement: Canonical path gets its trailing slash, Requirement: Sub-paths and queries survive the short URL, Requirement: Upstream headers and ranges pass through, Requirement: Win98 availability does not affect MSN, Requirement: Win98 is only reachable through the proxy, Requirement: Win98 is reachable under /win98-web/ on the main domain (+16 more)

### Community 27 - "getUser"
Cohesion: 0.40
Nodes (5): conversation(), member(), messageView(), messageViews(), saveMessage()

### Community 28 - "broadcast"
Cohesion: 0.50
Nodes (5): broadcastUser(), friendRequestView(), limitError(), publicUser(), updateUser()

### Community 29 - "MilkDrop window skin QA"
Cohesion: 0.40
Nodes (4): Comparison history, Findings, MilkDrop window skin QA, Verification

### Community 30 - "ToastContext.jsx"
Cohesion: 0.27
Nodes (8): isQuietPage(), RetroNotification(), ToastContext, ToastProvider(), readSoundPreferences(), SOUND_PREFERENCES_STORAGE_KEY, soundPreferenceDefaults, sounds

### Community 32 - "isAdminRequest"
Cohesion: 0.67
Nodes (3): adminAuth, isAdminRequest(), normalizeEmail()

### Community 33 - "listAdmins"
Cohesion: 0.67
Nodes (3): adminScope(), adminView(), listAdmins()

### Community 36 - "initializeDatabase"
Cohesion: 0.20
Nodes (11): Context, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs, Impact, seedCtOffices(), auth() (+3 more)

### Community 37 - "Requirements"
Cohesion: 0.08
Nodes (24): Purpose, Requirement: Canonical path gets its trailing slash, Requirement: Sub-paths and queries survive the short URL, Requirement: Upstream headers and ranges pass through, Requirement: Win98 availability does not affect MSN, Requirement: Win98 is only reachable through the proxy, Requirement: Win98 is reachable under /win98-web/ on the main domain, Requirement: /win98 is the public entry point (+16 more)

### Community 47 - "verify.sh"
Cohesion: 0.53
Nodes (8): body_of(), fail(), header_value(), headers_of(), pass(), redirect_check(), verify.sh script, status_of()

### Community 48 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: MSN pages allow framing only by the same origin, Requirement: Other origins cannot frame MSN, Requirement: Policy does not leak onto other responses, Requirement: Same-origin framing keeps working, Scenario: Admin page, Scenario: API unchanged (+8 more)

### Community 49 - "Proposal"
Cohesion: 0.22
Nodes (8): Capabilities, Impact, Modified Capabilities, New Capabilities, Non-goals, Proposal, What Changes, Why

### Community 50 - "Tasks"
Cohesion: 0.22
Nodes (8): 1. Failing checks first (RED), 2. nginx wiring, 3. Browser enforcement, 4. Docs and pre-rollout confirmation, 5. Rollout (operator task, after sections 1 to 4 are merged), 6. Final validation, Tasks, Workflow follow-up

### Community 51 - "ref_node_assert"
Cohesion: 0.28
Nodes (6): ensureFotologUrl(), reserved, slugBase(), assert, { slugBase }, test

### Community 52 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, bcryptjs, cors, dotenv, express, jose, jsonwebtoken, pg (+1 more)

### Community 53 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Modified Capabilities, New Capabilities, Non-goals, Proposal, What Changes, Why

### Community 54 - "Design"
Cohesion: 0.25
Nodes (7): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Open Questions, Risks / Trade-offs

### Community 55 - "microsoftAuth.js"
Cohesion: 0.50
Nodes (4): @azure/msal-browser, initializeMsal(), msalInstance, signInWithMicrosoft()

## Knowledge Gaps
- **24 isolated node(s):** `@ruffle-rs/ruffle`, `colorthief`, `cors`, `crypto-js`, `dotenv` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 413 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `ADDED Requirements`, `music.integration.test.js`, `initializeDatabase`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **What connects `@ruffle-rs/ruffle`, `colorthief`, `cors` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HomePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06606942889137737 - nodes in this community are weakly interconnected._
- **Why does `react` connect `HomePage.jsx` to `main.jsx`, `YouTubeMediaAdapter`, `package.json`, `api.js`, `AdminPage.jsx`, `FotologPage.jsx`, `ToastContext.jsx`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0821256038647343 - nodes in this community are weakly interconnected._
- **Why does `formatName()` connect `HomePage.jsx` to `ToastContext.jsx`, `AdminPage.jsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._