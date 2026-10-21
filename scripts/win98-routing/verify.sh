#!/usr/bin/env bash
# Verifies the win98-web routing behind the MSN nginx against specs/win98-hosting/spec.md.
# Usage: scripts/win98-routing/verify.sh <base-url>   e.g. http://localhost:8081
# Set VERIFY_ISOLATION=1 to also stop/start the win98 service and check port exposure.
# Exits non-zero on the first failed assertion.

set -euo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi
BASE="${BASE%/}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "${SCRIPT_DIR}/docker-compose.verify.yml")

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

pass() {
  echo "ok: $1"
}

# status_of <path> [extra curl args...] -> HTTP status on stdout
status_of() {
  local path="$1"
  shift
  curl -sS -o /dev/null -w '%{http_code}' "$@" "${BASE}${path}"
}

# headers_of <path> [extra curl args...] -> headers on stdout
headers_of() {
  local path="$1"
  shift
  curl -sSI "$@" "${BASE}${path}"
}

body_of() {
  local path="$1"
  shift
  curl -sS "$@" "${BASE}${path}"
}

header_value() { # header_value <headers> <name>; prints empty string if absent
  printf '%s' "$1" | tr -d '\r' | { grep -i "^$2:" || true; } | head -1 | cut -d: -f2- | sed 's/^ *//;s/ *$//'
}

redirect_check() { # redirect_check <path> <expected-status> <expected-location>
  local path="$1" want_code="$2" want_loc="$3"
  local code loc
  code="$(status_of "$path")"
  [ "$code" = "$want_code" ] || fail "GET ${path} returned ${code}, expected ${want_code}"
  loc="$(header_value "$(headers_of "$path")" Location)"
  [ "$loc" = "$want_loc" ] || fail "GET ${path} Location is '${loc}', expected exactly ${want_loc}"
  # Same check behind a TLS-terminating proxy Host header: Location must stay relative.
  loc="$(header_value "$(headers_of "$path" -H 'Host: example.com:8443')" Location)"
  [ "$loc" = "$want_loc" ] || fail "GET ${path} with proxy Host header returned Location '${loc}', expected exactly ${want_loc}"
}

WIN98_TITLE='Windows 98 Web Edition'
MSN_TITLE='Windows Live Messenger'
BSOD_TITLE='Windows 98 - Not Found'

echo "Verifying win98 routing at ${BASE}"

# --- MSN routes unchanged ---------------------------------------------------

for p in / /chat/123 /win98x; do
  [ "$(status_of "$p")" = "200" ] || fail "GET ${p} did not return 200"
  body_of "$p" | grep -q "$MSN_TITLE" || fail "GET ${p} did not serve the MSN index.html"
done
pass "GET /, /chat/123, /win98x -> 200 MSN index (SPA fallback)"

[ "$(status_of /health)" = "200" ] || fail "GET /health did not return 200"
pass "GET /health -> 200 (proxied to api)"

# --- Redirects ----------------------------------------------------------------

redirect_check /win98 302 '/win98-web/'
redirect_check /win98/ 302 '/win98-web/'
redirect_check '/win98/resume?x=1' 302 '/win98-web/resume?x=1'
redirect_check /win98-web 301 '/win98-web/'
pass "redirects: /win98, /win98/ -> 302; /win98/resume?x=1 keeps path+query; /win98-web -> 301; all Locations relative"

# --- Win98 content through the proxy -----------------------------------------

[ "$(status_of /win98-web/)" = "200" ] || fail "GET /win98-web/ did not return 200"
index_body="$(body_of /win98-web/)"
printf '%s' "$index_body" | grep -q "$WIN98_TITLE" || fail "GET /win98-web/ did not return the win98 index.html"
pass "GET /win98-web/ -> 200 win98 index.html"

asset_js="$(printf '%s' "$index_body" | grep -o 'assets/[^"'"'"']*\.js' | head -1)"
[ -n "$asset_js" ] || fail "could not find an assets/*.js reference in the win98 index.html"
[ "$(status_of "/win98-web/${asset_js}?v=1")" = "200" ] || fail "GET /win98-web/${asset_js}?v=1 did not return 200"
pass "GET /win98-web/${asset_js}?v=1 -> 200 (query string preserved)"

[ "$(status_of /win98-web/images/does-not-exist.png)" = "404" ] || fail "GET /win98-web/images/does-not-exist.png did not return 404"
bsod_body="$(body_of /win98-web/images/does-not-exist.png)"
printf '%s' "$bsod_body" | grep -q "$BSOD_TITLE" || fail "GET /win98-web/images/does-not-exist.png did not return the BSOD 404.html body"
printf '%s' "$bsod_body" | grep -q "$MSN_TITLE" && fail "GET /win98-web/images/does-not-exist.png served the MSN index.html"
pass "GET /win98-web/images/does-not-exist.png -> 404 with BSOD body (not MSN index)"

