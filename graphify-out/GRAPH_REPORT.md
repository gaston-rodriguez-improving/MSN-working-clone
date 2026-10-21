# Graph Report - MSN-working-clone  (2026-10-21)

## Corpus Check
- 103 files · ~221,682 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: .swf 15, (none) 9, .log 4)

## Summary
- 618 nodes · 1201 edges · 47 communities (33 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `49992b58`
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
- WinampPage.jsx
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
- ref_node_test
- fotolog.integration.test.js
- removeExpiredActivities
- ref_node_assert
- presenceGrace.test.js
- getUser
- broadcast
- MilkDrop window skin QA
- microsoftAuth.js
- local-db.sh
- isAdminRequest
- listAdmins
- vercel.json
- verifyAzureAdIdToken
- initializeDatabase
- presenceSweep

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
- `ListeningStatus()` --indirect_call--> `stripHtml()`  [INFERRED]
  src/components/ListeningStatus.jsx → src/helpers/stripHtml.js
- `fotologName()` --calls--> `emailNameFromAddress()`  [EXTRACTED]
  server/fotolog.js → server/accountName.js
- `initializeDatabase()` --calls--> `ensureFotologUrl()`  [EXTRACTED]
  server/server.js → server/fotologUrls.js
- `LoginPage()` --calls--> `AvatarLarge()`  [EXTRACTED]
  src/pages/LoginPage.jsx → src/components/AvatarLarge.jsx
- `LoginPage()` --calls--> `Background()`  [EXTRACTED]
  src/pages/LoginPage.jsx → src/components/Background.jsx

## Import Cycles
- None detected.

## Communities (47 total, 14 thin omitted)

### Community 0 - "HomePage.jsx"
Cohesion: 0.06
Nodes (57): 7.css, react, AddFriendModal(), AvatarLarge(), AvatarSmall(), Background(), CategoryModal(), ChangeDisplayPictureModal() (+49 more)

### Community 1 - "main.jsx"
Cohesion: 0.10
Nodes (31): react-router-dom, apps, AppShortcuts(), OptionsModal(), PrivateRoute(), UpdateBanner(), AuthProvider(), login() (+23 more)

### Community 2 - "server.js"
Cohesion: 0.05
Nodes (24): { accountNameFromClaims }, adminEmails, app, bcrypt, config, cors, crypto, db (+16 more)

### Community 3 - "YouTubeMediaAdapter"
Cohesion: 0.09
Nodes (9): webamp, planSharedPlaylistSync(), selectedSharedTracksForRemoval(), toWebampTrack(), WebampPlayer(), inertAnalyser, videoIdFromUrl(), YouTubeMediaAdapter (+1 more)

### Community 4 - "/graphify"
Cohesion: 0.06
Nodes (32): For always-on context in Devin sessions, For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For --update (incremental re-extraction) (+24 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (26): cors, dotenv, express, jose, name, private, type, version (+18 more)

### Community 6 - "api.js"
Cohesion: 0.19
Nodes (20): ChatProvider(), toContact(), useToast(), getChatMessages(), getFriendRequests(), getFriends(), getListeningActivities(), getListeningPreference() (+12 more)

### Community 7 - "AdminPage.jsx"
Cohesion: 0.18
Nodes (23): addAdmin(), getAdminMetrics(), getAdmins(), removeAdmin(), adminCopy(), adminLocale(), english, stripHtml() (+15 more)

### Community 8 - "server/package.json"
Cohesion: 0.08
Nodes (23): bcryptjs, ws, dependencies, bcryptjs, cors, dotenv, express, jose (+15 more)

### Community 9 - "WinampPage.jsx"
Cohesion: 0.16
Nodes (15): addMusicTrack(), createMusicFolder(), getMusicFolders(), getMusicTrack(), getMusicTracks(), removeMusicTrack(), AddTrackDialog(), NewFolderDialog() (+7 more)

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
Cohesion: 0.17
Nodes (7): jsonwebtoken, assert, jwt, { Pool }, { randomUUID }, test, { WebSocket }

### Community 18 - "fotolog.js"
Cohesion: 0.27
Nodes (8): accountNameFromClaims(), emailNameFromAddress(), { accountNameFromClaims, emailNameFromAddress }, assert, test, { emailNameFromAddress }, { ensureFotologUrl }, fotologName()

### Community 19 - "vite.config.js"
Cohesion: 0.20
Nodes (4): vite, @vitejs/plugin-react, buildId, root

### Community 20 - "adminMetrics.test.js"
Cohesion: 0.22
Nodes (7): pg, nudgeLeaders(), assert, { nudgeLeaders }, { Pool }, { randomUUID }, test

### Community 21 - "[Windows Live Messenger](https://wlm.vercel.app/)"
Cohesion: 0.22
Nodes (8): About, Acknowledgments, Available Features, Contribute and Share Feedback, Fotolog, How to Use, Planned Features, [Windows Live Messenger](https://wlm.vercel.app/)

### Community 22 - "ref_node_test"
Cohesion: 0.28
Nodes (6): ensureFotologUrl(), reserved, slugBase(), assert, { slugBase }, test

### Community 23 - "fotolog.integration.test.js"
Cohesion: 0.22
Nodes (8): color(), image(), assert, { image, color }, jwt, { Pool }, { randomUUID }, test

### Community 24 - "removeExpiredActivities"
Cohesion: 0.32
Nodes (8): activityView(), expirySweep, listeningEnvelope(), listListening(), pushListeningSnapshot(), removeExpiredActivities(), sendListening(), updateListening()

### Community 25 - "ref_node_assert"
Cohesion: 0.33
Nodes (4): parseYouTubeVideoId(), assert, { parseYouTubeVideoId }, test

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

### Community 30 - "microsoftAuth.js"
Cohesion: 0.50
Nodes (4): @azure/msal-browser, initializeMsal(), msalInstance, signInWithMicrosoft()

### Community 32 - "isAdminRequest"
Cohesion: 0.67
Nodes (3): adminAuth, isAdminRequest(), normalizeEmail()

### Community 33 - "listAdmins"
Cohesion: 0.67
Nodes (3): adminScope(), adminView(), listAdmins()

## Knowledge Gaps
- **24 isolated node(s):** `@ruffle-rs/ruffle`, `colorthief`, `cors`, `crypto-js`, `dotenv` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 289 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `HomePage.jsx` to `main.jsx`, `YouTubeMediaAdapter`, `package.json`, `api.js`, `AdminPage.jsx`, `WinampPage.jsx`, `discordAuth.js`, `FotologPage.jsx`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **What connects `@ruffle-rs/ruffle`, `colorthief`, `cors` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HomePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06474490963166324 - nodes in this community are weakly interconnected._
- **Why does `formatName()` connect `HomePage.jsx` to `main.jsx`, `AdminPage.jsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0975609756097561 - nodes in this community are weakly interconnected._
- **Why does `pg` connect `adminMetrics.test.js` to `server/package.json`, `music.integration.test.js`, `server.js`, `fotolog.integration.test.js`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._