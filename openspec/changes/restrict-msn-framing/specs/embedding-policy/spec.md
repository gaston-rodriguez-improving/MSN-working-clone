# Spec Delta

## Purpose

Defines which origins may embed MSN pages in a frame, so the Win98 desktop on the same origin can frame MSN while other websites cannot.

## ADDED Requirements

### Requirement: MSN pages allow framing only by the same origin
Every response that serves the MSN frontend HTML SHALL carry `Content-Security-Policy: frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`.

#### Scenario: Home and SPA routes
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /`, `GET /chat/123`, `GET /fotolog/leni` and `GET /winamp`
- **THEN** each response is `200` with both headers

#### Scenario: Admin page
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /admin` and `GET /admin/`
- **THEN** each response carries both headers

#### Scenario: Static HTML entry points
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /index.html` and `GET /redirect.html`
- **THEN** each response carries both headers

### Requirement: Same-origin framing keeps working
A page served from the same origin as MSN SHALL be able to display MSN in a frame, including the Microsoft sign-in flow.

#### Scenario: Win98 window frames MSN
- **GIVEN** the Win98 desktop is served from `/win98-web/` on the MSN origin
- **WHEN** the user opens the MSN Messenger window
- **THEN** the frame displays the MSN page and is not blocked by the browser

#### Scenario: Microsoft sign-in
- **GIVEN** the MSN login page is shown, at top level or inside the Win98 window
- **WHEN** the user completes "Sign In with Microsoft"
- **THEN** the sign-in popup returns to `redirect.html` and MSN shows the signed-in view

### Requirement: Other origins cannot frame MSN
A page served from a different origin SHALL NOT be able to display MSN pages in a frame.

#### Scenario: Cross-origin embed attempt
- **GIVEN** a test page served from `http://localhost:9000` that contains an iframe with `src` set to the MSN origin
- **WHEN** the browser loads the test page
- **THEN** the browser refuses to render MSN in the frame and logs a framing-policy violation

### Requirement: Policy does not leak onto other responses
The framing headers SHALL be set only on MSN frontend HTML responses. Proxied Win98 responses, API responses and static assets MUST keep their existing headers.

#### Scenario: Win98 responses unchanged
- **GIVEN** the `web` and `win98` services are running
- **WHEN** a client requests `GET /win98-web/`
- **THEN** the response carries no `Content-Security-Policy` or `X-Frame-Options` header added by the MSN nginx

#### Scenario: Existing cache headers intact
- **GIVEN** the `web` service is running
- **WHEN** a client requests `GET /`, a file under `/assets/`, and `GET /version.json`
- **THEN** they keep `Cache-Control: no-cache`, `public, max-age=31536000, immutable` and `no-store` respectively

#### Scenario: API unchanged
- **GIVEN** the `web` and `api` services are running
- **WHEN** a client requests `GET /health`
- **THEN** the response is `200` as before
