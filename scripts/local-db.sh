#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if ! command -v pg_ctl >/dev/null 2>&1; then
  for pg_version in 18 17 16 15; do
    pg_bin="/opt/homebrew/opt/postgresql@${pg_version}/bin"
    if [[ -x "$pg_bin/pg_ctl" ]]; then export PATH="$pg_bin:$PATH"; break; fi
  done
fi
if ! command -v pg_ctl >/dev/null 2>&1; then
  echo 'PostgreSQL is required. On macOS: brew install postgresql@15' >&2
  exit 1
fi

db_dir="$PWD/.local-dev/postgres"
db_port=55439
db_user=msn_local
db_name=msn_local

start_database() {
  mkdir -p "$PWD/.local-dev"
  if [[ ! -f "$db_dir/PG_VERSION" ]]; then
    initdb -D "$db_dir" -A trust -U "$db_user" > "$PWD/.local-dev/initdb.log"
  fi
  if ! pg_ctl -D "$db_dir" status >/dev/null 2>&1; then
    pg_ctl -D "$db_dir" -l "$PWD/.local-dev/postgres.log" -o "-h 127.0.0.1 -p $db_port" start
  fi
  if [[ "$(psql -h 127.0.0.1 -p "$db_port" -U "$db_user" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'msn_local'")" != 1 ]]; then
    createdb -h 127.0.0.1 -p "$db_port" -U "$db_user" "$db_name"
  fi
  echo "Local PostgreSQL ready: 127.0.0.1:$db_port / $db_name"
}

case "${1:-start}" in
  start) start_database ;;
  stop)
    if [[ -f "$db_dir/PG_VERSION" ]] && pg_ctl -D "$db_dir" status >/dev/null 2>&1; then
      pg_ctl -D "$db_dir" -m fast stop
    else
      echo 'Local PostgreSQL is already stopped.'
    fi
    ;;
  server)
    start_database
    exec env DATABASE_HOST=127.0.0.1 DATABASE_PORT="$db_port" DATABASE_NAME="$db_name" \
      DATABASE_USER="$db_user" DATABASE_PASSWORD=local-only DATABASE_SSL=false \
      COMPANY_ID=local-company EVENT_ID=local-retro JWT_SECRET=local-development-only \
      ALLOWED_EMAIL_DOMAINS=local.test CORS_ORIGIN=http://localhost:5179 PORT=3309 \
      node server/server.js
    ;;
  *) echo 'Usage: local-db.sh start|stop|server' >&2; exit 1 ;;
esac
