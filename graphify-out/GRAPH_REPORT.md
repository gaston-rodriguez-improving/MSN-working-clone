# Graph Report - MSN-working-clone  (2026-10-23)

## Corpus Check
- 124 files · ~243,704 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .swf 15, (none) 9, .log 4)

## Summary
- 932 nodes · 1589 edges · 56 communities (43 shown, 13 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b965621`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HomePage.jsx
- discordAuth.js
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
- ref_node_assert
- ADDED Requirements
- getUser
- ADDED Requirements
- MilkDrop window skin QA
- Requirement: The board and the reset
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
- WebampPlayer.jsx
- Proposal
- presenceGrace.test.js
- Design
- microsoftAuth.js

## God Nodes (most connected - your core abstractions)
1. `react` - 39 edges
2. `YouTubeMediaAdapter` - 22 edges
3. `formatName()` - 21 edges
4. `AdminPage()` - 20 edges
5. `HomePage()` - 20 edges
6. `ChatProvider()` - 19 edges
7. `api()` - 18 edges
8. `createCtRouter()` - 17 edges
9. `stripHtml()` - 15 edges
10. `WinampPage()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `2. Storage and routes` --references--> `createCtRouter()`  [INFERRED]
  openspec/changes/archive/2026-10-23-add-ct-october-api/tasks.md → server/ctOctober.js
- `Migration Plan` --references--> `api()`  [INFERRED]
  openspec/changes/add-ct-office-patch-codes/design.md → server/music.integration.test.js
- `Workflow follow-up` --references--> `api()`  [INFERRED]
  openspec/changes/add-ct-office-patch-codes/tasks.md → server/music.integration.test.js
- `Scenario: API unchanged` --references--> `api()`  [INFERRED]
  openspec/changes/restrict-msn-framing/specs/embedding-policy/spec.md → server/music.integration.test.js
- `Decisions` --references--> `elapsedMs()`  [INFERRED]
  openspec/changes/archive/2026-10-23-add-ct-october-api/design.md → server/ctOctober.js

## Import Cycles
- None detected.

## Communities (56 total, 13 thin omitted)

### Community 0 - "HomePage.jsx"
Cohesion: 0.07
Nodes (53): 7.css, color-thief-react, react, AddFriendModal(), AvatarLarge(), AvatarSmall(), Background(), CategoryModal() (+45 more)

### Community 1 - "discordAuth.js"
Cohesion: 0.19
Nodes (7): axios, authenticateWithDiscord(), saveDiscordUserData(), authenticateWithDiscord(), DiscordAuthHandler(), fetchDiscordToken(), fetchDiscordUserData()

### Community 2 - "server.js"
Cohesion: 0.05
Nodes (27): { accountNameFromClaims }, adminEmails, app, bcrypt, config, cors, { createCtRouter, seedCtOffices }, crypto (+19 more)

### Community 4 - "/graphify"
Cohesion: 0.06
Nodes (32): For always-on context in Devin sessions, For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For --update (incremental re-extraction) (+24 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (25): cors, dotenv, express, jose, name, private, type, version (+17 more)

### Community 6 - "api.js"
Cohesion: 0.05
Nodes (66): react-router-dom, apps, AppShortcuts(), OptionsModal(), PrivateRoute(), UpdateBanner(), AuthProvider(), login() (+58 more)

### Community 7 - "AdminPage.jsx"
Cohesion: 0.13
Nodes (28): WinkSelector(), addAdmin(), getAdminMetrics(), getAdmins(), removeAdmin(), adminCopy(), adminLocale(), english (+20 more)

### Community 8 - "server/package.json"
Cohesion: 0.08
Nodes (23): bcryptjs, ws, dependencies, bcryptjs, cors, dotenv, express, jose (+15 more)

### Community 9 - "api"
Cohesion: 0.05
Nodes (39): Confirmed Deployment Facts, Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Open Questions, Risks / Trade-offs (+31 more)

### Community 10 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, 7.css, axios, @azure/msal-browser, color-thief-react, colorthief, cors, crypto-js (+12 more)

### Community 11 - "ctOctober.test.js"
Cohesion: 0.05
Nodes (55): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Open Questions, Risks / Trade-offs, Capabilities (+47 more)

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
Cohesion: 0.43
Nodes (5): accountNameFromClaims(), emailNameFromAddress(), { accountNameFromClaims, emailNameFromAddress }, assert, test

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
Cohesion: 0.06
Nodes (34): ADDED Requirements, MODIFIED Requirements, Requirement: A change applies at the next submission, Requirement: A saved code must be valid, Requirement: An admin sets only their office's patch code, Requirement: Each office has an initial patch code, Requirement: The code is not exposed to teams, Requirement: The initial code stops working after the office sets its own (+26 more)

### Community 23 - "fotolog.integration.test.js"
Cohesion: 0.15
Nodes (15): jsonwebtoken, color(), { emailNameFromAddress }, { ensureFotologUrl }, fotologName(), image(), assert, { image, color } (+7 more)

### Community 24 - "removeExpiredActivities"
Cohesion: 0.24
Nodes (11): activityView(), broadcast(), broadcastCatalogChange(), broadcastUser(), expirySweep, listeningEnvelope(), listListening(), pushListeningSnapshot() (+3 more)

### Community 25 - "ref_node_assert"
Cohesion: 0.18
Nodes (7): assert, { slugBase }, test, parseYouTubeVideoId(), assert, { parseYouTubeVideoId }, test

### Community 26 - "ADDED Requirements"
Cohesion: 0.08
Nodes (24): ADDED Requirements, Purpose, Requirement: Canonical path gets its trailing slash, Requirement: Sub-paths and queries survive the short URL, Requirement: Upstream headers and ranges pass through, Requirement: Win98 availability does not affect MSN, Requirement: Win98 is only reachable through the proxy, Requirement: Win98 is reachable under /win98-web/ on the main domain (+16 more)

### Community 27 - "getUser"
Cohesion: 0.22
Nodes (10): conversation(), friendRequestView(), getUser(), limitError(), member(), messageView(), messageViews(), publicUser() (+2 more)

### Community 28 - "ADDED Requirements"
Cohesion: 0.07
Nodes (28): ADDED Requirements, Purpose, Requirement: A team has one session, Requirement: An admin manages one office, Requirement: Each office starts with ten teams, Requirement: The board and the reset, Requirement: The server accepts the patch code, Scenario: Already finished (+20 more)

### Community 29 - "MilkDrop window skin QA"
Cohesion: 0.40
Nodes (4): Comparison history, Findings, MilkDrop window skin QA, Verification

### Community 30 - "Requirement: The board and the reset"
Cohesion: 0.07
Nodes (28): ct-october Specification, Purpose, Requirement: A team has one session, Requirement: An admin manages one office, Requirement: Each office starts with ten teams, Requirement: The board and the reset, Requirement: The server accepts the patch code, Requirements (+20 more)

### Community 32 - "isAdminRequest"
Cohesion: 0.67
Nodes (3): adminAuth, isAdminRequest(), normalizeEmail()

### Community 33 - "listAdmins"
Cohesion: 0.67
Nodes (3): adminScope(), adminView(), listAdmins()

### Community 36 - "initializeDatabase"
Cohesion: 0.29
Nodes (9): Context, Decisions, Design, Goals / Non-Goals, Risks / Trade-offs, Impact, auth(), initializeDatabase() (+1 more)

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

### Community 51 - "WebampPlayer.jsx"
Cohesion: 0.28
Nodes (8): webamp, planSharedPlaylistSync(), selectedSharedTracksForRemoval(), toWebampTrack(), WebampPlayer(), inertAnalyser, videoIdFromUrl(), youtubeTrackUrl()

### Community 52 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Modified Capabilities, New Capabilities, Non-goals, Proposal, What Changes, Why

### Community 53 - "presenceGrace.test.js"
Cohesion: 0.38
Nodes (5): createPresenceGrace(), assert, { createPresenceGrace }, harness(), { test }

### Community 54 - "Design"
Cohesion: 0.25
Nodes (7): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Open Questions, Risks / Trade-offs

### Community 55 - "microsoftAuth.js"
Cohesion: 0.50
Nodes (4): @azure/msal-browser, initializeMsal(), msalInstance, signInWithMicrosoft()

## Knowledge Gaps
- **24 isolated node(s):** `@ruffle-rs/ruffle`, `colorthief`, `cors`, `crypto-js`, `dotenv` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 471 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `ADDED Requirements`, `music.integration.test.js`, `ctOctober.test.js`, `initializeDatabase`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **What connects `@ruffle-rs/ruffle`, `colorthief`, `cors` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HomePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07222982216142271 - nodes in this community are weakly interconnected._
- **Why does `react` connect `HomePage.jsx` to `discordAuth.js`, `package.json`, `api.js`, `AdminPage.jsx`, `FotologPage.jsx`, `WebampPlayer.jsx`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Why does `formatName()` connect `HomePage.jsx` to `api.js`, `AdminPage.jsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `YouTubeMediaAdapter` be split into smaller, more focused modules?**
  _Cohesion score 0.11578947368421053 - nodes in this community are weakly interconnected._