# Spec Delta

## Purpose

Defines how the Windows 98 Web Edition is exposed under the `/win98-web/` path of the main MSN domain, how it coexists with the existing MSN routes, and how failures of either side are contained.

## ADDED Requirements

### Requirement: Win98 is reachable under /win98-web/ on the main domain
The public nginx SHALL forward every request under `/win98-web/` to the `win98` service with the request URI unchanged.

#### Scenario: Main page through the proxy
- **GIVEN** the `web` and `win98` services are running
- **WHEN** a client requests `GET /win98-web/` on the main domain
- **THEN** the response is `200` with the Windows 98 `index.html`

#### Scenario: Assets and query strings are preserved
- **GIVEN** the `web` and `win98` services are running
- **WHEN** a client requests `GET /win98-web/assets/<bundle>.js?v=1`
- **THEN** the response is `200` with that file and the upstream is asked for the same path and query string

#### Scenario: Missing file
- **GIVEN** the `web` and `win98` services are running
- **WHEN** a client requests `GET /win98-web/images/does-not-exist.png`
- **THEN** the response is `404` with the Windows 98 Blue Screen page, not the MSN `index.html`

### Requirement: /win98 is the public entry point
The public nginx SHALL redirect `/win98` and `/win98/` to `/win98-web/` with a temporary (`302`) redirect and a relative `Location` header that contains no scheme, host or port.

#### Scenario: Short URL
- **GIVEN** the `web` service is running behind a TLS-terminating proxy
- **WHEN** a client requests `GET /win98`
- **THEN** the response is a `302` with `Location: /win98-web/`

#### Scenario: Short URL with trailing slash
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /win98/`
- **THEN** the response is a `302` with `Location: /win98-web/`

### Requirement: Sub-paths and queries survive the short URL
The public nginx SHALL redirect `/win98/<path>` to `/win98-web/<path>`, preserving the query string, so profile links such as `/win98/resume` work.

#### Scenario: Profile link
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /win98/resume?x=1`
- **THEN** the response is a `302` with `Location: /win98-web/resume?x=1`

### Requirement: Canonical path gets its trailing slash
The public nginx MUST redirect `/win98-web` to `/win98-web/` with a permanent (`301`) redirect and a relative `Location` header.

#### Scenario: Missing trailing slash
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /win98-web`
- **THEN** the response is a `301` with `Location: /win98-web/`

### Requirement: Existing MSN routes are unchanged
Adding the Win98 routes SHALL NOT change the behavior of the existing MSN frontend routes, REST prefixes, `/fotolog` routes, `/ws` WebSocket, `/health` and static caching rules.

#### Scenario: Frontend and SPA fallback
- **GIVEN** the `web` and `api` services are running
- **WHEN** a client requests `GET /` and `GET /chat/123`
- **THEN** both respond `200` with the MSN `index.html`

#### Scenario: API and health proxying
- **GIVEN** the `web` and `api` services are running
- **WHEN** a client requests `GET /health`
- **THEN** the request is proxied to `api` and returns `200`

#### Scenario: Win98 does not capture MSN prefixes
- **GIVEN** the `web` service is running
- **WHEN** a client requests a path that merely starts with `win98` but is not `/win98`, `/win98/...` or under `/win98-web/` (for example `/win98x`)
- **THEN** the request is handled by the MSN SPA fallback

### Requirement: Win98 availability does not affect MSN
The `web` service MUST start and serve MSN routes whether or not the `win98` service is running or healthy, and it SHALL NOT declare a startup dependency on `win98`.

#### Scenario: Win98 stopped
- **GIVEN** the `win98` service is stopped
- **WHEN** a client requests `GET /win98-web/`, then `GET /` and `GET /health`
- **THEN** the first request returns `502` and the other two still return `200`

#### Scenario: Web starts without win98
- **GIVEN** the `win98` service has never been started
- **WHEN** the `web` service is started
- **THEN** nginx starts successfully and serves MSN routes

### Requirement: Win98 recovers without restarting web
The public nginx SHALL pick up a restarted or recreated `win98` container without a reload or restart of `web`.

#### Scenario: Win98 redeployed
- **GIVEN** `win98` was stopped and `GET /win98-web/` returned `502`
- **WHEN** the `win98` service is started again (possibly with a new container IP)
- **THEN** within 30 seconds `GET /win98-web/` returns `200` without any action on `web`

### Requirement: Upstream headers and ranges pass through
The proxy SHALL pass through the `win98` response headers that control caching and encoding (`Cache-Control`, `Content-Encoding`, `ETag`) and SHALL support `Range` requests for media files.

#### Scenario: Cache and compression
- **GIVEN** the `web` and `win98` services are running
- **WHEN** a client requests `GET /win98-web/sw.js` and a JavaScript file under `/win98-web/assets/` with `Accept-Encoding: gzip`
- **THEN** `sw.js` has `Cache-Control: no-cache` and the asset has `Content-Encoding: gzip` and `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: Range request on media
- **GIVEN** the `web` and `win98` services are running
- **WHEN** a client requests an audio file under `/win98-web/songs/` with `Range: bytes=0-99`
- **THEN** the response is `206` with 100 bytes

### Requirement: Win98 is only reachable through the proxy
The `win98` service MUST NOT publish a host port. The only public entry to it SHALL be the `web` nginx on port 80.

#### Scenario: No direct exposure
- **GIVEN** the compose stack is running
- **WHEN** the published ports of the stack are listed
- **THEN** only `web` publishes `80` and `win98` publishes none