# --- Headers pass through -----------------------------------------------------

cc="$(header_value "$(headers_of /win98-web/sw.js)" Cache-Control)"
[ "$cc" = "no-cache" ] || fail "GET /win98-web/sw.js Cache-Control is '${cc}', expected no-cache"
pass "GET /win98-web/sw.js -> Cache-Control: no-cache"

asset_headers="$(headers_of "/win98-web/${asset_js}" -H 'Accept-Encoding: gzip')"
cc="$(header_value "$asset_headers" Cache-Control)"
[ "$cc" = "public, max-age=31536000, immutable" ] || fail "GET /win98-web/${asset_js} Cache-Control is '${cc}'"
ce="$(header_value "$asset_headers" Content-Encoding)"
[ "$ce" = "gzip" ] || fail "GET /win98-web/${asset_js} with Accept-Encoding: gzip has Content-Encoding '${ce}'"
pass "/win98-web/${asset_js} -> immutable + Content-Encoding: gzip"

# --- Range request on media ---------------------------------------------------

song_path="$("${COMPOSE[@]}" exec -T win98 sh -c 'ls /usr/share/nginx/html/win98-web/songs/*/*.ogg 2>/dev/null | head -1' 2>/dev/null | tr -d '\r' || true)"
if [ -n "$song_path" ]; then
  song_uri="$(printf '%s' "$song_path" | sed 's|/usr/share/nginx/html||' | sed 's/ /%20/g')"
else
  song_uri='/win98-web/songs/anosci%20-%20Blank%20VHS%20Tape%20Jingle%20Collection/anosci%20-%20Blank%20VHS%20Tape%20Jingle%20Collection%20-%2003%20gentle%20envelopment.ogg'
fi
range_headers="$(curl -sSI -H 'Range: bytes=0-99' "${BASE}${song_uri}")"
[ "$(printf '%s' "$range_headers" | head -1 | tr -d '\r' | awk '{print $2}')" = "206" ] || fail "Range GET ${song_uri} did not return 206"
range_body_len="$(curl -sS -H 'Range: bytes=0-99' "${BASE}${song_uri}" | wc -c | tr -d ' ')"
[ "$range_body_len" = "100" ] || fail "Range GET ${song_uri} returned ${range_body_len} bytes, expected 100"
pass "Range bytes=0-99 ${song_uri} -> 206 with 100 bytes"

# --- Isolation (opt-in) --------------------------------------------------------

if [ "${VERIFY_ISOLATION:-0}" = "1" ]; then
  echo "VERIFY_ISOLATION=1: stopping win98"

  # Only web may publish a host port. `compose port` prints e.g. "0.0.0.0:8081"
  # for a published port and an empty/"invalid IP:0" mapping for an unpublished one.
  win98_port="$("${COMPOSE[@]}" port win98 80 2>/dev/null | tr -d '\r' || true)"
  printf '%s' "$win98_port" | grep -q ':[1-9][0-9]*$' && fail "win98 publishes a host port (${win98_port}); it must only be reachable through web"
  web_port="$("${COMPOSE[@]}" port web 80 2>/dev/null | tr -d '\r' || true)"
  printf '%s' "$web_port" | grep -q ':[1-9][0-9]*$' || fail "web does not publish port 80"
  pass "port exposure: only web publishes port 80 (${web_port}), win98 publishes none"

  "${COMPOSE[@]}" stop win98 >/dev/null
  # The nginx resolver may serve the stale IP until the DNS TTL (valid=10s)
  # expires, briefly returning 504; poll until it reports 502.
  down_code=""
  for _ in $(seq 1 15); do
    down_code="$(status_of /win98-web/)"
    [ "$down_code" = "502" ] && break
    sleep 1
  done
  [ "$down_code" = "502" ] || fail "with win98 stopped, GET /win98-web/ returned ${down_code}, expected 502"
  [ "$(status_of /)" = "200" ] || fail "with win98 stopped, GET / did not return 200"
  [ "$(status_of /health)" = "200" ] || fail "with win98 stopped, GET /health did not return 200"
  pass "win98 stopped -> /win98-web/ 502, / and /health still 200"

  "${COMPOSE[@]}" start win98 >/dev/null
  recovered=""
  for _ in $(seq 1 30); do
    if [ "$(status_of /win98-web/)" = "200" ]; then
      recovered=1
      break
    fi
    sleep 1
  done
  [ -n "$recovered" ] || fail "/win98-web/ did not return 200 within 30s of restarting win98"
  pass "win98 restarted -> /win98-web/ 200 within 30s (no action on web)"
else
  echo "VERIFY_ISOLATION not set: skipping win98 stop/start and port-exposure checks"
fi

echo "All win98 routing checks passed."
